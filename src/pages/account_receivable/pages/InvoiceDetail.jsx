import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FileText,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  DollarSign,
  Clock,
  Briefcase,
  CheckCircle2,
  Send,
  ThumbsUp,
  XCircle,
} from "lucide-react";

import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import Loader from "../../../components/ui/Loader";
import StatusBadge from "../../../components/status/statusbadge";
import Breadcrumb from "../../../components/Breadcrumb/Breadcrumb";
import Modal from "../../../components/Modal/modal";
import { showStatusToast } from "../../../components/toastfy/toast";
import { formatCurrency, formatDisplayDate, formatDisplayDateTime } from "../utils/format";
import {
  getInvoice,
  submitInvoiceForApproval,
  approveInvoice,
  rejectInvoice,
  refreshInvoiceAfterCorrection,
  getInvoiceApprovalHistory,
  getInvoiceErrorMessage,
} from "../services/invoiceService";
import { formatBillingPeriod } from "../services/billingDataAcquisitionService";

const TAX_WORKSPACE_PATH = "/account-receivable/tax-calculation";
const INVOICE_WORKSPACE_PATH = "/account-receivable/invoice-generation";
const INVOICE_APPROVAL_PATH = "/account-receivable/invoice-approval";

const formatRatePercentage = (rate) => {
  if (rate === null || rate === undefined || rate === "") return null;
  const num = Number(rate);
  if (Number.isNaN(num)) return null;
  return `${num.toFixed(2)}%`;
};

const APPLICABILITY_LABELS = {
  SAME_JURISDICTION: "Same Jurisdiction",
  DIFFERENT_JURISDICTION: "Different Jurisdiction",
  ALL: "All Jurisdictions",
};

const humanizeApplicability = (value) => {
  if (!value) return "Not specified";
  if (APPLICABILITY_LABELS[value]) return APPLICABILITY_LABELS[value];
  return String(value)
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

function Field({ label, children, emptyLabel = "Not provided" }) {
  const content = children || emptyLabel;
  const isDefaultEmpty = !children || children === "—";
  return (
    <div>
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span
        className={`mt-0.5 block truncate text-sm ${
          isDefaultEmpty ? "text-slate-400 italic" : "font-semibold text-slate-800"
        }`}
        title={typeof children === "string" ? children : undefined}
      >
        {content}
      </span>
    </div>
  );
}

export default function InvoiceDetail() {
  const { snapshotId } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isResubmitOpen, setIsResubmitOpen] = useState(false);
  const [isRefreshModalOpen, setIsRefreshModalOpen] = useState(false);
  const [refreshingAfterCorrection, setRefreshingAfterCorrection] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  const latestRejectionReason = useMemo(() => {
    if (invoice?.rejectionReason) return invoice.rejectionReason;
    if (!Array.isArray(approvalHistory) || approvalHistory.length === 0) return "";
    const rejectedRecords = approvalHistory.filter(
      (h) =>
        (h.action || "").toUpperCase() === "REJECTED" ||
        (h.newStatus || "").toUpperCase() === "REJECTED"
    );
    if (rejectedRecords.length === 0) return "";
    const latest = rejectedRecords[rejectedRecords.length - 1];
    return latest.comment || "";
  }, [invoice, approvalHistory]);

  const loadApprovalHistory = async (invoiceId) => {
    if (!invoiceId) return;
    try {
      const history = await getInvoiceApprovalHistory(invoiceId);
      setApprovalHistory(history || []);
    } catch (err) {
      console.warn("[InvoiceDetail] Could not load approval history:", err);
      setApprovalHistory([]);
    }
  };

  const loadInvoice = async (isManual = false) => {
    if (!snapshotId) {
      setErrorMsg("No Billing Snapshot identifier provided.");
      setLoading(false);
      return;
    }

    if (isManual) setRefreshing(true);
    else setLoading(true);
    setErrorMsg("");

    try {
      const data = await getInvoice(snapshotId);
      if (data) {
        setInvoice(data);
        if (data.invoiceId) {
          try {
            await loadApprovalHistory(data.invoiceId);
          } catch (histErr) {
            console.warn("[InvoiceDetail] Non-blocking approval history error:", histErr);
          }
        }
        if (isManual) {
          showStatusToast("Invoice details refreshed.", "success");
        }
      } else {
        setErrorMsg("Invoice data could not be retrieved from the billing service.");
      }
    } catch (err) {
      console.error("[InvoiceDetail] Error loading invoice:", err);
      const msg = getInvoiceErrorMessage(err, "Failed to load invoice. Please verify that tax calculation was completed.");
      setErrorMsg(msg);
      showStatusToast(msg, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!invoice?.invoiceId || submitting) return;
    setSubmitting(true);
    try {
      const updated = await submitInvoiceForApproval(invoice.invoiceId);
      showStatusToast("Invoice submitted for approval successfully.", "success");
      if (updated) {
        setInvoice((prev) => ({
          ...prev,
          invoiceStatus: updated.invoiceStatus || "PENDING_APPROVAL",
        }));
      }
      await loadInvoice(false);
    } catch (err) {
      console.error("[InvoiceDetail] Error submitting invoice for approval:", err);
      const msg = getInvoiceErrorMessage(err, "Failed to submit invoice for approval.");
      showStatusToast(msg, "error");
      // Refresh to ensure state is synchronized with backend
      await loadInvoice(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!invoice?.invoiceId || approving) return;
    setApproving(true);
    setIsConfirmOpen(false);
    try {
      const updated = await approveInvoice(invoice.invoiceId);
      showStatusToast("Invoice approved successfully.", "success");
      if (updated) {
        setInvoice((prev) => ({
          ...prev,
          invoiceStatus: updated.invoiceStatus || "APPROVED",
        }));
      }
      await loadInvoice(false);
    } catch (err) {
      console.error("[InvoiceDetail] Error approving invoice:", err);
      const msg = getInvoiceErrorMessage(err, "Failed to approve invoice.");
      showStatusToast(msg, "error");
      // Refresh to ensure state is synchronized with backend
      await loadInvoice(false);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    const trimmed = (rejectionReason || "").trim();
    if (!trimmed) {
      setRejectError("Rejection reason is required.");
      return;
    }
    if (trimmed.length > 500) {
      setRejectError("Rejection reason cannot exceed 500 characters.");
      return;
    }

    if (!invoice?.invoiceId || rejecting) return;
    setRejecting(true);
    setRejectError("");
    try {
      const updated = await rejectInvoice(invoice.invoiceId, trimmed);
      setIsRejectOpen(false);
      setRejectionReason("");
      showStatusToast("Invoice rejected successfully.", "success");
      if (updated) {
        setInvoice((prev) => ({
          ...prev,
          ...updated,
          invoiceStatus: updated.invoiceStatus || "REJECTED",
          rejectionReason: trimmed,
        }));
      }
      await loadInvoice(false);
    } catch (err) {
      console.error("[InvoiceDetail] Error rejecting invoice:", err);
      const msg = getInvoiceErrorMessage(err, "Failed to reject invoice.");
      setRejectError(msg);
      showStatusToast(msg, "error");
      await loadInvoice(false);
    } finally {
      setRejecting(false);
    }
  };

  const handleResubmit = async () => {
    if (!invoice?.invoiceId || submitting) return;
    setSubmitting(true);
    setIsResubmitOpen(false);
    try {
      const updated = await submitInvoiceForApproval(invoice.invoiceId);
      showStatusToast("Invoice resubmitted for approval.", "success");
      if (updated) {
        setInvoice((prev) => ({
          ...prev,
          ...updated,
          invoiceStatus: updated.invoiceStatus || "PENDING_APPROVAL",
        }));
      }
      await loadInvoice(false);
    } catch (err) {
      console.error("[InvoiceDetail] Error resubmitting invoice for approval:", err);
      const msg = getInvoiceErrorMessage(err, "Failed to resubmit invoice for approval.");
      showStatusToast(msg, "error");
      await loadInvoice(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefreshAfterCorrection = async () => {
    if (!invoice?.invoiceId || refreshingAfterCorrection) return;
    setRefreshingAfterCorrection(true);
    try {
      const updated = await refreshInvoiceAfterCorrection(invoice.invoiceId);
      setIsRefreshModalOpen(false);
      showStatusToast("Invoice refreshed successfully. It is ready for resubmission.", "success");
      if (updated) {
        setInvoice((prev) => ({
          ...prev,
          ...updated,
          invoiceStatus: updated.invoiceStatus || "REJECTED",
        }));
      }
      await loadInvoice(false);
    } catch (err) {
      console.error("[InvoiceDetail] Error refreshing invoice after correction:", err);
      const msg = getInvoiceErrorMessage(err, "Failed to refresh invoice after correction.");
      showStatusToast(msg, "error");
    } finally {
      setRefreshingAfterCorrection(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [snapshotId]);

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader size="lg" text="Loading authoritative invoice details..." />
      </div>
    );
  }

  if (errorMsg && !invoice) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <Breadcrumb
          items={[
            { label: "Billing Data Acquisition", to: "/account-receivable/billing-data-acquisition" },
            { label: "Tax Calculation", to: TAX_WORKSPACE_PATH },
            { label: "Invoice" },
          ]}
        />

        <PageCard>
          <PageCardContent className="p-10 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-slate-800">Invoice Unavailable</h3>
              <p className="text-sm text-slate-600">{errorMsg}</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-3">
              <Button
                variant="outline"
                size="small"
                onClick={() => navigate(TAX_WORKSPACE_PATH)}
                className="text-xs"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Tax Workspace
              </Button>
              {snapshotId && (
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => navigate(`/account-receivable/tax-calculation/${snapshotId}`)}
                  className="text-xs"
                >
                  Go to Tax Calculation
                </Button>
              )}
              <Button
                variant="primary"
                size="small"
                onClick={() => loadInvoice(true)}
                className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white text-xs font-semibold"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          </PageCardContent>
        </PageCard>
      </div>
    );
  }

  const currency = invoice?.currency || "USD";
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const taxBreakdown = Array.isArray(invoice?.taxBreakdown) ? invoice.taxBreakdown : [];

  // Actual snapshot billing period from backend data
  const billingPeriod =
    invoice?.billingPeriod ||
    (invoice?.billingPeriodStart && invoice?.billingPeriodEnd
      ? formatBillingPeriod(invoice.billingPeriodStart, invoice.billingPeriodEnd)
      : "—");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Billing Data Acquisition", to: "/account-receivable/billing-data-acquisition" },
          { label: "Tax Calculation", to: TAX_WORKSPACE_PATH },
          { label: "Invoice" },
          { label: invoice?.invoiceNumber || invoice?.snapshotNumber || snapshotId },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Invoice</h1>
            <StatusBadge label={invoice?.invoiceStatus || "GENERATED"} size="sm" />
          </div>
          <p className="text-sm text-slate-600">
            Invoice Number:{" "}
            <span className="ml-1 font-mono font-bold text-indigo-700">
              {invoice?.invoiceNumber || "—"}
            </span>
            {invoice?.snapshotNumber && (
              <>
                <span className="mx-2 text-slate-300">&middot;</span>
                <span className="text-xs text-slate-500">
                  Snapshot <span className="font-mono font-semibold text-slate-700">{invoice.snapshotNumber}</span>
                </span>
              </>
            )}
          </p>
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{invoice?.projectName || "Website Redesign"}</span>
            {invoice?.clientName && (
              <>
                <span className="mx-1.5 text-slate-300">&middot;</span>
                {invoice.clientName}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Action: Submit for Approval (for GENERATED invoices) */}
          {(invoice?.invoiceStatus === "GENERATED" || !invoice?.invoiceStatus) && (
            <Button
              variant="primary"
              size="small"
              onClick={handleSubmitForApproval}
              disabled={submitting || refreshing}
              className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white flex items-center gap-1.5 text-xs font-semibold"
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? "Submitting..." : "Submit for Approval"}
            </Button>
          )}

          {/* Actions: Approve & Reject (for PENDING_APPROVAL invoices) */}
          {invoice?.invoiceStatus === "PENDING_APPROVAL" && (
            <>
              <Button
                variant="primary"
                size="small"
                onClick={() => setIsConfirmOpen(true)}
                disabled={approving || rejecting || refreshing}
                className="bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 text-xs font-semibold"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                {approving ? "Approving..." : "Approve"}
              </Button>

              <Button
                variant="outline"
                size="small"
                onClick={() => {
                  setRejectionReason("");
                  setRejectError("");
                  setIsRejectOpen(true);
                }}
                disabled={approving || rejecting || refreshing}
                className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:border-rose-400 flex items-center gap-1.5 text-xs font-semibold"
              >
                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                Reject Invoice
              </Button>
            </>
          )}

          {/* Action: Resubmit for Approval / Refresh Invoice (for REJECTED invoices) */}
          {invoice?.invoiceStatus === "REJECTED" && (
            invoice?.correctionRequired === false ? (
              <Button
                variant="primary"
                size="small"
                onClick={() => setIsResubmitOpen(true)}
                disabled={submitting || refreshing || refreshingAfterCorrection}
                className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white flex items-center gap-1.5 text-xs font-semibold"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? "Submitting..." : "Resubmit for Approval"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="small"
                onClick={() => setIsRefreshModalOpen(true)}
                disabled={refreshing || refreshingAfterCorrection}
                className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 flex items-center gap-1.5 text-xs font-semibold"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshingAfterCorrection ? "animate-spin" : ""}`} />
                {refreshingAfterCorrection ? "Refreshing..." : "Refresh Invoice"}
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="small"
            onClick={() => navigate(INVOICE_APPROVAL_PATH)}
            className="flex items-center gap-1.5 text-xs text-slate-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Invoice Approval Queue
          </Button>

          <Button
            variant="outline"
            size="small"
            onClick={() => navigate(INVOICE_WORKSPACE_PATH)}
            className="flex items-center gap-1.5 text-xs text-slate-600"
          >
            Invoice Workspace
          </Button>

          {snapshotId && (
            <Button
              variant="outline"
              size="small"
              onClick={() => navigate(`/account-receivable/tax-calculation/${snapshotId}`)}
              className="flex items-center gap-1.5 text-xs text-slate-600"
            >
              Tax Calculation
            </Button>
          )}

          <Button
            variant="outline"
            size="small"
            onClick={() => loadInvoice(true)}
            disabled={refreshing || submitting || approving || rejecting || refreshingAfterCorrection}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Correction Required Section (Section 2 & 3 - Phase 2B) */}
      {invoice?.invoiceStatus === "REJECTED" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-rose-200/80 pb-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-base font-bold text-rose-950">Correction Required</h2>
                  <StatusBadge label="REJECTED" size="sm" />
                  {invoice.correctionRequired ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      Correction Required
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Ready to Resubmit
                    </span>
                  )}
                </div>
                <p className="text-xs text-rose-800">
                  {invoice.correctionRequired
                    ? "This invoice was rejected and requires correction before it can be resubmitted. Financial corrections must be made through the source billing/tax workflow rather than directly on the invoice."
                    : "The invoice has been refreshed from the latest billing and tax data and is ready for resubmission."}
                </p>
                {invoice.lastCorrectedAt && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    Last refreshed: {formatDisplayDateTime(invoice.lastCorrectedAt)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0 pt-1 sm:pt-0">
              {snapshotId && (
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => navigate(`/account-receivable/tax-calculation/${snapshotId}`)}
                  className="text-xs bg-white text-rose-700 border-rose-300 hover:bg-rose-100/50 font-medium"
                >
                  Review Tax Calculation
                </Button>
              )}

              <Button
                variant="outline"
                size="small"
                onClick={() => setIsRefreshModalOpen(true)}
                disabled={refreshing || refreshingAfterCorrection}
                className="text-xs bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-medium flex items-center gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshingAfterCorrection ? "animate-spin" : ""}`} />
                {refreshingAfterCorrection ? "Refreshing..." : "Refresh Invoice"}
              </Button>

              {invoice.correctionRequired === false ? (
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => setIsResubmitOpen(true)}
                  disabled={submitting || refreshing || refreshingAfterCorrection}
                  className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Resubmitting..." : "Resubmit for Approval"}
                </Button>
              ) : (
                <span
                  className="text-[11px] font-medium text-slate-500 italic px-2.5 py-1.5 bg-slate-100 rounded border border-slate-200"
                  title="Resubmission unavailable until correction is completed."
                >
                  Resubmission unavailable until correction is completed.
                </span>
              )}
            </div>
          </div>

          {/* Context Details: Invoice Number, Current Status, Rejection Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-rose-200/70 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Invoice Number:</span>
                <span className="font-mono font-bold text-indigo-700">{invoice?.invoiceNumber || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Current Status:</span>
                <StatusBadge label="REJECTED" size="sm" />
              </div>
              {invoice?.lastCorrectedAt && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
                  <span className="text-slate-500 font-medium">Last Refreshed:</span>
                  <span className="font-medium text-slate-700">{formatDisplayDateTime(invoice.lastCorrectedAt)}</span>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-rose-200/70 bg-white p-3 space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-600">
                Rejection Reason
              </span>
              <p className="mt-1 text-sm font-medium text-slate-800 italic">
                "{latestRejectionReason || "No specific rejection reason recorded."}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Invoice Card */}
      <PageCard className="divide-y divide-slate-100">
        {/* Section 1: BILL TO */}
        <div className="p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Building2 className="h-3.5 w-3.5 text-indigo-600" /> Bill To
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Client Name">{invoice?.clientName}</Field>
            <Field label="Billing Address">{invoice?.billingAddress}</Field>
            <Field label="GSTIN / Tax ID">{invoice?.gstin}</Field>
            <Field label="Contact">{invoice?.contact}</Field>
          </div>
        </div>

        {/* Section 2: INVOICE CONTEXT */}
        <div className="p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Briefcase className="h-3.5 w-3.5 text-indigo-600" /> Invoice Context
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Field label="Project">
              {invoice?.projectName || "—"}
            </Field>
            <Field label="Project Code">
              <span className="font-mono">{invoice?.projectCode || "—"}</span>
            </Field>
            <Field label="Actual Billing Period">
              <span className="font-medium text-slate-900">{billingPeriod}</span>
            </Field>
            <Field label="Currency">
              <span className="font-mono font-bold text-slate-800">{currency}</span>
            </Field>
            <Field label="Payment Terms">
              {invoice?.paymentTerms || "Net 30"}
            </Field>
            <Field label="Invoice Date">
              {formatDisplayDate(invoice?.invoiceDate)}
            </Field>
            <Field label="Due Date">
              {formatDisplayDate(invoice?.dueDate)}
            </Field>
            <Field label="Snapshot Number">
              <span className="font-mono">{invoice?.snapshotNumber || "—"}</span>
            </Field>
            <Field label="Invoice Number">
              <span className="font-mono font-semibold text-indigo-800">{invoice?.invoiceNumber || "—"}</span>
            </Field>
          </div>
        </div>

        {/* Section 3: INVOICE ITEMS */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <FileText className="h-3.5 w-3.5 text-indigo-600" /> Invoice Items
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {items.length} {items.length === 1 ? "Line Item" : "Line Items"}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-6 text-center text-xs text-slate-500">
              No individual invoice items returned by the backend.
            </div>
          ) : (
            <>
              {/* Desktop / Tablet Table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="pb-2 pr-3 font-bold">Resource / Item</th>
                      <th className="pb-2 px-3 font-bold">Role</th>
                      <th className="pb-2 px-3 font-bold">Work Date</th>
                      <th className="pb-2 px-3 text-right font-bold">Quantity / Hours</th>
                      <th className="pb-2 px-3 text-right font-bold">Rate</th>
                      <th className="pb-2 pl-3 text-right font-bold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-3 pr-3 align-top font-semibold text-slate-800">
                          {it.itemName || it.item || "—"}
                        </td>
                        <td className="py-3 px-3 align-top text-slate-600">
                          {it.role}
                        </td>
                        <td className="py-3 px-3 align-top font-mono text-xs text-slate-600">
                          {formatDisplayDate(it.workDate)}
                        </td>
                        <td className="py-3 px-3 align-top text-right font-mono font-medium text-slate-700">
                          {it.quantity}
                        </td>
                        <td className="py-3 px-3 align-top text-right font-mono font-medium text-slate-700">
                          {formatCurrency(it.rate, currency)}
                        </td>
                        <td className="py-3 pl-3 align-top text-right font-mono font-bold text-slate-900">
                          {formatCurrency(it.amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Cards */}
              <div className="space-y-2.5 sm:hidden">
                {items.map((it) => (
                  <div key={it.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-800">{it.itemName || it.item || "—"}</span>
                      <span className="shrink-0 font-mono font-bold text-slate-900">
                        {formatCurrency(it.amount, currency)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span>{it.role}</span>
                      <span>&middot;</span>
                      <span className="font-mono">{formatDisplayDate(it.workDate)}</span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-200 pt-2 text-xs text-slate-600">
                      <span>
                        {it.quantity} hrs @ {formatCurrency(it.rate, currency)}
                      </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {formatCurrency(it.amount, currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Section 4: TAX BREAKDOWN */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Layers className="h-3.5 w-3.5 text-indigo-600" /> Tax Breakdown
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {taxBreakdown.length} {taxBreakdown.length === 1 ? "Component" : "Components"}
            </span>
          </div>

          {taxBreakdown.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-500">
              No tax components applicable for this invoice.
            </div>
          ) : (
            <>
              {/* Desktop / Tablet Table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="pb-2 pr-3 font-bold">Tax Component</th>
                      <th className="pb-2 px-3 font-bold">Applicability</th>
                      <th className="pb-2 px-3 text-right font-bold">Rate</th>
                      <th className="pb-2 pl-3 text-right font-bold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {taxBreakdown.map((comp) => (
                      <tr key={comp.id}>
                        <td className="py-3 pr-3 align-top font-semibold text-slate-800">
                          {comp.taxComponent}
                          {comp.taxTypeCode && (
                            <span className="ml-2 inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                              {comp.taxTypeCode}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 align-top text-slate-600">
                          {humanizeApplicability(comp.applicability)}
                        </td>
                        <td className="py-3 px-3 align-top text-right font-mono font-semibold text-slate-700">
                          {formatRatePercentage(comp.rate) ?? "—"}
                        </td>
                        <td className="py-3 pl-3 align-top text-right font-mono font-bold text-slate-900">
                          {formatCurrency(comp.amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Cards */}
              <div className="space-y-2.5 sm:hidden">
                {taxBreakdown.map((comp) => (
                  <div key={comp.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-800">{comp.taxComponent}</span>
                      {comp.taxTypeCode && (
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                          {comp.taxTypeCode}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {humanizeApplicability(comp.applicability)}
                    </div>
                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-200 pt-2.5">
                      <span className="text-xs text-slate-500">Rate</span>
                      <span className="font-mono font-semibold text-slate-700">
                        {formatRatePercentage(comp.rate) ?? "—"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Amount</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(comp.amount, currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Section 5: FINANCIAL SUMMARY */}
        <div className="p-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Financial Summary</h2>
          <div className="max-w-md space-y-2 text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono font-semibold text-slate-800">
                {formatCurrency(invoice?.subtotal, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Total Tax</span>
              <span className="font-mono font-semibold text-slate-800">
                {formatCurrency(invoice?.totalTax, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
              <span>Grand Total</span>
              <span className="font-mono text-base text-indigo-900">
                {formatCurrency(invoice?.grandTotal, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Grand Total Hero Display */}
        <div className="p-5">
          <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/80 p-4 sm:p-5 flex items-center justify-between shadow-sm">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-indigo-700">Grand Total</span>
              <span className="text-xs text-indigo-600">Subtotal + Total Tax</span>
            </div>
            <div className="font-mono text-2xl font-extrabold text-indigo-950 sm:text-3xl">
              {formatCurrency(invoice?.grandTotal, currency)}
            </div>
          </div>
        </div>
      </PageCard>

      {/* Authoritative Record Notice */}
      <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <ShieldCheck className="h-4 w-4 flex-shrink-0 text-emerald-600" />
        <p>
          <span className="font-semibold text-slate-700">Authoritative Financial Record.</span>{" "}
          Invoice amounts and tax breakdowns are generated by the backend financial engine and are read-only for this billing snapshot.
        </p>
      </div>

      {/* Confirmation Modal for Approve */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => !approving && setIsConfirmOpen(false)}
        title="Approve Invoice"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to approve this invoice?
          </p>
          <div className="rounded-lg bg-slate-50 p-3 text-xs space-y-1 text-slate-600">
            <div>
              <span className="font-semibold">Invoice Number:</span>{" "}
              <span className="font-mono text-indigo-700 font-bold">{invoice?.invoiceNumber || "—"}</span>
            </div>
            <div>
              <span className="font-semibold">Grand Total:</span>{" "}
              <span className="font-mono font-bold text-slate-800">
                {formatCurrency(invoice?.grandTotal, currency)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="small"
              onClick={() => setIsConfirmOpen(false)}
              disabled={approving}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={handleApprove}
              disabled={approving}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
            >
              {approving ? "Approving..." : "Yes, Approve Invoice"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Reject Invoice (Section 3) */}
      <Modal
        isOpen={isRejectOpen}
        onClose={() => !rejecting && setIsRejectOpen(false)}
        title="Reject Invoice"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Please provide the rejection reason for this invoice. The rejection reason is mandatory and will be recorded for audit and correction tracking.
          </p>

          {/* Basic Invoice Context */}
          <div className="rounded-lg bg-slate-50 p-3.5 text-xs space-y-1.5 border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Invoice Number:</span>
              <span className="font-mono font-bold text-indigo-700">{invoice?.invoiceNumber || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Client:</span>
              <span className="font-semibold text-slate-800">{invoice?.clientName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Project:</span>
              <span className="font-semibold text-slate-800">{invoice?.projectName || "—"}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5">
              <span className="text-slate-700 font-bold">Grand Total:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(invoice?.grandTotal, currency)}
              </span>
            </div>
          </div>

          {/* Rejection Reason Input */}
          <div className="space-y-1.5">
            <label htmlFor="rejection-reason" className="block text-xs font-bold text-slate-700">
              Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="rejection-reason"
              rows={4}
              value={rejectionReason}
              onChange={(e) => {
                const val = e.target.value;
                setRejectionReason(val);
                if (val.length > 500) {
                  setRejectError("Rejection reason cannot exceed 500 characters.");
                } else {
                  setRejectError("");
                }
              }}
              placeholder="Enter the reason for rejecting this invoice..."
              className={`w-full rounded-lg border p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 ${
                rejectError
                  ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
              }`}
              disabled={rejecting}
            />
            <div className="flex items-center justify-between text-xs">
              <div>
                {rejectError && <span className="text-rose-600 font-medium">{rejectError}</span>}
              </div>
              <span className={rejectionReason.length > 500 ? "text-rose-600 font-bold" : "text-slate-400"}>
                {rejectionReason.length}/500
              </span>
            </div>
          </div>

          {/* Modal Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="small"
              onClick={() => setIsRejectOpen(false)}
              disabled={rejecting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={handleReject}
              disabled={
                rejecting ||
                !rejectionReason.trim() ||
                rejectionReason.length > 500
              }
              className="bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rejecting ? "Rejecting..." : "Reject Invoice"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Resubmit Invoice (Section 7) */}
      <Modal
        isOpen={isResubmitOpen}
        onClose={() => !submitting && setIsResubmitOpen(false)}
        title="Resubmit Invoice for Approval"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            The invoice has been refreshed from the latest billing and tax data. Are you sure you want to resubmit it for approval?
          </p>

          <div className="rounded-lg bg-slate-50 p-3.5 text-xs space-y-1.5 border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Invoice Number:</span>
              <span className="font-mono font-bold text-indigo-700">{invoice?.invoiceNumber || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Client:</span>
              <span className="font-semibold text-slate-800">{invoice?.clientName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Project:</span>
              <span className="font-semibold text-slate-800">{invoice?.projectName || "—"}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5">
              <span className="text-slate-700 font-bold">Grand Total:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(invoice?.grandTotal, currency)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="small"
              onClick={() => setIsResubmitOpen(false)}
              disabled={submitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={handleResubmit}
              disabled={submitting}
              className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white text-xs font-semibold"
            >
              {submitting ? "Resubmitting..." : "Resubmit for Approval"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Refresh Invoice (Section 4 - Phase 2B) */}
      <Modal
        isOpen={isRefreshModalOpen}
        onClose={() => !refreshingAfterCorrection && setIsRefreshModalOpen(false)}
        title="Refresh Invoice"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-800">
            Refresh this invoice from the latest billing and tax data?
          </p>
          <p className="text-xs text-slate-600">
            The invoice will remain rejected, but its financial details will be refreshed from the authoritative billing and tax data. You can resubmit it for approval afterward.
          </p>

          <div className="rounded-lg bg-slate-50 p-3.5 text-xs space-y-1.5 border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Invoice Number:</span>
              <span className="font-mono font-bold text-indigo-700">{invoice?.invoiceNumber || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Status:</span>
              <StatusBadge label="REJECTED" size="sm" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="small"
              onClick={() => setIsRefreshModalOpen(false)}
              disabled={refreshingAfterCorrection}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={handleRefreshAfterCorrection}
              disabled={refreshingAfterCorrection}
              className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshingAfterCorrection ? "animate-spin" : ""}`} />
              {refreshingAfterCorrection ? "Refreshing..." : "Refresh Invoice"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
