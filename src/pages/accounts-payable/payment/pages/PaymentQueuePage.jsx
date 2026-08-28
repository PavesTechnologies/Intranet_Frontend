import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, AlertCircle, RefreshCw, Eye } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { PageCard, PageCardContent } from "@/components/Cards/PageCard";
import GenericTable from "@/components/Table/table";
import Pagination from "@/components/Pagination/pagination";
import Button from "@/components/Button/Button";
import StatusBadge from "@/components/status/statusbadge";
import { showStatusToast } from "@/components/toastfy/toast";
import apPaymentApi from "../../services/apPaymentApi";

const ITEMS_PER_PAGE = 10;

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const formatAmount = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function PaymentQueuePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [queueItems, setQueueItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      // Spring Data Pageable is 0-indexed, so page passed to API is currentPage - 1
      const res = await apPaymentApi.getQueue(currentPage - 1, ITEMS_PER_PAGE);
      
      const payload = res.data;
      if (payload && typeof payload === "object") {
        // Handle ApiResponse structure if present: res.data?.data or res.data
        const dataObj = payload.data || payload;
        const items = dataObj.content || dataObj.data || [];
        const total = dataObj.totalElements !== undefined ? dataObj.totalElements : items.length;
        
        // Filter out completed payments for the pending queue just in case
        const pendingItems = items.filter(item => item.paymentRoutingStatus !== "PAYMENT_COMPLETED");
        
        setQueueItems(pendingItems);
        setTotalItems(total);
      } else {
        setQueueItems([]);
        setTotalItems(0);
      }
    } catch (err) {
      console.error("Failed to fetch payment queue:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to fetch payment queue.";
      showStatusToast(errMsg, "error");
      setLoadError(true);
      setQueueItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const breadcrumbs = [
    { label: "Accounts Payable", to: "/accounts-payable/payment-queue" },
    { label: "Payment Queue" }
  ];

  const headers = [
    "S.No",
    "Expense Report ID",
    "Employee",
    "Expense Title",
    "Amount",
    "Currency",
    "Cost Center",
    "Approved Date",
    "Payment Status",
    "Actions"
  ];

  const columns = [
    "serial_no",
    "reportNumber",
    "employeeId",
    "title",
    "totalAmount",
    "currencyCode",
    "costCenterName",
    "approvedAt",
    "paymentRoutingStatus",
    "actions"
  ];

  const tableRows = queueItems.map((item, index) => {
    const routingStatus = item.paymentRoutingStatus || "PENDING";
    return {
      serial_no: ((currentPage - 1) * ITEMS_PER_PAGE + index + 1).toString(),
      reportNumber: <span className="font-mono text-xs">{item.reportNumber || "N/A"}</span>,
      employeeId: item.employeeId || "—",
      title: item.title || "—",
      totalAmount: formatAmount(item.totalAmount),
      currencyCode: item.currencyCode || "—",
      costCenterName: item.costCenterName || "—",
      approvedAt: formatDate(item.approvedAt),
      paymentRoutingStatus: <StatusBadge label={routingStatus} size="sm" />,
      actions: (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="link"
            size="icon"
            title="View Details"
            aria-label="View Details"
            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 transition rounded-md"
            onClick={() => navigate(`/accounts-payable/payment-queue/${item.reportId}`)}
          >
            <Eye size={16} />
          </Button>
        </div>
      )
    };
  });

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 0;

  return (
    <div className="space-y-4 p-6">
      <Breadcrumb items={breadcrumbs} />

      {/* Top Header Card */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#0a174e]">Accounts Payable</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and mark payments as completed for verified and approved expense reports.
          </p>
        </div>

        <button
          onClick={fetchQueue}
          title="Reload queue data"
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md transition self-start lg:self-auto"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Main Table / Data Grid Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-blue-600 border-gray-200"></div>
            <p className="text-sm text-gray-500 mt-4">Loading queue items...</p>
          </div>
        ) : loadError ? (
          <PageCard>
            <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
              <AlertCircle className="h-10 w-10 text-red-300 mb-3" />
              <h2 className="text-sm font-semibold text-gray-700">Failed to load Payment Queue</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Something went wrong while fetching data. Please try again.
              </p>
              <Button variant="outline" size="small" className="mt-4" onClick={fetchQueue}>
                Retry
              </Button>
            </PageCardContent>
          </PageCard>
        ) : queueItems.length === 0 ? (
          <PageCard>
            <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
              <Inbox className="h-10 w-10 text-gray-300 mb-3" />
              <h2 className="text-sm font-semibold text-gray-700">No Expenses Pending Payment</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                No expenses are currently awaiting payment.
              </p>
            </PageCardContent>
          </PageCard>
        ) : (
          <>
            <div className="w-full overflow-x-auto rounded-lg">
              <GenericTable headers={headers} rows={tableRows} columns={columns} />
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
