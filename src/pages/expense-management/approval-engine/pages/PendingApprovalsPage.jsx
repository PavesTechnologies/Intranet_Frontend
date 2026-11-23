import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Eye, Inbox, Layers, ShieldAlert, XCircle } from "lucide-react";
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
  useApproveException,
} from "../hooks/useApprovalWorkflow";
import { useApprovalLiveSync } from "../hooks/useApprovalLiveSync";
import { formatMoney } from "../constants/approvalLabels";
import { resolveQueueItem } from "../utils/approvalAmounts";
import EmployeeLabel from "../components/EmployeeLabel";
import RowActionButton, { RowActions } from "../components/RowActionButton";
import LineItemReviewPanel from "../components/LineItemReviewPanel";
import CommentPromptModal from "../components/CommentPromptModal";
import MyDelegateCard from "../components/MyDelegateCard";
import ExpenseReviewPanel from "../components/ExpenseReviewPanel";
import { DEFAULT_PAGE_SIZE } from "@/pages/expense-management/components/common/pagination";
import Pagination from "@/components/Pagination/pagination";

// Embedded in the approvals table: the page owns paging, so this list fetches a full batch and shows the slice it is given.
const EMBEDDED_FETCH_SIZE = 100;

const hasPolicyIssue = (relevantLines) =>
  (relevantLines || []).some((l) => (l.source?.policyViolations?.length || 0) > 0);

const merchantSummary = (relevantLines) => {
  if (!relevantLines?.length) return "—";
  const first = relevantLines[0]?.source?.merchantName || relevantLines[0]?.source?.categoryName || "Line item";
  return relevantLines.length > 1 ? `${first} +${relevantLines.length - 1} more` : first;
};

/**
 * Expenses column for an expense-report approval row. Shows the report's total claimed amount (`totalAmount`), not a sum
 * of the line items below: `pendingLineItems` holds only the items awaiting this approver, so summing them understates
 * the claim. The pending-item count and the split count are kept as secondary text, because they are not shown elsewhere
 * in the row.
 */
export function ExpensesCell({ item }) {
  const pendingCount = Array.isArray(item.relevantLines) ? item.relevantLines.length : 0;
  return (
    <td className="px-2.5 py-1.5 text-gray-600 text-xs whitespace-nowrap">
      <span className="font-semibold text-gray-900">{formatMoney(item.totalAmount, item.currencyCode)}</span>
      <span className="block text-[11px] text-gray-400">
        {pendingCount} to review
        {item.splitCount > 0 && (
          <span className="ml-1.5 inline-flex items-center rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
            {item.splitCount} split
          </span>
        )}
      </span>
    </td>
  );
}

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
// Days since the request was submitted; a request is treated as overdue after three days.
const waitingDays = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : Math.floor((Date.now() - time) / 86400000);
};

const submittedLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// Which group a row belongs to, for the status filter.
const statusGroup = (item) => {
  if (item.reportStatus === "AWAITING_CORRECTION") return "AWAITING";
  if (hasPolicyIssue(item.relevantLines)) return "FLAGGED";
  return "PENDING";
};

export default function PendingApprovalsPage({
  searchTerm = "",
  statusFilter = "ALL",
  sortBy = "NEWEST",
  hideHeader = false,
  noPadding = false,
  embedded = false,
  onRowCount,
  windowStart = 0,
  windowEnd,
}) {
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const pageSize = embedded ? EMBEDDED_FETCH_SIZE : DEFAULT_PAGE_SIZE;
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [rejectingReport, setRejectingReport] = useState(null);
  const [reviewingItem, setReviewingItem] = useState(null);

  useApprovalLiveSync();

  const { data, isPending, isFetching, isError, refetch } = useMyQueue(embedded ? 0 : page, pageSize);
  const reviewLineItem = useReviewLineItem();
  const reviewSplit = useReviewSplit();
  const rejectReport = useRejectReport();
  const bulkApprove = useBulkApprove();
  const approveException = useApproveException();

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

    const byStatus = statusFilter === "ALL" ? filtered : filtered.filter((item) => statusGroup(item) === statusFilter);
    const time = (value) => (value ? new Date(value).getTime() : 0);

    if (sortBy === "AMOUNT_DESC") {
      return [...byStatus].sort((a, b) => (b.relevantTotal ?? 0) - (a.relevantTotal ?? 0));
    }
    if (sortBy === "OLDEST") {
      return [...byStatus].sort((a, b) => time(a.submittedAt) - time(b.submittedAt));
    }
    return [...byStatus].sort((a, b) => time(b.submittedAt) - time(a.submittedAt));
  }, [resolvedItems, searchTerm, statusFilter, sortBy]);

  // Only rows that can be approved in one click can be selected for a bulk approval.
  const toggleSelected = (reportId) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) next.delete(reportId);
      else next.add(reportId);
      return next;
    });

  const approveSelected = async () => {
    const ids = [...selectedIds];
    const results = await Promise.allSettled(ids.map((id) => bulkApprove.mutateAsync(id)));
    const failed = results.filter((result) => result.status === "rejected").length;
    if (failed === 0) {
      showStatusToast(`${ids.length} report${ids.length === 1 ? "" : "s"} approved`, "success");
    } else {
      showStatusToast(`${ids.length - failed} approved, ${failed} failed. Check the rest and try again.`, "error");
    }
    setSelectedIds(new Set());
  };

  const isMutating =
    reviewLineItem.isPending || reviewSplit.isPending || rejectReport.isPending || bulkApprove.isPending || approveException.isPending;

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
    approveLine(reportId, relevantLine)
      .then(() => showStatusToast("Approved", "success"))
      .catch((err) => showStatusToast(err.response?.data?.message || "Failed to approve", "error"));
  };

  const handleFlagLine = (reportId, relevantLine, comment) => {
    flagLine(reportId, relevantLine, comment)
      .then(() => showStatusToast("Flagged for correction", "success"))
      .catch((err) => showStatusToast(err.response?.data?.message || "Failed to flag for correction", "error"));
  };

  const handleApproveException = (reportId, lineItemId, violationId, justification) => {
    approveException.mutate(
      { reportId, lineItemId, violationId, justification },
      {
        onSuccess: () => showStatusToast("Exception authorized", "success"),
        onError: (err) => showStatusToast(err.response?.data?.message || "Failed to authorize exception", "error"),
      }
    );
  };

  const handleBulkApprove = (reportId) => {
    bulkApprove.mutate(reportId, {
      onSuccess: () => showStatusToast("Report approved", "success"),
      onError: (err) => showStatusToast(err.response?.data?.message || "Approve failed", "error"),
    });
  };

  const renderActions = (item) => {
    // The policy warning is already shown in the Status column, so the actions stay a single tidy row.
    return (
      <RowActions>
        <RowActionButton tone="view" icon={Eye} label="Review" disabled={isMutating} onClick={() => setReviewingItem(item)} />
        <RowActionButton
          tone="approve"
          icon={CheckCircle2}
          label="Approve"
          title={!item.eligibleForBulkApprove ? "Has open policy violations — review and act line-by-line instead." : "Approve"}
          disabled={isMutating || !item.eligibleForBulkApprove}
          onClick={() => handleBulkApprove(item.reportId)}
        />
        <RowActionButton tone="reject" icon={XCircle} label="Reject" disabled={isMutating} onClick={() => setRejectingReport(item)} />
      </RowActions>
    );
  };

  // Embedded: only the rows inside this page's window. The parent counts every row across both lists.
  const windowItems = windowEnd === undefined ? filteredItems : filteredItems.slice(windowStart, windowEnd);
  const itemRows = windowItems.map((item, index) => {
                    const isExpanded = expandedReportId === item.reportId;
                    const flagged = hasPolicyIssue(item.relevantLines);
                    const needsCorrection = item.reportStatus === "AWAITING_CORRECTION";
                    return (
                      <React.Fragment key={item.reportId}>
                        <tr
                          className={`transition cursor-pointer ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}
                          onClick={() => setExpandedReportId(isExpanded ? null : item.reportId)}
                        >
                          <td className="px-2.5 py-1.5 text-left align-middle">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 rounded border-gray-300 disabled:opacity-30"
                                aria-label={`Select ${item.reportNumber}`}
                                title={item.eligibleForBulkApprove ? "Select for bulk approval" : "Needs line-by-line review"}
                                disabled={!item.eligibleForBulkApprove}
                                checked={selectedIds.has(item.reportId)}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => toggleSelected(item.reportId)}
                              />
                              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">Expense</span>
                            </div>
                          </td>
                          <td className="px-2.5 py-1.5 text-left align-middle">
                            <span className="font-medium text-xs text-gray-900">
                              <EmployeeLabel employeeId={item.employeeId} />
                            </span>
                          </td>
                          <td className="px-2.5 py-1.5 text-left align-middle max-w-[220px]">
                            <p className="font-semibold text-gray-900 truncate text-xs">{merchantSummary(item.relevantLines)}</p>
                            {item.submittedAt && (
                              <p className={`mt-0.5 truncate text-[11px] ${waitingDays(item.submittedAt) >= 3 ? "font-medium text-rose-600" : "text-gray-500"}`}>
                                Submitted {submittedLabel(item.submittedAt)}
                                {waitingDays(item.submittedAt) >= 3 && ` · waiting ${waitingDays(item.submittedAt)} days`}
                              </p>
                            )}
                          </td>
                          <td className="px-2.5 py-1.5 text-left align-middle text-xs text-gray-600 truncate">{item.costCenterName || "—"}</td>
                          <td className="px-2.5 py-1.5 text-left align-middle">
                            {needsCorrection ? (
                              <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-800">Awaiting employee</span>
                            ) : flagged ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                <ShieldAlert className="h-3 w-3" /> Policy warning · Level {item.levelOrder}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">Pending · Level {item.levelOrder}</span>
                            )}
                          </td>
                          <td className="px-2.5 py-1.5 whitespace-nowrap text-right text-xs">
                            <span className="font-semibold tabular-nums text-gray-900">{formatMoney(item.relevantTotal, item.currencyCode)}</span>
                            {item.relevantTotal !== item.totalAmount && (
                              <span className="block text-[11px] text-gray-400">of {formatMoney(item.totalAmount, item.currencyCode)}</span>
                            )}
                          </td>
                          <td className="px-2.5 py-1.5 text-right text-xs text-gray-300" title="Shown for cash advances only">—</td>
                          <td className="px-2.5 py-1.5 text-right text-xs text-gray-300" title="Shown for cash advances only">—</td>
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
                                onApproveException={(line, violationId, justification) =>
                                  handleApproveException(item.reportId, line.lineItemId, violationId, justification)
                                }
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  });

  const modals = createPortal(
    <>
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
    </>,
    document.body,
  );

  // Tell the parent how many rows this list has, so the page can show one empty message for the whole table.
  useEffect(() => {
    if (!isPending && !isError && onRowCount) onRowCount(filteredItems.length);
  }, [isPending, isError, filteredItems.length, onRowCount]);

  if (embedded) {
    return (
      <>
        {isPending && !data && (
          <tbody>
            <tr>
              <td colSpan={9} className="py-10 text-center text-xs text-gray-500">Loading your queue…</td>
            </tr>
          </tbody>
        )}
        {isError && (
          <tbody>
            <tr>
              <td colSpan={9} className="py-6 text-center text-xs text-rose-700">
                Failed to load your queue. <button className="underline" onClick={() => refetch()}>Retry</button>
              </td>
            </tr>
          </tbody>
        )}
        {selectedIds.size > 0 && (
          <tbody>
            <tr>
              <td colSpan={9} className="bg-indigo-50 px-2.5 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-indigo-900">{selectedIds.size} selected</span>
                  <div className="flex items-center gap-2">
                    <Button size="small" variant="outline" onClick={() => setSelectedIds(new Set())}>
                      Clear
                    </Button>
                    <Button size="small" variant="success" disabled={isMutating} loading={bulkApprove.isPending} onClick={approveSelected}>
                      <CheckCircle2 className="h-4 w-4" /> Approve selected
                    </Button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        )}
        {filteredItems.length > 0 && (
          <tbody className="divide-y divide-gray-100">{itemRows}</tbody>
        )}
        {modals}
      </>
    );
  }

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

     {isPending && !data && (
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

      {!isPending && !isError && items.length > 0 && filteredItems.length === 0 && (
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
                    <th className="px-2.5 py-2 text-left">Report</th>
                    <th className="px-2.5 py-2 text-left">Employee</th>
                    <th className="px-2.5 py-2 text-left">Merchant / Category</th>
                    <th className="px-2.5 py-2 text-left">Level</th>
                    <th className="px-2.5 py-2 text-left">Expenses</th>
                    <th className="px-2.5 py-2 text-left">Policy</th>
                    <th className="px-2.5 py-2 text-left">Amount for My Approval</th>
                    <th className="px-2.5 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {itemRows}
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

      {data && (
        <div className="mt-4 flex justify-center">
          <Pagination
            currentPage={page + 1}
            totalPages={data.totalPages ?? 0}
            onPrevious={() => setPage(Math.max(page - 1, 0))}
            onNext={() => setPage(Math.min(page + 1, (data.totalPages ?? 0) - 1))}
          />
        </div>
      )}

      {modals}
    </div>
  );
}
