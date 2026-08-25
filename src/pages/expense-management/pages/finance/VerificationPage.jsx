import React, { useState } from "react";
import { AlertTriangle, Lock } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useFinanceQueue } from "./hooks/useFinanceVerification";
import FinanceReviewPanel from "./components/FinanceReviewPanel";
import FinanceQueueTable from "./components/FinanceQueueTable";

/**
 * Finance's queue - one row per report, matching the same clean summary-table + single "Review"
 * action pattern as the Manager's Pending Approvals page. Verify/Query stay inside
 * FinanceReviewPanel rather than duplicated here as row-level shortcuts.
 */
export default function VerificationPage() {
  const [page, setPage] = useState(0);
  const [reviewingReport, setReviewingReport] = useState(null);

  const { data, isLoading, isError, error, refetch } = useFinanceQueue(page, 20);

  const items = data?.content || [];

  const breadcrumbs = (
    <Breadcrumb
      items={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Finance", to: "/expense-management/finance/verification" },
        { label: "Verification" },
      ]}
    />
  );

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        {breadcrumbs}
        <h1 className="text-xl font-semibold text-gray-900 mt-3 mb-4">Finance Verification</h1>
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
          <LoadingSpinner text="Loading verification queue…" />
        </div>
      </div>
    );
  }

  if (isError) {
    const errorStatus = error?.response?.status;
    const isAuthError = errorStatus === 401 || errorStatus === 403;
    return (
      <div className="p-4 sm:p-6">
        {breadcrumbs}
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
      {breadcrumbs}
      <h1 className="text-xl font-semibold text-gray-900 mt-3 mb-4">Finance Verification</h1>

      <FinanceQueueTable
        items={items}
        page={page}
        totalPages={data?.totalPages || 1}
        onPrevious={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
        onReview={setReviewingReport}
      />

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
