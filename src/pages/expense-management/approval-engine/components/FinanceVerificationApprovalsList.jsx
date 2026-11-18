import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/Button/Button";
import EmployeeLabel from "./EmployeeLabel";
import { formatMoney } from "../constants/approvalLabels";
import { useFinanceQueue } from "@/pages/expense-management/pages/finance/hooks/useFinanceVerification";
import FinanceReviewPanel from "@/pages/expense-management/pages/finance/components/FinanceReviewPanel";
import Pagination from "@/components/Pagination/pagination";

export const FINANCE_APPROVALS_PAGE_SIZE = 20;

const merchantSummary = (lineItems) => {
  if (!lineItems?.length) return "—";
  const first = lineItems[0]?.merchantName || lineItems[0]?.categoryName || "Line item";
  return lineItems.length > 1 ? `${first} +${lineItems.length - 1} more` : first;
};

/**
 * Finance Verification rows for the Approvals page's Pending tab. The Finance queue is role-based
 * (every report PENDING_FINANCE_VERIFICATION, GET /xms/finance-verification/my-queue), not
 * assignment-based like /approvals/my-queue - so a Finance user sees these reports here even when
 * the Finance level's assignment resolved to someone else (e.g. a named approver who has left).
 * Rendered as <tbody> rows inside ApprovalsPage's shared table.
 */
export default function FinanceVerificationApprovalsList({ searchTerm = "", excludeReportIds }) {
  const [page, setPage] = useState(0);
  const [reviewingItem, setReviewingItem] = useState(null);
  const { data, isPending, isError, refetch } = useFinanceQueue(page, FINANCE_APPROVALS_PAGE_SIZE);

  const rows = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return (data?.content || []).filter((item) => {
      // Avoid showing a report twice when the caller also holds its Finance assignment.
      if (excludeReportIds?.has(item.reportId)) return false;
      if (!q) return true;
      return (
        (item.reportNumber || "").toLowerCase().includes(q) ||
        merchantSummary(item.pendingLineItems).toLowerCase().includes(q)
      );
    });
  }, [data, searchTerm, excludeReportIds]);

  if (isPending && !data) {
    return (
      <tbody>
        <tr>
          <td colSpan={7} className="py-6 text-center text-xs text-gray-500">Loading Finance verification queue…</td>
        </tr>
      </tbody>
    );
  }

  if (isError) {
    return (
      <tbody>
        <tr>
          <td colSpan={7} className="py-6 text-center text-xs text-rose-700">
            Failed to load the Finance verification queue.{" "}
            <button type="button" className="underline" onClick={() => refetch()}>Retry</button>
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <>
      {rows.length > 0 && (
        <tbody className="divide-y divide-gray-100">
          {rows.map((item, index) => (
            <tr key={`finance-${item.reportId}`} className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}>
              <td className="px-2.5 py-1.5">
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">Expense</span>
              </td>
              <td className="px-2.5 py-1.5">
                <span className="font-mono text-[11px] font-semibold text-gray-700">{item.reportNumber}</span>
              </td>
              <td className="px-2.5 py-1.5">
                <span className="font-medium text-xs text-gray-900">
                  <EmployeeLabel employeeId={item.employeeId} />
                </span>
              </td>
              <td className="px-2.5 py-1.5 text-gray-600 max-w-[220px] truncate text-xs">{merchantSummary(item.pendingLineItems)}</td>
              <td className="px-2.5 py-1.5">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                  Pending Finance Verification
                </span>
              </td>
              <td className="px-2.5 py-1.5 whitespace-nowrap text-right text-xs">
                <span className="font-semibold text-gray-900">{formatMoney(item.totalAmount, item.currencyCode)}</span>
              </td>
              <td className="px-2.5 py-1.5 text-right text-xs">
                <Button size="small" variant="primary" onClick={() => setReviewingItem(item)}>
                  Review
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      )}
      {(data?.totalPages ?? 0) > 1 && (
        <tbody>
          <tr>
            <td colSpan={7} className="py-2">
              <div className="flex justify-center">
                <Pagination
                  currentPage={page + 1}
                  totalPages={data.totalPages}
                  onPrevious={() => setPage((p) => Math.max(p - 1, 0))}
                  onNext={() => setPage((p) => Math.min(p + 1, data.totalPages - 1))}
                />
              </div>
            </td>
          </tr>
        </tbody>
      )}
      {reviewingItem &&
        createPortal(
          <FinanceReviewPanel
            isOpen={!!reviewingItem}
            onClose={() => setReviewingItem(null)}
            reportId={reviewingItem.reportId}
            queueItem={reviewingItem}
          />,
          document.body,
        )}
    </>
  );
}
