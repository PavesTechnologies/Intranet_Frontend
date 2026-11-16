import React, { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Inbox, Layers, ShieldAlert, XCircle } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { showStatusToast } from "@/components/toastfy/toast";
import {
  useMyQueue,
  useReviewLineItem,
  useReviewSplit,
  useRejectReport,
  useBulkApprove,
} from "../hooks/useApprovalWorkflow";
import { useApprovalLiveSync } from "../hooks/useApprovalLiveSync";
import { formatMoney } from "../constants/approvalLabels";
import { resolveQueueItem } from "../utils/approvalAmounts";
import EmployeeLabel from "../components/EmployeeLabel";
import LineItemReviewPanel from "../components/LineItemReviewPanel";
import CommentPromptModal from "../components/CommentPromptModal";
import MyDelegateCard from "../components/MyDelegateCard";
import ExpenseReviewPanel from "../components/ExpenseReviewPanel";

const hasPolicyIssue = (relevantLines) =>
  (relevantLines || []).some((l) => (l.source?.policyViolations?.length || 0) > 0);

const merchantSummary = (relevantLines) => {
  if (!relevantLines?.length) return "—";
  const first = relevantLines[0]?.source?.merchantName || relevantLines[0]?.source?.categoryName || "Line item";
  return relevantLines.length > 1 ? `${first} +${relevantLines.length - 1} more` : first;
};

/**
 * The approver's queue - every report where the caller (or their active delegate) currently has an
 * ACTIVE assignment (GET /xms/approvals/my-queue, server-side paginated). This is the ONLY network
 * call this page makes for its content: ApprovalQueueItemResponse already carries everything a row
 * needs (pendingLineItems, pendingSplits, eligibleForBulkApprove, costCenterName, reportStatus) -
 * resolveQueueItem (utils/approvalAmounts.js) derives the caller-relevant amount/line list from
 * that data alone, replacing what used to be two extra per-row API calls
 * (lineItemService.getAll + getLineItemReviews) that only reconstructed what the queue endpoint
 * already returned.
 */
export default function PendingApprovalsPage({ searchTerm = "", hideHeader = false, noPadding = false }) {
  const [page, setPage] = useState(0);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [rejectingReport, setRejectingReport] = useState(null);
  const [reviewingItem, setReviewingItem] = useState(null);

  useApprovalLiveSync();

  const { data, isLoading, isError, refetch } = useMyQueue(page, 20);
  const reviewLineItem = useReviewLineItem();
  const reviewSplit = useReviewSplit();
  const rejectReport = useRejectReport();
  const bulkApprove = useBulkApprove();

  const items = data?.content || [];

  const resolvedItems = useMemo(
    () =>
      items.map((item) => {
        const resolved = resolveQueueItem(item);
        return { ...item, ...resolved };
      }),
    [items]
  );

  const filteredItems = useMemo(() => {
    const filtered = resolvedItems.filter((item) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      const reportNum = (item.reportNumber || "").toLowerCase();
      const merchant = merchantSummary(item.relevantLines).toLowerCase();
      return reportNum.includes(q) || merchant.includes(q);
    });

    return filtered.sort((a, b) => {
      const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [resolvedItems, searchTerm]);

  const isMutating = reviewLineItem.isPending || reviewSplit.isPending || rejectReport.isPending || bulkApprove.isPending;

  // A split-owned line fans out to one reviewSplit call per cost-center split the caller owns on
  // it (almost always exactly one); a normal-track line is a single reviewLineItem call.
  const approveLine = (reportId, relevantLine) => {
    if (relevantLine.isSplit) {
      return Promise.all(
        relevantLine.mySplits.map((s) => reviewSplit.mutateAsync({ reportId, splitId: s.splitId, decision: "APPROVED" }))
      );
    }
    return reviewLineItem.mutateAsync({ reportId, lineItemId: relevantLine.lineItemId, decision: "APPROVED" });
  };

  const flagLine = (reportId, relevantLine, comment) => {
    if (relevantLine.isSplit) {
      return Promise.all(
        relevantLine.mySplits.map((s) =>
          reviewSplit.mutateAsync({ reportId, splitId: s.splitId, decision: "NEEDS_CORRECTION", comment })
        )
      );
    }
    return reviewLineItem.mutateAsync({ reportId, lineItemId: relevantLine.lineItemId, decision: "NEEDS_CORRECTION", comment });
  };

  const handleApproveLine = (reportId, relevantLine) => {
    approveLine(reportId, relevantLine).catch((err) =>
      showStatusToast(err.response?.data?.message || "Failed to approve", "error")
    );
  };

  const handleFlagLine = (reportId, relevantLine, comment) => {
    flagLine(reportId, relevantLine, comment)
      .then(() => showStatusToast("Flagged for correction", "success"))
      .catch((err) => showStatusToast(err.response?.data?.message || "Failed to flag for correction", "error"));
  };

  const handleBulkApprove = (reportId) => {
    bulkApprove.mutate(reportId, {
      onSuccess: () => showStatusToast("Report approved", "success"),
      onError: (err) => showStatusToast(err.response?.data?.message || "Approve failed", "error"),
    });
  };

  const renderActions = (item) => {
    const flagged = hasPolicyIssue(item.relevantLines);
    return (
      <div className="inline-flex flex-wrap items-center justify-end gap-2">
        <Button size="small" variant="outline" disabled={isMutating} onClick={() => setReviewingItem(item)}>
          Review
        </Button>
        <Button
          size="small"
          variant="success"
          disabled={isMutating || !item.eligibleForBulkApprove}
          title={!item.eligibleForBulkApprove ? "Has open policy violations — review and act line-by-line instead." : undefined}
          onClick={() => handleBulkApprove(item.reportId)}
        >
          Approve
        </Button>
        <Button size="small" variant="outline" disabled={isMutating} onClick={() => setRejectingReport(item)}>
          <XCircle className="h-3.5 w-3.5" /> Reject
        </Button>
        {flagged && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
            <ShieldAlert className="h-3 w-3" /> Not eligible for one-click Approve
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={noPadding ? "" : "p-4 sm:p-6"}>
      {!hideHeader && (
        <>
          <Breadcrumb
            items={[
              { label: "Expense Management", to: "/expense-management/dashboard" },
              { label: "Approvals" },
              { label: "Pending" },
            ]}
          />
          <h1 className="text-xl font-semibold text-gray-900 mt-3 mb-4">Pending Approvals</h1>
        </>
      )}

      <MyDelegateCard />

      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
          <LoadingSpinner text="Loading your queue…" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-10 text-center">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          <p className="text-sm text-rose-700">Failed to load your queue.</p>
          <Button size="small" variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white py-16 text-center">
          <Inbox className="h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">No pending approvals.</p>
          <p className="text-xs text-gray-400">Reports assigned to you for approval will show up here.</p>
        </div>
      )}

      {!isLoading && !isError && items.length > 0 && filteredItems.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white py-16 text-center">
          <Inbox className="h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">No pending approvals match your search.</p>
        </div>
      )}

      {filteredItems.length > 0 && (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-blue-900 to-indigo-900 text-left text-xs font-semibold text-white uppercase">
                  <tr>
                    <th className="w-8 px-2.5 py-2" />
                    <th className="px-2.5 py-2">Report</th>
                    <th className="px-2.5 py-2">Employee</th>
                    <th className="px-2.5 py-2">Merchant / Category</th>
                    <th className="px-2.5 py-2">Level</th>
                    <th className="px-2.5 py-2">Expenses</th>
                    <th className="px-2.5 py-2">Policy</th>
                    <th className="px-2.5 py-2">Amount for My Approval</th>
                    <th className="px-2.5 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.map((item, index) => {
                    const isExpanded = expandedReportId === item.reportId;
                    const flagged = hasPolicyIssue(item.relevantLines);
                    const needsCorrection = item.reportStatus === "AWAITING_CORRECTION";
                    return (
                      <React.Fragment key={item.reportId}>
                        <tr
                          className={`transition cursor-pointer ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}
                          onClick={() => setExpandedReportId(isExpanded ? null : item.reportId)}
                        >
                          <td className="px-2.5 py-1.5 text-gray-400">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </td>
                          <td className="px-2.5 py-1.5">
                            <span className="font-mono text-[11px] font-semibold text-gray-700">{item.reportNumber}</span>
                            {needsCorrection && (
                              <span className="ml-1.5 inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800">
                                Awaiting employee
                              </span>
                            )}
                          </td>
                          <td className="px-2.5 py-1.5">
                            <span className="font-medium text-xs text-gray-900">
                              <EmployeeLabel employeeId={item.employeeId} />
                            </span>
                          </td>
                          <td className="px-2.5 py-1.5 text-gray-600 max-w-[220px] truncate text-xs">{merchantSummary(item.relevantLines)}</td>
                          <td className="px-2.5 py-1.5 text-gray-600 text-xs">
                            <span className="inline-flex items-center gap-1">
                              <Layers className="h-3.5 w-3.5" /> Level {item.levelOrder}
                            </span>
                          </td>
                          <td className="px-2.5 py-1.5 text-gray-600 text-xs">
                            {item.relevantLines.length}
                            {item.splitCount > 0 && (
                              <span className="ml-1.5 inline-flex items-center rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                                {item.splitCount} split
                              </span>
                            )}
                          </td>
                          <td className="px-2.5 py-1.5">
                            {flagged ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                <ShieldAlert className="h-3 w-3" /> Warning
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                Clear
                              </span>
                            )}
                          </td>
                          <td className="px-2.5 py-1.5 whitespace-nowrap text-xs">
                            <span className="font-semibold text-gray-900">{formatMoney(item.relevantTotal, item.currencyCode)}</span>
                            {item.relevantTotal !== item.totalAmount && (
                              <span className="ml-1 text-gray-400">of {formatMoney(item.totalAmount, item.currencyCode)} report total</span>
                            )}
                          </td>
                          <td className="px-2.5 py-1.5 text-right text-xs" onClick={(e) => e.stopPropagation()}>
                            {renderActions(item)}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="bg-gray-50/60 p-0">
                              {flagged && (
                                <p className="flex items-center gap-1.5 text-xs text-amber-700 px-4 pt-3">
                                  <ShieldAlert className="h-3.5 w-3.5" /> Has open policy violations - not eligible for one-click Approve.
                                </p>
                              )}
                              <LineItemReviewPanel
                                reportId={item.reportId}
                                relevantLines={item.relevantLines}
                                isBusy={isMutating}
                                onApproveLine={(line) => handleApproveLine(item.reportId, line)}
                                onFlagLine={(line, comment) => handleFlagLine(item.reportId, line, comment)}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {filteredItems.map((item) => {
              const flagged = hasPolicyIssue(item.relevantLines);
              return (
                <div key={item.reportId} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{item.reportNumber}</p>
                      <p className="text-sm text-gray-500">
                        <EmployeeLabel employeeId={item.employeeId} />
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-gray-900">{formatMoney(item.relevantTotal, item.currencyCode)}</p>
                      {item.relevantTotal !== item.totalAmount && (
                        <p className="text-[11px] text-gray-400">of {formatMoney(item.totalAmount, item.currencyCode)} total</p>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 truncate text-sm text-gray-600">{merchantSummary(item.relevantLines)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                      <Layers className="h-3 w-3" /> Level {item.levelOrder}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{item.relevantLines.length} expense(s)</span>
                    {item.splitCount > 0 && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">{item.splitCount} split</span>
                    )}
                    {flagged && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                        <ShieldAlert className="h-3 w-3" /> Policy warning
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">{renderActions(item)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 mt-4 text-sm text-gray-600">
          <Button size="small" variant="outline" disabled={data.first} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span>
            Page {data.page + 1} of {data.totalPages}
          </span>
          <Button size="small" variant="outline" disabled={data.last} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <CommentPromptModal
        isOpen={!!rejectingReport}
        title={`Reject report ${rejectingReport?.reportNumber ?? ""}`}
        description="This is a terminal decision - the employee cannot resubmit this report. Use Needs Correction on individual lines instead if the report just needs a fix."
        confirmLabel="Reject Report"
        confirmVariant="danger"
        isLoading={rejectReport.isPending}
        onCancel={() => setRejectingReport(null)}
        onConfirm={(comment) => {
          rejectReport.mutate(
            { reportId: rejectingReport.reportId, comment },
            {
              onSuccess: () => {
                showStatusToast("Report rejected", "success");
                setRejectingReport(null);
              },
              onError: (err) => showStatusToast(err.response?.data?.message || "Failed to reject report", "error"),
            },
          );
        }}
      />

      <ExpenseReviewPanel
        isOpen={!!reviewingItem}
        onClose={() => setReviewingItem(null)}
        reportId={reviewingItem?.reportId}
        mode="queue"
        queueItem={reviewingItem}
      />
    </div>
  );
}
