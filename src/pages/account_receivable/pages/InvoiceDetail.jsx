import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  Edit3,
  Save,
  MailCheck,
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
  correctNonFinancialInvoice,
  financialCorrectionReacquire,
  getInvoiceApprovalHistory,
  getInvoiceErrorMessage,
} from "../services/invoiceService";
import { formatBillingPeriod } from "../services/billingDataAcquisitionService";
import {
  DEMO_SELLER,
  DEMO_CLIENT,
  DEMO_PROJECT,
  DEMO_TAX_CONTEXT,
  DEMO_TERMS,
  DEMO_DELIVERY_STATUS,
  DEMO_SENT_BY,
  getDemoDelivery,
  saveDemoDelivery,
} from "../utils/invoiceDemoData";

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
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Source tracking: determines if invoice is being inspected from Tax Calculation vs Invoice Generation
  const source =
    searchParams.get("source") ||
    searchParams.get("from") ||
    location.state?.from ||
    location.state?.source ||
    "";
  const isFromTaxCalculation = source === "tax-calculation";

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

  // Phase 2C Non-Financial Correction state
  const [editClientName, setEditClientName] = useState("");
  const [editProjectName, setEditProjectName] = useState("");
  const [clientNameError, setClientNameError] = useState("");
  const [projectNameError, setProjectNameError] = useState("");
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [isEditingCorrection, setIsEditingCorrection] = useState(false);

  // Phase 2B Financial Correction state
  const [isReacquireModalOpen, setIsReacquireModalOpen] = useState(false);
  const [reacquiring, setReacquiring] = useState(false);

  // Demo: Send to Client delivery state (separate from invoice approval status)
  const [isSendToClientOpen, setIsSendToClientOpen] = useState(false);
  const [sendingToClient, setSendingToClient] = useState(false);
  const [deliveryState, setDeliveryState] = useState({
    deliveryStatus: DEMO_DELIVERY_STATUS.NOT_SENT,
    sentAt: null,
    sentBy: null,
  });

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
    if (invoice) {
      setEditClientName(invoice.clientName || "");
      setEditProjectName(invoice.projectName || "");
      setClientNameError("");
      setProjectNameError("");
      if (invoice.invoiceStatus === "REJECTED" && invoice.correctionRequired) {
        setIsEditingCorrection(true);
      } else {
        setIsEditingCorrection(false);
      }
    }
  }, [
    invoice?.clientName,
    invoice?.projectName,
    invoice?.invoiceId,
    invoice?.invoiceStatus,
    invoice?.correctionRequired,
  ]);

  const handleSaveCorrection = async () => {
    const trimmedClient = (editClientName || "").trim();
    const trimmedProject = (editProjectName || "").trim();

    let hasError = false;
    if (!trimmedClient) {
      setClientNameError("Client Name is required.");
      hasError = true;
    } else if (trimmedClient.length > 150) {
      setClientNameError("Client Name cannot exceed 150 characters.");
      hasError = true;
    } else {
      setClientNameError("");
    }

    if (!trimmedProject) {
      setProjectNameError("Project Name is required.");
      hasError = true;
    } else if (trimmedProject.length > 150) {
      setProjectNameError("Project Name cannot exceed 150 characters.");
      hasError = true;
    } else {
      setProjectNameError("");
    }

    if (hasError) return;

    if (!invoice?.invoiceId || savingCorrection) return;

    setSavingCorrection(true);
    try {
      const updated = await correctNonFinancialInvoice(invoice.invoiceId, {
        clientName: trimmedClient,
        projectName: trimmedProject,
      });
      showStatusToast("Non-financial correction saved successfully.", "success");
      if (updated) {
        setInvoice((prev) => ({
          ...prev,
          ...updated,
          invoiceStatus: updated.invoiceStatus || "REJECTED",
          correctionRequired: false,
        }));
      }
      setIsEditingCorrection(false);
      await loadInvoice(false);
    } catch (err) {
      console.error("[InvoiceDetail] Error saving non-financial correction:", err);
      const msg = getInvoiceErrorMessage(err, "Failed to save invoice correction.");
      showStatusToast(msg, "error");
      await loadInvoice(false);
    } finally {
      setSavingCorrection(false);
    }
  };

  const handleResetCorrection = () => {
    setEditClientName(invoice?.clientName || "");
    setEditProjectName(invoice?.projectName || "");
    setClientNameError("");
    setProjectNameError("");
    if (!invoice?.correctionRequired) {
      setIsEditingCorrection(false);
    }
  };

  const handleFinancialReacquire = async () => {
    if (!invoice?.invoiceId || reacquiring) return;
    setReacquiring(true);
    try {
      const updated = await financialCorrectionReacquire(invoice.invoiceId);
      setIsReacquireModalOpen(false);
      showStatusToast("Financial data re-acquired and invoice recalculated successfully.", "success");
      if (updated) {
        setInvoice(updated);
      } else {
        await loadInvoice(false);
      }
    } catch (err) {
      console.error("[InvoiceDetail] Error re-acquiring financial data:", err);
      const msg = getInvoiceErrorMessage(err, "Failed to re-acquire financial data.");
      showStatusToast(msg, "error");
    } finally {
      setReacquiring(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [snapshotId]);

  // Load demo delivery state from localStorage once invoice (and invoiceId) is known
  useEffect(() => {
    if (invoice?.invoiceId) {
      const stored = getDemoDelivery(invoice.invoiceId);
      setDeliveryState(stored);
    }
  }, [invoice?.invoiceId]);

  /**
   * Demo Send to Client action.
   * No email is sent. No backend API is called.
   * Only the localStorage-based delivery state is updated.
   */
  const handleSendToClient = () => {
    if (!invoice?.invoiceId || sendingToClient) return;
    setSendingToClient(true);
    // Simulate a brief async handoff
    setTimeout(() => {
      const entry = {
        deliveryStatus: DEMO_DELIVERY_STATUS.SENT_TO_CLIENT,
        sentAt: new Date().toISOString(),
        sentBy: DEMO_SENT_BY,
      };
      saveDemoDelivery(invoice.invoiceId, entry);
      setDeliveryState(entry);
      setIsSendToClientOpen(false);
      setSendingToClient(false);
      showStatusToast(
        `Invoice ${invoice.invoiceNumber || invoice.invoiceId} marked as sent to client.`,
        "success"
      );
    }, 800);
  };

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
            { label: "Billing Data Acquisition", to: "/account-receivable/billing-data-acquisition/workspace" },
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
      : DEMO_TERMS.billingPeriod);

  const projectName =
    invoice?.projectName ||
    DEMO_PROJECT.name;

  const projectCode =
    invoice?.projectCode ||
    (invoice?.projectId ? `PRJ-${invoice.projectId}` : null) ||
    DEMO_PROJECT.code;

  const clientName =
    invoice?.clientName ||
    DEMO_CLIENT.legalName;

  const effectiveTaxBreakdown =
    taxBreakdown.length > 0
      ? taxBreakdown
      : invoice?.totalTax && invoice.totalTax > 0
      ? [
          {
            id: "demo-cgst",
            taxComponent: "Central Goods and Services Tax",
            taxTypeCode: "CGST",
            applicability: "SAME_JURISDICTION",
            rate: 9.0,
            amount: invoice.totalTax / 2,
          },
          {
            id: "demo-sgst",
            taxComponent: "State Goods and Services Tax",
            taxTypeCode: "SGST",
            applicability: "SAME_JURISDICTION",
            rate: 9.0,
            amount: invoice.totalTax / 2,
          },
        ]
      : [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {/* Breadcrumb */}
      <Breadcrumb
        items={
          isFromTaxCalculation
            ? [
                { label: "Billing Data Acquisition", to: "/account-receivable/billing-data-acquisition/workspace" },
                { label: "Tax Calculation", to: snapshotId ? `/account-receivable/tax-calculation/${snapshotId}` : TAX_WORKSPACE_PATH },
                { label: "Invoice" },
                { label: invoice?.invoiceNumber || invoice?.snapshotNumber || snapshotId },
              ]
            : [
                { label: "Billing Data Acquisition", to: "/account-receivable/billing-data-acquisition/workspace" },
                { label: "Invoice Generation", to: INVOICE_WORKSPACE_PATH },
                { label: "Invoice" },
                { label: invoice?.invoiceNumber || invoice?.snapshotNumber || snapshotId },
              ]
        }
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
          {/* Action: Send to Client (for APPROVED invoices — demo delivery action) */}
          {invoice?.invoiceStatus === "APPROVED" && (
            <Button
              variant="primary"
              size="small"
              onClick={() => setIsSendToClientOpen(true)}
              disabled={sendingToClient || refreshing}
              className="bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-1.5 text-xs font-semibold"
            >
              <MailCheck className="h-3.5 w-3.5" />
              {deliveryState.deliveryStatus === DEMO_DELIVERY_STATUS.SENT_TO_CLIENT
                ? "Sent to Client"
                : "Send to Client"}
            </Button>
          )}

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
                disabled={submitting || refreshing || refreshingAfterCorrection || savingCorrection || reacquiring}
                className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white flex items-center gap-1.5 text-xs font-semibold"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? "Resubmitting..." : "Resubmit for Approval"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="small"
                onClick={() => setIsRefreshModalOpen(true)}
                disabled={refreshing || refreshingAfterCorrection || savingCorrection || reacquiring}
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
            disabled={refreshing || submitting || approving || rejecting || refreshingAfterCorrection || savingCorrection || reacquiring}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Delivery Status Banner — APPROVED invoices only */}
      {invoice?.invoiceStatus === "APPROVED" && (
        <div
          className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
            deliveryState.deliveryStatus === DEMO_DELIVERY_STATUS.SENT_TO_CLIENT
              ? "border-teal-200 bg-teal-50/70"
              : "border-amber-200 bg-amber-50/60"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                deliveryState.deliveryStatus === DEMO_DELIVERY_STATUS.SENT_TO_CLIENT
                  ? "bg-teal-100 text-teal-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              <MailCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Invoice Delivery</span>
                {deliveryState.deliveryStatus === DEMO_DELIVERY_STATUS.SENT_TO_CLIENT ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                    Sent to Client
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Not Sent
                  </span>
                )}
              </div>
              {deliveryState.deliveryStatus === DEMO_DELIVERY_STATUS.SENT_TO_CLIENT ? (
                <div className="space-y-0.5 text-xs text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-700">Sent On: </span>
                    {deliveryState.sentAt
                      ? new Date(deliveryState.sentAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Sent By: </span>
                    {deliveryState.sentBy || DEMO_SENT_BY}
                  </p>
                  <p className="text-[11px] text-teal-600 italic">Demo delivery — no actual email was sent.</p>
                </div>
              ) : (
                <p className="text-xs text-slate-600">
                  Invoice is approved and ready to be sent to the client.
                </p>
              )}
            </div>
          </div>

          {deliveryState.deliveryStatus === DEMO_DELIVERY_STATUS.NOT_SENT ? (
            <Button
              variant="primary"
              size="small"
              onClick={() => setIsSendToClientOpen(true)}
              disabled={sendingToClient || refreshing}
              className="bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-1.5 text-xs font-semibold shrink-0"
            >
              <MailCheck className="h-3.5 w-3.5" />
              Send to Client
            </Button>
          ) : (
            <Button
              variant="outline"
              size="small"
              onClick={() => setIsSendToClientOpen(true)}
              disabled={sendingToClient || refreshing}
              className="border-teal-300 text-teal-700 hover:bg-teal-50 flex items-center gap-1.5 text-xs font-semibold shrink-0"
            >
              <MailCheck className="h-3.5 w-3.5" />
              Resend (Demo)
            </Button>
          )}
        </div>
      )}

      {/* Correction Section (Phase 2B & Phase 2C Non-Financial Correction) */}
      {invoice?.invoiceStatus === "REJECTED" && (
        <div
          className={`rounded-xl border p-5 space-y-4 shadow-sm ${
            invoice.correctionRequired
              ? "border-rose-200 bg-rose-50/70"
              : "border-emerald-200 bg-emerald-50/50"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b pb-4 border-slate-200/80">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  invoice.correctionRequired
                    ? "bg-rose-100 text-rose-600"
                    : "bg-emerald-100 text-emerald-600"
                }`}
              >
                {invoice.correctionRequired ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-base font-bold text-slate-900">
                    {invoice.correctionRequired ? "Correction Required" : "Correction Completed"}
                  </h2>
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
                <p className="text-xs text-slate-700">
                  {invoice.correctionRequired
                    ? "This invoice was rejected and requires correction before it can be resubmitted. Financial or non-financial corrections can be performed below."
                    : "Correction completed. Financial data has been refreshed from the authoritative billing source."}
                </p>
                {invoice.lastCorrectedAt && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    Last corrected: {formatDisplayDateTime(invoice.lastCorrectedAt)}
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
                  className="text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-100/50 font-medium"
                >
                  Review Tax Calculation
                </Button>
              )}

              <Button
                variant="outline"
                size="small"
                onClick={() => setIsRefreshModalOpen(true)}
                disabled={refreshing || refreshingAfterCorrection || savingCorrection || reacquiring}
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
                  disabled={submitting || refreshing || refreshingAfterCorrection || savingCorrection || reacquiring}
                  className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Resubmitting..." : "Resubmit for Approval"}
                </Button>
              ) : null}
            </div>
          </div>

          {/* Context Details: Invoice Number, Current Status, Rejection Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-slate-200/80 bg-white p-3 space-y-2">
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
                  <span className="text-slate-500 font-medium">Last Corrected:</span>
                  <span className="font-medium text-slate-700">{formatDisplayDateTime(invoice.lastCorrectedAt)}</span>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200/80 bg-white p-3 space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-600">
                Rejection Reason (Audit Record)
              </span>
              <p className="mt-1 text-sm font-medium text-slate-800 italic">
                "{latestRejectionReason || "No specific rejection reason recorded."}"
              </p>
            </div>
          </div>

          {/* Correction Paths when correctionRequired === true */}
          {invoice.correctionRequired ? (
            <div className="space-y-4">
              {/* Path 1: Non-Financial Correction (Phase 2C) */}
              <div className="rounded-lg border border-amber-200 bg-white p-4 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Edit3 className="h-4 w-4 text-indigo-600" />
                      Non-Financial Correction
                    </h3>
                    <p className="text-xs text-slate-500">
                      Client Name and Project Name can be corrected. All financial details (quantities, rates, taxes, and amounts) remain authoritative and read-only.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Client Name Input */}
                  <div className="space-y-1">
                    <label htmlFor="edit-client-name" className="block text-xs font-bold text-slate-700">
                      Client Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="edit-client-name"
                      type="text"
                      value={editClientName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditClientName(val);
                        if (val.trim()) {
                          setClientNameError(val.length > 150 ? "Client Name cannot exceed 150 characters." : "");
                        }
                      }}
                      placeholder="Enter client name..."
                      disabled={savingCorrection || reacquiring}
                      className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 ${
                        clientNameError
                          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30"
                          : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                      }`}
                    />
                    <div className="flex items-center justify-between text-[11px]">
                      <div>{clientNameError && <span className="text-rose-600 font-medium">{clientNameError}</span>}</div>
                      <span className={editClientName.length > 150 ? "text-rose-600 font-bold" : "text-slate-400"}>
                        {editClientName.length}/150
                      </span>
                    </div>
                  </div>

                  {/* Project Name Input */}
                  <div className="space-y-1">
                    <label htmlFor="edit-project-name" className="block text-xs font-bold text-slate-700">
                      Project Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="edit-project-name"
                      type="text"
                      value={editProjectName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditProjectName(val);
                        if (val.trim()) {
                          setProjectNameError(val.length > 150 ? "Project Name cannot exceed 150 characters." : "");
                        }
                      }}
                      placeholder="Enter project name..."
                      disabled={savingCorrection || reacquiring}
                      className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 ${
                        projectNameError
                          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30"
                          : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                      }`}
                    />
                    <div className="flex items-center justify-between text-[11px]">
                      <div>{projectNameError && <span className="text-rose-600 font-medium">{projectNameError}</span>}</div>
                      <span className={editProjectName.length > 150 ? "text-rose-600 font-bold" : "text-slate-400"}>
                        {editProjectName.length}/150
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="small"
                    onClick={handleResetCorrection}
                    disabled={savingCorrection || reacquiring}
                    className="text-xs"
                  >
                    Reset
                  </Button>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={handleSaveCorrection}
                    disabled={savingCorrection || reacquiring || !editClientName.trim() || !editProjectName.trim()}
                    className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Save className={`h-3.5 w-3.5 ${savingCorrection ? "animate-spin" : ""}`} />
                    {savingCorrection ? "Saving Correction..." : "Save Correction"}
                  </Button>
                </div>
              </div>

              {/* Path 2: Financial Correction (Phase 2B) */}
              <div className="rounded-lg border border-indigo-200 bg-white p-4 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <RefreshCw className="h-4 w-4 text-indigo-600" />
                      Financial Correction
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Financial values are read-only. Correct the underlying billing source first, then use Re-acquire & Recalculate to refresh this invoice.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block">Current Subtotal:</span>
                    <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
                      {formatCurrency(invoice?.subtotal, currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Current Total Tax:</span>
                    <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
                      {formatCurrency(invoice?.totalTax, currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Current Grand Total:</span>
                    <span className="font-mono font-bold text-indigo-900 text-sm mt-0.5 block">
                      {formatCurrency(invoice?.grandTotal, currency)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                  <p className="text-[11px] text-slate-500 italic">
                    Re-acquires approved time & charges from the authoritative source, rebuilds the snapshot, recalculates tax, and updates invoice totals.
                  </p>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => setIsReacquireModalOpen(true)}
                    disabled={reacquiring || savingCorrection}
                    className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 self-end sm:self-auto"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${reacquiring ? "animate-spin" : ""}`} />
                    {reacquiring ? "Re-acquiring financial data..." : "Re-acquire & Recalculate"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* When correctionRequired === false */
            <div className="space-y-4">
              {/* Financial Success Summary */}
              <div className="rounded-lg border border-emerald-200 bg-white p-4 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Authoritative Financial Summary
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Financial data has been refreshed from the authoritative billing source. All values remain read-only.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setIsReacquireModalOpen(true)}
                    disabled={reacquiring || savingCorrection || submitting}
                    className="text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${reacquiring ? "animate-spin" : ""}`} />
                    Re-acquire Again
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block">Refreshed Subtotal</span>
                    <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                      {formatCurrency(invoice?.subtotal, currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Refreshed Total Tax</span>
                    <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                      {formatCurrency(invoice?.totalTax, currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Refreshed Grand Total</span>
                    <span className="font-mono font-bold text-emerald-900 text-sm mt-0.5 block">
                      {formatCurrency(invoice?.grandTotal, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Non-Financial Details Summary */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Non-Financial Details
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Correction saved. Ready to resubmit for approval.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setIsEditingCorrection(true)}
                    disabled={reacquiring || savingCorrection || submitting}
                    className="text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit Correction
                  </Button>
                </div>

                {isEditingCorrection ? (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label htmlFor="edit-client-name-re" className="block text-xs font-bold text-slate-700">
                          Client Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="edit-client-name-re"
                          type="text"
                          value={editClientName}
                          onChange={(e) => setEditClientName(e.target.value)}
                          disabled={savingCorrection || reacquiring}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        {clientNameError && <p className="text-xs text-rose-600">{clientNameError}</p>}
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="edit-project-name-re" className="block text-xs font-bold text-slate-700">
                          Project Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="edit-project-name-re"
                          type="text"
                          value={editProjectName}
                          onChange={(e) => setEditProjectName(e.target.value)}
                          disabled={savingCorrection || reacquiring}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        {projectNameError && <p className="text-xs text-rose-600">{projectNameError}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => {
                          handleResetCorrection();
                          setIsEditingCorrection(false);
                        }}
                        disabled={savingCorrection || reacquiring}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={handleSaveCorrection}
                        disabled={savingCorrection || reacquiring || !editClientName.trim() || !editProjectName.trim()}
                        className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Save className={`h-3.5 w-3.5 ${savingCorrection ? "animate-spin" : ""}`} />
                        {savingCorrection ? "Saving..." : "Save Correction"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Client Name</span>
                      <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{invoice?.clientName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Project Name</span>
                      <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{invoice?.projectName || "—"}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Invoice Card */}
      <PageCard className="divide-y divide-slate-100 overflow-hidden shadow-sm border border-slate-200">
        {/* Section 1: INVOICE HEADER */}
        <div className="border-b border-slate-200 bg-slate-50/70 px-7 py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            {/* Document title */}
            <div className="space-y-0.5 shrink-0">
              <span className="block text-[11px] font-semibold uppercase tracking-widest text-indigo-600">
                Tax Invoice
              </span>
              {invoice?.snapshotNumber && (
                <p className="text-[11px] text-slate-400">Snapshot: {invoice.snapshotNumber}</p>
              )}
            </div>

            {/* Invoice meta grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-5 text-xs">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Invoice Number</span>
                <span className="font-mono font-bold text-base text-indigo-800 leading-tight">
                  {invoice?.invoiceNumber || "—"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Invoice Date</span>
                <span className="font-semibold text-slate-800">
                  {invoice?.invoiceDate ? formatDisplayDate(invoice.invoiceDate) : "—"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Due Date</span>
                <span className="font-semibold text-slate-800">
                  {invoice?.dueDate ? formatDisplayDate(invoice.dueDate) : "—"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Status</span>
                <StatusBadge label={invoice?.invoiceStatus || "GENERATED"} size="sm" />
              </div>
              {invoice?.invoiceStatus === "APPROVED" && (
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Delivery</span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      deliveryState.deliveryStatus === DEMO_DELIVERY_STATUS.SENT_TO_CLIENT
                        ? "text-teal-700"
                        : "text-amber-700"
                    }`}
                  >
                    <MailCheck className="h-3 w-3" />
                    {deliveryState.deliveryStatus === DEMO_DELIVERY_STATUS.SENT_TO_CLIENT
                      ? "Sent to Client"
                      : "Not Sent"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: FROM / BILL TO */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-white">
          {/* FROM */}
          <div className="px-7 py-6 space-y-4">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-indigo-600">
              From
            </span>
            <div className="space-y-0.5 text-sm">
              <p className="font-bold text-slate-900">{DEMO_SELLER.legalName}</p>
              <div className="mt-1.5 space-y-0.5 text-xs text-slate-500 leading-relaxed">
                {DEMO_SELLER.addressLines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
                <p>{DEMO_SELLER.city}, {DEMO_SELLER.state} - {DEMO_SELLER.postalCode}</p>
                <p>{DEMO_SELLER.country}</p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">GSTIN</span>
                <span className="font-mono font-semibold text-slate-700 mt-0.5 block">{DEMO_SELLER.gstin}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</span>
                <span className="font-semibold text-slate-700 mt-0.5 block">{DEMO_SELLER.phone}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</span>
                <span className="font-semibold text-slate-700 mt-0.5 block">{DEMO_SELLER.email}</span>
              </div>
            </div>
          </div>

          {/* BILL TO */}
          <div className="px-7 py-6 space-y-4">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Bill To
            </span>
            <div className="space-y-0.5 text-sm">
              <p className="font-bold text-slate-900">{clientName}</p>
              <p className="text-xs text-slate-400 italic mt-1">{invoice?.billingAddress || DEMO_CLIENT.billingAddress}</p>
            </div>
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">GSTIN / Tax ID</span>
                <span className="font-semibold text-slate-400 italic mt-0.5 block">{invoice?.gstin || DEMO_CLIENT.gstin}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact</span>
                <span className="font-semibold text-slate-400 italic mt-0.5 block">{invoice?.contact || DEMO_CLIENT.contact}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</span>
                <span className="font-semibold text-slate-400 italic mt-0.5 block">{invoice?.email || DEMO_CLIENT.email}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</span>
                <span className="font-semibold text-slate-400 italic mt-0.5 block">{invoice?.phone || DEMO_CLIENT.phone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: INVOICE CONTEXT */}
        <div className="px-7 py-6 bg-slate-50/40 space-y-5">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Invoice Context
          </span>

          {/* Row 1: Project, Code, Client, Billing Period */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 text-xs">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Project</span>
              <span className="font-semibold text-slate-800">{projectName}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Project Code</span>
              <span className="font-mono font-semibold text-slate-700">{projectCode}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Client</span>
              <span className="font-semibold text-slate-800">{clientName}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Billing Period</span>
              <span className="font-semibold text-slate-800">{billingPeriod}</span>
            </div>
          </div>

          {/* Row 2: Currency, Payment Terms, Snapshot */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 text-xs pt-3 border-t border-slate-200/60">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Currency</span>
              <span className="font-mono font-bold text-slate-800">{currency}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Payment Terms</span>
              <span className="font-semibold text-slate-700">{invoice?.paymentTerms || DEMO_TERMS.paymentTerms}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Snapshot Number</span>
              <span className="font-mono text-slate-600">{invoice?.snapshotNumber || snapshotId || "—"}</span>
            </div>
          </div>

          {/* Tax Context sub-section — Place of Supply appears ONLY here */}
          <div className="pt-4 border-t border-slate-200/60 space-y-2.5">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Tax Context
            </span>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 text-xs">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Supplier State</span>
                <span className="font-semibold text-slate-700">{DEMO_TAX_CONTEXT.supplierState}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Customer State</span>
                <span className="font-semibold text-slate-400 italic">{DEMO_TAX_CONTEXT.customerState}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Place of Supply</span>
                <span className="font-semibold text-slate-700">{DEMO_TAX_CONTEXT.placeOfSupply}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Tax Region</span>
                <span className="font-semibold text-slate-700">{DEMO_TAX_CONTEXT.taxRegion}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: INVOICE ITEMS */}
        <div className="px-7 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Invoice Line Items
            </span>
            <span className="text-[11px] text-slate-400">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="rounded-lg bg-slate-50 py-5 text-center text-xs text-slate-400">
              No individual invoice items returned by the backend.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-2.5 pr-4 text-left font-bold w-[30%]">Resource / Item</th>
                    <th className="pb-2.5 px-3 text-left font-bold w-[18%]">Role</th>
                    <th className="pb-2.5 px-3 text-left font-bold w-[14%]">Work Date</th>
                    <th className="pb-2.5 px-3 text-right font-bold w-[10%]">Hrs / Qty</th>
                    <th className="pb-2.5 px-3 text-right font-bold w-[14%]">Rate</th>
                    <th className="pb-2.5 pl-3 text-right font-bold w-[14%]">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 pr-4 align-top font-semibold text-slate-800">
                        {it.itemName || it.item || "—"}
                      </td>
                      <td className="py-3 px-3 align-top text-slate-600 text-xs">
                        {it.role || "—"}
                      </td>
                      <td className="py-3 px-3 align-top font-mono text-xs text-slate-500">
                        {it.workDate ? formatDisplayDate(it.workDate) : "—"}
                      </td>
                      <td className="py-3 px-3 align-top text-right font-mono text-xs text-slate-700">
                        {it.quantity !== undefined && it.quantity !== null ? Number(it.quantity).toFixed(2) : "—"}
                      </td>
                      <td className="py-3 px-3 align-top text-right font-mono text-xs text-slate-700">
                        {formatCurrency(it.rate, currency)}
                      </td>
                      <td className="py-3 pl-3 align-top text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(it.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 5: TAX BREAKDOWN */}
        <div className="px-7 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Tax Breakdown
            </span>
            <span className="text-[11px] text-slate-400">
              {effectiveTaxBreakdown.length} {effectiveTaxBreakdown.length === 1 ? "component" : "components"}
            </span>
          </div>

          {effectiveTaxBreakdown.length === 0 ? (
            <div className="rounded-lg bg-slate-50 py-4 text-center text-xs text-slate-400">
              No tax components applicable for this invoice.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-2.5 pr-4 text-left font-bold w-[40%]">Tax Component</th>
                    <th className="pb-2.5 px-3 text-left font-bold w-[25%]">Applicability</th>
                    <th className="pb-2.5 px-3 text-right font-bold w-[15%]">Rate</th>
                    <th className="pb-2.5 pl-3 text-right font-bold w-[20%]">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {effectiveTaxBreakdown.map((comp) => (
                    <tr key={comp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 pr-4 align-top">
                        <span className="font-semibold text-slate-800">{comp.taxComponent}</span>
                        {comp.taxTypeCode && (
                          <span className="ml-2 inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                            {comp.taxTypeCode}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top text-xs text-slate-500">
                        {humanizeApplicability(comp.applicability)}
                      </td>
                      <td className="py-3 px-3 align-top text-right font-mono text-xs font-semibold text-slate-700">
                        {formatRatePercentage(comp.rate) ?? "—"}
                      </td>
                      <td className="py-3 pl-3 align-top text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(comp.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 6: FINANCIAL SUMMARY */}
        <div className="px-7 py-6 bg-slate-50/40">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Financial Summary
              </span>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Authoritative totals from the billing engine. All values are read-only.
              </p>
            </div>

            <div className="w-full sm:w-72 space-y-2 text-sm">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(invoice?.subtotal, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-600">Tax</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(invoice?.totalTax, currency)}
                </span>
              </div>
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-4 py-3 mt-2 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-700">Grand Total</span>
                  <span className="text-xs text-indigo-500">Amount Due</span>
                </div>
                <span className="font-mono text-xl font-extrabold text-indigo-950">
                  {formatCurrency(invoice?.grandTotal, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 7: TERMS / NOTES */}
        <div className="px-7 py-5 bg-white">
          <div className="space-y-3">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Terms & Notes</span>
            <div className="flex flex-wrap gap-x-8 gap-y-1.5 text-xs text-slate-600">
              <div>
                <span className="font-semibold text-slate-700">Payment Terms: </span>
                {invoice?.paymentTerms || DEMO_TERMS.paymentTerms}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Billing Period: </span>
                {billingPeriod}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 italic border-t border-slate-100 pt-3">
              Tax calculated and verified in Tax Calculation. All financial amounts and line items are authoritative values from the billing engine.
            </p>
          </div>
        </div>
      </PageCard>

      {/* Authoritative Record Notice */}
      <div className="flex items-start gap-2.5 px-1 py-2 text-xs text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500 mt-0.5" />
        <p>
          <span className="font-semibold text-slate-500">Authoritative Financial Record.</span>{" "}
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

      {/* Confirmation Modal for Re-acquire Financial Data (Phase 2B) */}
      <Modal
        isOpen={isReacquireModalOpen}
        onClose={() => !reacquiring && setIsReacquireModalOpen(false)}
        title="Re-acquire Financial Data"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-800">
            Are you sure you want to re-acquire the financial data for this rejected invoice?
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            The system will retrieve the latest approved billing source data, rebuild the billing snapshot, recalculate tax, and refresh the invoice values.
          </p>

          <div className="rounded-lg bg-slate-50 p-3.5 text-xs space-y-2 border border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Invoice Number:</span>
              <span className="font-mono font-bold text-indigo-700">{invoice?.invoiceNumber || "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Client:</span>
              <span className="font-medium text-slate-800">{invoice?.clientName || "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Project:</span>
              <span className="font-medium text-slate-800">{invoice?.projectName || "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Current Grand Total:</span>
              <span className="font-mono font-bold text-indigo-900">{formatCurrency(invoice?.grandTotal, currency)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
              <span className="text-slate-500 font-medium">Status after refresh:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                <StatusBadge label="REJECTED" size="sm" />
                <span className="text-[11px] text-slate-500">(Must explicitly resubmit afterward)</span>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="small"
              onClick={() => setIsReacquireModalOpen(false)}
              disabled={reacquiring}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={handleFinancialReacquire}
              disabled={reacquiring}
              className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${reacquiring ? "animate-spin" : ""}`} />
              {reacquiring ? "Re-acquiring financial data..." : "Re-acquire & Recalculate"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Send to Client (Demo) */}
      <Modal
        isOpen={isSendToClientOpen}
        onClose={() => !sendingToClient && setIsSendToClientOpen(false)}
        title="Send Invoice to Client"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Review the delivery details below and confirm to mark this invoice as sent.
          </p>

          <div className="rounded-lg bg-slate-50 p-3.5 text-xs space-y-1.5 border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Invoice:</span>
              <span className="font-mono font-bold text-indigo-700">{invoice?.invoiceNumber || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Client:</span>
              <span className="font-semibold text-slate-800">{invoice?.clientName || "Account Management"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Recipient:</span>
              <span className="text-slate-400 italic">Not provided</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5">
              <span className="text-slate-700 font-bold">Grand Total:</span>
              <span className="font-mono font-bold text-slate-900">{formatCurrency(invoice?.grandTotal, currency)}</span>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800 space-y-1">
            <p className="font-bold">Demo delivery action</p>
            <p>This is currently a demo delivery action. No actual email will be sent. The invoice will be marked as sent to the client for demonstration purposes.</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="small"
              onClick={() => setIsSendToClientOpen(false)}
              disabled={sendingToClient}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={handleSendToClient}
              disabled={sendingToClient}
              className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <MailCheck className="h-3.5 w-3.5" />
              {sendingToClient ? "Marking as Sent..." : "Send Invoice"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
