import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Inbox, Layers, ShieldAlert, Lock } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { showStatusToast } from "@/components/toastfy/toast";
import { useFinanceQueue, useVerifyLineItem, useQueryLineItem } from "./hooks/useFinanceVerification";
import EmployeeLabel from "../../approval-engine/components/EmployeeLabel";
import FinanceLineItemReviewPanel from "./components/FinanceLineItemReviewPanel";
import FinanceReviewPanel from "./components/FinanceReviewPanel";
import { formatMoney } from "../../approval-engine/constants/approvalLabels";

const merchantSummary = (lineItems) => {
  if (!lineItems?.length) return "—";
  const first = lineItems[0].merchantName || lineItems[0].categoryName || "Line item";
  return lineItems.length > 1 ? `${first} +${lineItems.length - 1} more` : first;
};

const hasIneligibleLines = (lineItems) => (lineItems || []).some((l) => !l.eligibleForVerify);

export default function VerificationPage() {
  const [page, setPage] = useState(0);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [reviewingReport, setReviewingReport] = useState(null);

  const { data, isLoading, isError, error, refetch } = useFinanceQueue(page, 20);
  const verifyLineItem = useVerifyLineItem();
  const queryLineItem = useQueryLineItem();

  const items = data?.content || [];
  const isMutating = verifyLineItem.isPending || queryLineItem.isPending;

  const handleVerifyLine = (reportId, lineItemId) => {
    verifyLineItem.mutate(
      { reportId, lineItemId },
      {
        onSuccess: () => showStatusToast("Line item verified successfully", "success"),
        onError: (err) => showStatusToast(err.response?.data?.message || "Failed to verify line item", "error"),
      }
    );
  };

  const handleQueryLine = (reportId, lineItemId, reason) => {
    queryLineItem.mutate(
      { reportId, lineItemId, reason },
      {
        onSuccess: () => showStatusToast("Query raised successfully", "success"),
        onError: (err) => showStatusToast(err.response?.data?.message || "Failed to raise query", "error"),
      }
    );
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <Breadcrumb
          items={[
            { label: "Expense Management", to: "/expense-management/dashboard" },
            { label: "Finance", to: "/expense-management/finance/verification" },
            { label: "Verification" },
          ]}
        />
        <h1 className="text-xl font-semibold text-gray-900 mt-3 mb-4">Finance Verification</h1>
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
          <LoadingSpinner text="Loading verification queue…" />
        </div>
      </div>
    );
  }

  // Handle error states (including 401 & 403)
  if (isError) {
    const errorStatus = error?.response?.status;
    const isAuthError = errorStatus === 401 || errorStatus === 403;
    return (
      <div className="p-4 sm:p-6">
        <Breadcrumb
          items={[
            { label: "Expense Management", to: "/expense-management/dashboard" },
            { label: "Finance", to: "/expense-management/finance/verification" },
            { label: "Verification" },
          ]}
        />
        <h1 className="text-xl font-semibold text-gray-900 mt-3 mb-4">Finance Verification</h1>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-10 text-center px-4">
          {isAuthError ? <Lock className="h-6 w-6 text-rose-500" /> : <AlertTriangle className="h-6 w-6 text-rose-500" />}
          <p className="text-sm font-semibold text-rose-700">
            {errorStatus === 401
              ? "Your session has expired. Please log in again."
              : errorStatus === 403
              ? "Access denied. You do not have the required role (FINANCE_EXECUTIVE) to view this page."
              : "Failed to load verification queue."}
          </p>
          <p className="text-xs text-rose-500 max-w-md">
            {error?.response?.data?.message || error?.message || "Please check your network connection and try again."}
          </p>
          {!isAuthError && (
            <Button size="small" variant="outline" className="mt-2" onClick={() => refetch()}>
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <Breadcrumb
        items={[
          { label: "Expense Management", to: "/expense-management/dashboard" },
          { label: "Finance", to: "/expense-management/finance/verification" },
          { label: "Verification" },
        ]}
      />

      <h1 className="text-xl font-semibold text-gray-900 mt-3 mb-4">Finance Verification</h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white py-16 text-center">
          <Inbox className="h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Nothing waiting on you right now.</p>
          <p className="text-xs text-gray-400">Expense reports awaiting Finance verification will show up here.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <tr>
                    <th className="w-8 px-4 py-3" />
                    <th className="px-4 py-3">Report</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Merchant / Category</th>
                    <th className="px-4 py-3">Items Pending</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">Eligibility</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const isExpanded = expandedReportId === item.reportId;
                    const hasIneligible = hasIneligibleLines(item.pendingLineItems);
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
                          <td className="px-4 py-3 text-gray-600">
                            <EmployeeLabel employeeId={item.employeeId} />
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-[220px] truncate">
                            {merchantSummary(item.pendingLineItems)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{item.pendingLineItems?.length ?? 0}</td>
                          <td className="px-4 py-3 text-gray-600">
                            <span className="inline-flex items-center gap-1">
                              <Layers className="h-3.5 w-3.5" /> Level {item.levelOrder}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {hasIneligible ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                <ShieldAlert className="h-3 w-3" /> Constraints
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                Ready
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">
                            {formatMoney(item.totalAmount, item.currencyCode)}
                          </td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex flex-wrap items-center justify-end gap-2">
                              <Button
                                size="small"
                                variant="outline"
                                disabled={isMutating}
                                onClick={() => setReviewingReport(item)}
                              >
                                Review
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="bg-gray-50/60 p-0">
                              {hasIneligible && (
                                <p className="flex items-center gap-1.5 text-xs text-amber-700 px-4 pt-3">
                                  <ShieldAlert className="h-3.5 w-3.5" /> Contains line items that are currently ineligible for verification.
                                </p>
                              )}
                              <FinanceLineItemReviewPanel
                                reportId={item.reportId}
                                lineItems={item.pendingLineItems}
                                isBusy={isMutating}
                                onVerifyLine={(lineItemId) => handleVerifyLine(item.reportId, lineItemId)}
                                onQueryLine={(lineItemId, reason) => handleQueryLine(item.reportId, lineItemId, reason)}
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
            {data?.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 bg-gray-50">
                <span className="text-xs text-gray-500">
                  Page {page + 1} of {data.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="small"
                    variant="outline"
                    disabled={page === 0 || isMutating}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="small"
                    variant="outline"
                    disabled={page >= data.totalPages - 1 || isMutating}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {reviewingReport && (
        <FinanceReviewPanel
          isOpen={reviewingReport != null}
          onClose={() => setReviewingReport(null)}
          reportId={reviewingReport.reportId}
          queueItem={reviewingReport}
        />
      )}
    </div>
  );
}
