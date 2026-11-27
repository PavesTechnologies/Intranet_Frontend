import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/Button/Button";
import { CheckCircle2, Eye, MessageSquareWarning, XCircle } from "lucide-react";
import RowActionButton, { RowActions } from "./RowActionButton";
import { ApprovalStatusBadge } from "./approvalStatus";
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
// `rowFilter` (optional): the Approvals page's column filters. Called with { employeeId, employeeName, costCenter, amount, date }.
export default function FinanceVerificationApprovalsList({ searchTerm = "", excludeReportIds, rowFilter = null }) {
  const [page, setPage] = useState(0);
  const [reviewingItem, setReviewingItem] = useState(null);
  const { data, isPending, isError, refetch } = useFinanceQueue(page, FINANCE_APPROVALS_PAGE_SIZE);

  const rows = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return (data?.content || []).filter((item) => {
      // Avoid showing a report twice when the caller also holds its Finance assignment.
      if (excludeReportIds?.has(item.reportId)) return false;
      if (rowFilter && !rowFilter({
        employeeId: item.employeeId, employeeName: item.employeeName, costCenter: item.costCenterName,
        amount: item.totalAmount, date: item.submittedAt, status: "PENDING_FINANCE",
      })) return false;
      if (!q) return true;
      return (
        (item.reportNumber || "").toLowerCase().includes(q) ||
        (item.title || "").toLowerCase().includes(q) ||
        merchantSummary(item.pendingLineItems).toLowerCase().includes(q)
      );
    });
  }, [data, searchTerm, excludeReportIds, rowFilter]);

  if (isPending && !data) {
    return (
      <tbody>
        <tr>
          <td colSpan={9} className="py-6 text-center text-xs text-gray-500">Loading Finance verification queue…</td>
        </tr>
      </tbody>
    );
  }

  if (isError) {
    return (
      <tbody>
        <tr>
          <td colSpan={9} className="py-6 text-center text-xs text-rose-700">
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
                <span className="inline-flex items-center whitespace-nowrap rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">Expense</span>
              </td>
              <td className="px-2.5 py-1.5">
                <span className="font-medium text-xs text-gray-900">
                  <EmployeeLabel employeeId={item.employeeId} />
                </span>
              </td>
              <td className="px-2.5 py-1.5 max-w-[220px] truncate text-xs font-semibold text-gray-900" title={item.title || undefined}>{item.title || merchantSummary(item.pendingLineItems)}</td>
              <td className="px-2.5 py-1.5 text-gray-600 truncate text-xs">{item.costCenterName || item.costCenterCode || "—"}</td>
              <td className="px-2.5 py-1.5">
                <ApprovalStatusBadge statusKey="PENDING_FINANCE" />
              </td>
              <td className="px-2.5 py-1.5 whitespace-nowrap text-right text-xs">
                <span className="font-semibold text-gray-900">{formatMoney(item.totalAmount, item.currencyCode)}</span>
              </td>
              <td className="px-2.5 py-1.5 text-right text-xs text-gray-300" title="Shown for cash advances only">—</td>
              <td className="px-2.5 py-1.5 text-right text-xs text-gray-300" title="Shown for cash advances only">—</td>
              <td className="px-2.5 py-1.5 text-right text-xs">
                {/* Finance verifies line by line, so each decision opens the review. */}
                <RowActions>
                  <RowActionButton tone="view" icon={Eye} label="View" title="View the report" onClick={() => setReviewingItem(item)} />
                  <RowActionButton tone="approve" icon={CheckCircle2} label="Verify" title="Open the review to verify the lines" onClick={() => setReviewingItem(item)} />
                  <RowActionButton tone="clarify" icon={MessageSquareWarning} label="Send back" title="Open the review to query a line" onClick={() => setReviewingItem(item)} />
                  <RowActionButton tone="reject" icon={XCircle} label="Reject" title="Open the review to reject" onClick={() => setReviewingItem(item)} />
                </RowActions>
              </td>
            </tr>
          ))}
        </tbody>
      )}
      {(data?.totalPages ?? 0) > 1 && (
        <tbody>
          <tr>
            <td colSpan={9} className="py-2">
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
