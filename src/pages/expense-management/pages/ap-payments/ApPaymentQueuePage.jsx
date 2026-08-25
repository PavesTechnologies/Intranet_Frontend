import React, { useState } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import GenericTable from "@/components/Table/table";
import Pagination from "@/components/Pagination/pagination";
import StatusBadge from "@/components/status/statusbadge";
import EmployeeLabel from "../../approval-engine/components/EmployeeLabel";
import { formatMoney, formatDate } from "../../approval-engine/constants/approvalLabels";
import { useApPaymentQueue } from "./hooks/useApPayments";
import ApPaymentReviewPanel from "./components/ApPaymentReviewPanel";

/**
 * AP Executive's payment queue - GET /xms/ap-payments/queue, server-side filtered to
 * reportStatus=APPROVED AND paymentRoutingStatus=APPROVED_FOR_PAYMENT. Same clean summary-table +
 * single "Review" action pattern as the Approvals/Finance Verification pages; Complete Payment
 * itself lives inside ApPaymentReviewPanel rather than as a row-level shortcut.
 */
export default function ApPaymentQueuePage() {
  const [page, setPage] = useState(0);
  const [reviewingReport, setReviewingReport] = useState(null);

  const { data, isLoading, isError, refetch } = useApPaymentQueue(page, 20);
  const items = data?.content || [];

  return (
    <div className="p-4 sm:p-6">
      <Breadcrumb
        items={[
          { label: "Expense Management", to: "/expense-management/dashboard" },
          { label: "AP Payments" },
        ]}
      />

      <h1 className="text-xl font-semibold text-gray-900 mt-3 mb-4">AP Payments</h1>

      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
          <LoadingSpinner text="Loading payment queue…" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-10 text-center">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          <p className="text-sm text-rose-700">Failed to load the payment queue.</p>
          <Button size="small" variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white py-16 text-center">
          <Inbox className="h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">No expenses pending payment right now.</p>
          <p className="text-xs text-gray-400">Reports Finance has approved for payment will show up here.</p>
        </div>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="w-full overflow-x-auto rounded-lg">
            <GenericTable
              headers={["Report", "Employee", "Approved Amount", "Currency", "Approved On", "Payment Status", "Action"]}
              columns={["report", "employee", "amount", "currency", "approvedOn", "status", "action"]}
              rows={items.map((item) => ({
                report: item.reportNumber,
                employee: <EmployeeLabel employeeId={item.employeeId} />,
                amount: formatMoney(item.totalAmount, item.currencyCode),
                currency: item.currencyCode,
                approvedOn: formatDate(item.approvedAt),
                status: <StatusBadge label={item.paymentRoutingStatus} size="sm" />,
                action: (
                  <Button size="small" variant="outline" onClick={() => setReviewingReport(item)}>
                    Review
                  </Button>
                ),
              }))}
            />
          </div>

          {data?.totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination
                currentPage={page + 1}
                totalPages={data.totalPages}
                onPrevious={() => setPage((p) => p - 1)}
                onNext={() => setPage((p) => p + 1)}
              />
            </div>
          )}
        </div>
      )}

      {reviewingReport && (
        <ApPaymentReviewPanel
          isOpen={reviewingReport != null}
          onClose={() => setReviewingReport(null)}
          reportId={reviewingReport.reportId}
          queueItem={reviewingReport}
        />
      )}
    </div>
  );
}
