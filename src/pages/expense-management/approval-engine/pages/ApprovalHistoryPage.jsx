import React, { useState } from "react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import ApprovalStatusPill from "../components/ApprovalStatusPill";
import { useMyHistory } from "../hooks/useApprovalWorkflow";
import { useApprovalLiveSync } from "../hooks/useApprovalLiveSync";

const formatMoney = (amount, currencyCode) =>
  amount == null ? "—" : `${currencyCode || ""} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

/**
 * Approved/Rejected tabs share this one component (outcome is the only real difference) - both are
 * GET /xms/approvals/my-history?outcome=..., server-side paginated.
 */
export default function ApprovalHistoryPage({ outcome, title, breadcrumbLabel }) {
  const [page, setPage] = useState(0);
  useApprovalLiveSync();

  const { data, isLoading, isError, refetch } = useMyHistory(outcome, page, 20);
  const items = data?.content || [];

  return (
    <div className="p-6">
      <Breadcrumb
        items={[
          { label: "Expense Management", to: "/expense-management/dashboard" },
          { label: "Approvals" },
          { label: breadcrumbLabel },
        ]}
      />

      <h1 className="text-xl font-semibold text-gray-900 mt-3 mb-4">{title}</h1>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {isError && (
        <p className="text-sm text-rose-600">
          Failed to load history.{" "}
          <button className="underline" onClick={() => refetch()}>Retry</button>
        </p>
      )}
      {!isLoading && !isError && items.length === 0 && <p className="text-sm text-gray-500">Nothing here yet.</p>}

      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Report</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((report) => (
                <tr key={report.reportId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{report.reportNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{report.employeeId}</td>
                  <td className="px-4 py-3 text-gray-900">{formatMoney(report.totalAmount, report.currencyCode)}</td>
                  <td className="px-4 py-3">
                    <ApprovalStatusPill status={report.reportStatus} />
                  </td>
                </tr>
              ))}
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
    </div>
  );
}
