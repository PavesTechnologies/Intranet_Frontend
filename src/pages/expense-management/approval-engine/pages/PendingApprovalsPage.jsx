import React, { useState } from "react";
import { ChevronDown, ChevronRight, Layers, ShieldAlert, XCircle } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import {
  useMyQueue,
  useReviewLineItem,
  useRejectReport,
  useBulkApprove,
} from "../hooks/useApprovalWorkflow";
import { useApprovalLiveSync } from "../hooks/useApprovalLiveSync";
import LineItemReviewPanel from "../components/LineItemReviewPanel";
import CommentPromptModal from "../components/CommentPromptModal";
import MyDelegateCard from "../components/MyDelegateCard";

const formatMoney = (amount, currencyCode) =>
  amount == null ? "—" : `${currencyCode || ""} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

/**
 * The approver's queue - every report where the caller (or their active delegate) currently has an
 * ACTIVE assignment (GET /xms/approvals/my-queue, server-side paginated). Row expansion reveals the
 * enriched per-line context (merchant/date/description/violations) so approving never requires
 * tab-switching to another screen.
 */
export default function PendingApprovalsPage() {
  const [page, setPage] = useState(0);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [rejectingReport, setRejectingReport] = useState(null);

  useApprovalLiveSync();

  const { data, isLoading, isError, refetch } = useMyQueue(page, 20);
  const reviewLineItem = useReviewLineItem();
  const rejectReport = useRejectReport();
  const bulkApprove = useBulkApprove();

  const items = data?.content || [];
  const isMutating = reviewLineItem.isPending || rejectReport.isPending || bulkApprove.isPending;

  const handleApproveLine = (reportId, lineItemId) => {
    reviewLineItem.mutate(
      { reportId, lineItemId, decision: "APPROVED" },
      {
        onError: (err) => showStatusToast(err.response?.data?.message || "Failed to approve line item", "error"),
      },
    );
  };

  const handleFlagLine = (reportId, lineItemId, comment) => {
    reviewLineItem.mutate(
      { reportId, lineItemId, decision: "NEEDS_CORRECTION", comment },
      {
        onSuccess: () => showStatusToast("Line item flagged for correction", "success"),
        onError: (err) => showStatusToast(err.response?.data?.message || "Failed to flag line item", "error"),
      },
    );
  };

  const handleBulkApprove = (reportId) => {
    bulkApprove.mutate(reportId, {
      onSuccess: () => showStatusToast("Report bulk-approved", "success"),
      onError: (err) => showStatusToast(err.response?.data?.message || "Bulk approve failed", "error"),
    });
  };

  return (
    <div className="p-6">
      <Breadcrumb
        items={[
          { label: "Expense Management", to: "/expense-management/dashboard" },
          { label: "Approvals" },
          { label: "Pending" },
        ]}
      />

      <h1 className="text-xl font-semibold text-gray-900 mt-3 mb-4">Pending Approvals</h1>

      <MyDelegateCard />

      {isLoading && <p className="text-sm text-gray-500">Loading your queue…</p>}
      {isError && (
        <p className="text-sm text-rose-600">
          Failed to load your queue.{" "}
          <button className="underline" onClick={() => refetch()}>Retry</button>
        </p>
      )}
      {!isLoading && !isError && items.length === 0 && (
        <p className="text-sm text-gray-500">Nothing waiting on you right now.</p>
      )}

      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="w-8 px-4 py-3" />
                <th className="px-4 py-3">Report</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => {
                const isExpanded = expandedReportId === item.reportId;
                return (
                  <React.Fragment key={item.reportId}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedReportId(isExpanded ? null : item.reportId)}
                    >
                      <td className="px-4 py-3 text-gray-400">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.reportNumber}</td>
                      <td className="px-4 py-3 text-gray-600">{item.employeeId}</td>
                      <td className="px-4 py-3 text-gray-900">{formatMoney(item.totalAmount, item.currencyCode)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5" /> Level {item.levelOrder}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-2">
                          {item.eligibleForBulkApprove && (
                            <Button size="small" variant="success" disabled={isMutating} onClick={() => handleBulkApprove(item.reportId)}>
                              Bulk Approve
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outline"
                            disabled={isMutating}
                            onClick={() => setRejectingReport(item)}
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-gray-50/60 p-0">
                          {!item.eligibleForBulkApprove && (
                            <p className="flex items-center gap-1.5 text-xs text-amber-700 px-4 pt-3">
                              <ShieldAlert className="h-3.5 w-3.5" /> Has open policy violations - not eligible for bulk approval.
                            </p>
                          )}
                          <LineItemReviewPanel
                            reportId={item.reportId}
                            lineItems={item.pendingLineItems}
                            isBusy={isMutating}
                            onApproveLine={(lineItemId) => handleApproveLine(item.reportId, lineItemId)}
                            onFlagLine={(lineItemId, comment) => handleFlagLine(item.reportId, lineItemId, comment)}
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
    </div>
  );
}
