import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  FileText,
  Briefcase,
  User,
  Wallet,
  Receipt,
  CheckCircle2,
  Lock,
  Layers
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { PageCard, PageCardContent } from "@/components/Cards/PageCard";
import GenericTable from "@/components/Table/table";
import Button from "@/components/Button/Button";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import StatusBadge from "@/components/status/statusbadge";
import { showStatusToast } from "@/components/toastfy/toast";
import apPaymentApi from "../../services/apPaymentApi";

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

const DetailField = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3 border border-gray-100">
    <div className="mt-0.5 shrink-0 text-blue-700">{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-800 break-words">{value ?? "—"}</p>
    </div>
  </div>
);

export default function PaymentDetailsPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [errorStatus, setErrorStatus] = useState(null);
  const [details, setDetails] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      setErrorStatus(null);
      const res = await apPaymentApi.getDetails(reportId);
      
      if (res.data && res.data.data) {
        setDetails(res.data.data);
      } else if (res.data) {
        setDetails(res.data);
      } else {
        setLoadError(true);
      }
    } catch (err) {
      console.error("Failed to fetch payment details:", err);
      const status = err.response?.status;
      setErrorStatus(status);
      setLoadError(true);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to fetch payment details.";
      showStatusToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleMarkCompleted = async () => {
    if (submitting) return; // Prevent duplicate clicks
    
    try {
      setSubmitting(true);
      setIsConfirmOpen(false);
      
      await apPaymentApi.completePayment(reportId);
      
      showStatusToast("Payment marked as completed successfully.", "success");
      
      // Refresh the details from backend to reflect the state change
      await fetchDetails();
    } catch (err) {
      console.error("Failed to complete payment:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to mark payment as completed.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-t-blue-600 border-gray-200"></div>
        <p className="text-sm text-gray-500 mt-4 font-medium">Loading details...</p>
      </div>
    );
  }

  if (loadError || !details) {
    let title = "Failed to load payment details";
    let desc = "Something went wrong while fetching data. Please try again.";
    
    if (errorStatus === 403) {
      title = "Access Denied";
      desc = "You do not have permission to view this resource.";
    } else if (errorStatus === 404) {
      title = "Expense Report Not Found";
      desc = "The requested expense report could not be found.";
    }

    return (
      <div className="p-6 space-y-4">
        <Button
          variant="outline"
          size="small"
          onClick={() => navigate("/accounts-payable/payment-queue")}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={14} /> Back to Queue
        </Button>
        <PageCard>
          <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
            <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
            <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">{desc}</p>
            {errorStatus !== 403 && (
              <Button variant="outline" size="small" className="mt-4" onClick={fetchDetails}>
                Retry
              </Button>
            )}
          </PageCardContent>
        </PageCard>
      </div>
    );
  }

  const { report, lineItems, approvalStatus } = details;
  const paymentRoutingStatus = report?.paymentRoutingStatus || "PENDING";
  const reportStatus = report?.reportStatus || "DRAFT";

  const breadcrumbs = [
    { label: "Accounts Payable", to: "/accounts-payable/payment-queue" },
    { label: "Payment Queue", to: "/accounts-payable/payment-queue" },
    { label: report?.reportNumber || "Details" }
  ];

  const headers = [
    "S.No",
    "Date",
    "Category",
    "Merchant",
    "Amount",
    "Base Amount",
    "Description",
    "Status"
  ];

  const columns = [
    "serial_no",
    "expenseDate",
    "categoryName",
    "merchantName",
    "amount",
    "baseAmount",
    "description",
    "lineStatus"
  ];

  const tableRows = (lineItems || []).map((item, index) => ({
    serial_no: (index + 1).toString(),
    expenseDate: formatDate(item.expenseDate),
    categoryName: item.categoryName || "—",
    merchantName: item.merchantName || "—",
    amount: `${formatAmount(item.amount)} ${item.currencyCode || ""}`,
    baseAmount: `${formatAmount(item.baseAmount)} ${item.baseCurrencyCode || "INR"}`,
    description: item.description || "—",
    lineStatus: <StatusBadge label={item.lineStatus || "PENDING"} size="sm" />
  }));

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumbs} />
        <Button
          variant="outline"
          size="small"
          onClick={() => navigate("/accounts-payable/payment-queue")}
          className="flex items-center gap-2 hover:bg-gray-50"
        >
          <ArrowLeft size={14} /> Back to Queue
        </Button>
      </div>

      {/* Main Details Panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
        {/* Left main info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-gray-100 pb-4 mb-4">
              <div>
                <h1 className="text-lg font-bold text-[#0a174e]">{report?.title || "Expense Report Details"}</h1>
                <p className="text-xs text-gray-400 font-mono mt-1">{report?.reportNumber || "—"}</p>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-md text-xs">
                  <span className="text-gray-400 font-medium">Status:</span>
                  <StatusBadge label={reportStatus} size="sm" />
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-md text-xs">
                  <span className="text-gray-400 font-medium">Payment:</span>
                  <StatusBadge label={paymentRoutingStatus} size="sm" />
                </div>
              </div>
            </div>

            {/* Fields Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailField icon={<User size={16} />} label="Employee ID" value={report?.employeeId} />
              <DetailField icon={<Briefcase size={16} />} label="Cost Center" value={report?.costCenterName} />
              <DetailField icon={<FileText size={16} />} label="Business Purpose" value={report?.businessPurpose} />
              <DetailField icon={<Calendar size={16} />} label="Approved Date" value={formatDate(report?.approvedAt)} />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-4">
              <div className="p-2 rounded-lg bg-indigo-50 text-[#0A0082]">
                <Receipt size={16} />
              </div>
              <h2 className="text-base font-bold text-gray-900">Report Line Items</h2>
            </div>

            {tableRows.length === 0 ? (
              <PageCard>
                <PageCardContent className="flex flex-col items-center justify-center text-center py-12">
                  <Layers className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm font-semibold text-gray-600">No line items inside this report.</p>
                </PageCardContent>
              </PageCard>
            ) : (
              <div className="w-full overflow-x-auto rounded-lg">
                <GenericTable headers={headers} rows={tableRows} columns={columns} />
              </div>
            )}
          </div>
        </div>

        {/* Right Summary and Payment Confirmation Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Summary Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
              <Wallet className="h-5 w-5 text-blue-700" />
              <h2 className="text-base font-bold text-gray-900">Payment Summary</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                <span className="text-gray-500 font-medium">Approved Amount:</span>
                <span className="font-bold text-gray-800">
                  {formatAmount(report?.totalAmount)} {report?.currencyCode}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                <span className="text-gray-500 font-medium">Reimbursable Amount:</span>
                <span className="font-bold text-emerald-600">
                  {formatAmount(report?.reimbursableAmount)} {report?.currencyCode}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Routing Status:</span>
                <span className="font-bold uppercase tracking-wider text-xs">
                  {paymentRoutingStatus.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Action Area */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              {paymentRoutingStatus === "APPROVED_FOR_PAYMENT" ? (
                <Button
                  onClick={() => setIsConfirmOpen(true)}
                  variant="primary"
                  className="w-full shadow-md py-3 text-sm font-semibold flex items-center justify-center gap-2"
                  disabled={submitting}
                  loading={submitting}
                  loadingText="Processing..."
                >
                  <CheckCircle2 size={16} />
                  Mark Payment Completed
                </Button>
              ) : (
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-center">
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-600 mb-2">
                    <CheckCircle2 size={18} />
                  </div>
                  <p className="text-xs text-gray-500 font-medium">
                    Payment status for this report is currently:
                  </p>
                  <p className="text-sm font-bold text-green-700 mt-1">
                    {paymentRoutingStatus.replace(/_/g, " ")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Relevant Approval Level Information */}
          {approvalStatus && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
                <Lock className="h-5 w-5 text-indigo-700" />
                <h2 className="text-base font-bold text-gray-900">Approval Workflow</h2>
              </div>
              
              <div className="space-y-2.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-500">Current Level Status:</span>
                  <span className="font-semibold text-gray-800">{approvalStatus.currentLevelName || "Fully Approved"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-500">Approver Role/Name:</span>
                  <span className="font-semibold text-gray-800">{approvalStatus.currentLevelDisplayName || "Finance/Verification Passed"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-500">Completed Steps:</span>
                  <span className="font-semibold text-gray-800">
                    {approvalStatus.currentLevelOrder !== null ? approvalStatus.currentLevelOrder : approvalStatus.totalLevels} / {approvalStatus.totalLevels || 0}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        title="Confirm Payment Completion"
        message="Confirm that the external payment has been completed for this expense?"
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={handleMarkCompleted}
        onCancel={() => setIsConfirmOpen(false)}
        isLoading={submitting}
        variant="primary"
      />
    </div>
  );
}
