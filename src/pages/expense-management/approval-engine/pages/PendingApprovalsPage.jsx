import React, { useState } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import GenericTable from "@/components/Table/table";
import Pagination from "@/components/Pagination/pagination";
import { showStatusToast } from "@/components/toastfy/toast";
import { useMyQueue, useBulkApprove } from "../hooks/useApprovalWorkflow";
import { useApprovalLiveSync } from "../hooks/useApprovalLiveSync";
import { formatMoney, formatDate, friendlyApprovalError } from "../constants/approvalLabels";
import EmployeeLabel from "../components/EmployeeLabel";
import ApprovalStatusPill from "../components/ApprovalStatusPill";
import MyDelegateCard from "../components/MyDelegateCard";
import ExpenseReviewPanel from "../components/ExpenseReviewPanel";

/**
 * The approver's queue - every report where the caller (or their active delegate) currently has an
 * ACTIVE assignment (GET /xms/approvals/my-queue, server-side paginated). A clean summary table;
 * "Review" is the only per-row action - approve/reject/needs-correction/bulk-approve-this-report all
 * live inside ExpenseReviewPanel so they aren't duplicated here. Row checkboxes are only for
 * selecting several DIFFERENT reports to bulk-approve at once (each still calls the same
 * single-report POST /{reportId}/bulk-approve - there is no multi-report backend endpoint).
 *
 * Approval-only by design: Finance Verification is its own separate page
 * (/expense-management/finance/verification) - a report leaving this queue for
 * PENDING_FINANCE_VERIFICATION is expected to disappear from here and be picked up there, not
 * surface inside this page.
 */
export default function PendingApprovalsPage() {
  const [page, setPage] = useState(0);
  const [reviewingItem, setReviewingItem] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);

  useApprovalLiveSync();

  const { data, isLoading, isError, refetch } = useMyQueue(page, 20);
  const bulkApprove = useBulkApprove();

  const items = data?.content || [];
  const eligibleIds = items.filter((i) => i.eligibleForBulkApprove).map((i) => i.reportId);
  const selectedEligibleIds = [...selectedIds].filter((id) => eligibleIds.includes(id));
  const allEligibleSelected = eligibleIds.length > 0 && eligibleIds.every((id) => selectedIds.has(id));

  const toggleSelect = (reportId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) next.delete(reportId);
      else next.add(reportId);
      return next;
    });
  };

  const toggleSelectAllEligible = () => {
    setSelectedIds(allEligibleSelected ? new Set() : new Set(eligibleIds));
  };

  const handleBulkApproveSelected = async () => {
    const ids = selectedEligibleIds;
    if (!ids.length || bulkRunning) return;
    setBulkRunning(true);

    const results = await Promise.allSettled(ids.map((id) => bulkApprove.mutateAsync(id)));

    const failures = [];
    results.forEach((result, idx) => {
      if (result.status === "rejected") {
        const reportNumber = items.find((i) => i.reportId === ids[idx])?.reportNumber || ids[idx];
        failures.push({ reportNumber, reason: friendlyApprovalError(result.reason?.response?.data?.message, "Approval failed") });
      }
    });
    const successCount = ids.length - failures.length;

    if (successCount > 0) {
      showStatusToast(
        `Successfully approved: ${successCount}${failures.length ? `  ·  Failed: ${failures.length}` : ""}`,
        failures.length ? "warning" : "success"
      );
    }
    failures.forEach((f) => showStatusToast(`${f.reportNumber}: ${f.reason}`, "error"));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id, idx) => {
        if (results[idx].status === "fulfilled") next.delete(id);
      });
      return next;
    });
    setBulkRunning(false);
  };

  return (
    <div className="p-4 sm:p-6">
      <Breadcrumb
        items={[
          { label: "Expense Management", to: "/expense-management/dashboard" },
          { label: "Approvals" },
          { label: "Pending" },
        ]}
      />

      <div className="mt-3 mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Pending Approvals</h1>
        {selectedEligibleIds.length > 0 && (
          <Button size="small" variant="success" loading={bulkRunning} loadingText="Approving..." onClick={handleBulkApproveSelected}>
            Bulk Approve Selected ({selectedEligibleIds.length})
          </Button>
        )}
      </div>

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
          <p className="text-sm font-medium text-gray-600">Nothing waiting on you right now.</p>
          <p className="text-xs text-gray-400">Reports assigned to you for approval will show up here.</p>
        </div>
      )}

      {items.length > 0 && (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden md:block rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="w-full overflow-x-auto rounded-lg">
              <GenericTable
                headers={[
                  <input
                    type="checkbox"
                    checked={allEligibleSelected}
                    disabled={eligibleIds.length === 0}
                    onChange={toggleSelectAllEligible}
                    title="Select all reports eligible for bulk approval"
                  />,
                  "Employee", "Report", "Submitted", "Cost Center", "Amount", "Status", "Action",
                ]}
                columns={["select", "employee", "report", "submitted", "costCenter", "amount", "status", "action"]}
                rows={items.map((item) => ({
                  select: (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.reportId)}
                      disabled={!item.eligibleForBulkApprove}
                      onChange={() => toggleSelect(item.reportId)}
                      title={item.eligibleForBulkApprove ? "Select for bulk approval" : "Has open policy violations - not eligible for bulk approval"}
                    />
                  ),
                  employee: <EmployeeLabel employeeId={item.employeeId} />,
                  report: item.reportNumber,
                  submitted: formatDate(item.submittedAt),
                  costCenter: item.costCenterName || "—",
                  amount: formatMoney(item.totalAmount, item.currencyCode),
                  status: <ApprovalStatusPill status={item.reportStatus} />,
                  action: (
                    <Button size="small" variant="outline" onClick={() => setReviewingItem(item)}>
                      Review
                    </Button>
                  ),
                }))}
              />
            </div>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {items.map((item) => (
              <div key={item.reportId} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{item.reportNumber}</p>
                    <p className="text-sm text-gray-500">
                      <EmployeeLabel employeeId={item.employeeId} />
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-gray-900">{formatMoney(item.totalAmount, item.currencyCode)}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>Submitted {formatDate(item.submittedAt)}</span>
                  {item.costCenterName && <span>· {item.costCenterName}</span>}
                </div>
                <div className="mt-2">
                  <ApprovalStatusPill status={item.reportStatus} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.reportId)}
                      disabled={!item.eligibleForBulkApprove}
                      onChange={() => toggleSelect(item.reportId)}
                    />
                    Select for bulk approve
                  </label>
                  <Button size="small" variant="outline" onClick={() => setReviewingItem(item)}>
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination
            currentPage={page + 1}
            totalPages={data.totalPages}
            onPrevious={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </div>
      )}

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
