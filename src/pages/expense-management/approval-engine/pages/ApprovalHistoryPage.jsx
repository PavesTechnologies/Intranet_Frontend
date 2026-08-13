import React, { useState } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import ApprovalStatusPill from "../components/ApprovalStatusPill";
import EmployeeLabel from "../components/EmployeeLabel";
import ExpenseReviewPanel from "../components/ExpenseReviewPanel";
import { useMyHistory } from "../hooks/useApprovalWorkflow";
import { useApprovalLiveSync } from "../hooks/useApprovalLiveSync";
import { formatMoney, formatDate } from "../constants/approvalLabels";

/**
 * Approved/Rejected tabs share this one component (outcome is the only real difference) - both are
 * GET /xms/approvals/my-history?outcome=..., server-side paginated. Rows open the same
 * ExpenseReviewPanel used by the pending queue, in read-only "history" mode.
 */
export default function ApprovalHistoryPage({ outcome, title, breadcrumbLabel }) {
  const [page, setPage] = useState(0);
  const [reviewingItem, setReviewingItem] = useState(null);
  useApprovalLiveSync();

  const { data, isLoading, isError, refetch } = useMyHistory(outcome, page, 20);
  const items = data?.content || [];

  return (
    <div className="p-4 sm:p-6">
      <Breadcrumb
        items={[
          { label: "Expense Management", to: "/expense-management/dashboard" },
          { label: "Approvals" },
          { label: breadcrumbLabel },
        ]}
      />

      <h1 className="text-xl font-semibold text-gray-900 mt-3 mb-4">{title}</h1>

      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
          <LoadingSpinner text="Loading…" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-10 text-center">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          <p className="text-sm text-rose-700">Failed to load history.</p>
          <Button size="small" variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white py-16 text-center">
          <Inbox className="h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Nothing here yet.</p>
        </div>
      )}

      {items.length > 0 && (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Report</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Cost Center</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((report) => (
                    <tr key={report.reportId} className="hover:bg-gray-50 cursor-pointer" onClick={() => setReviewingItem(report)}>
                      <td className="px-4 py-3 font-medium text-gray-900">{report.reportNumber}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[220px] truncate">{report.title || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <EmployeeLabel employeeId={report.employeeId} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{report.costCenterName || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(report.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">{formatMoney(report.totalAmount, report.currencyCode)}</td>
                      <td className="px-4 py-3">
                        <ApprovalStatusPill status={report.reportStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {items.map((report) => (
              <button
                key={report.reportId}
                type="button"
                onClick={() => setReviewingItem(report)}
                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{report.reportNumber}</p>
                    <p className="truncate text-sm text-gray-500">{report.title || <EmployeeLabel employeeId={report.employeeId} />}</p>
                  </div>
                  <p className="shrink-0 font-semibold text-gray-900">{formatMoney(report.totalAmount, report.currencyCode)}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>{formatDate(report.createdAt)}</span>
                  <ApprovalStatusPill status={report.reportStatus} />
                </div>
              </button>
            ))}
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

      <ExpenseReviewPanel
        isOpen={!!reviewingItem}
        onClose={() => setReviewingItem(null)}
        reportId={reviewingItem?.reportId}
        mode="history"
        historyItem={reviewingItem}
      />
    </div>
  );
}
