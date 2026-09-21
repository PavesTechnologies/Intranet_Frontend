import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FileText,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Send,
  Eye,
  MailCheck,
} from "lucide-react";

import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import Loader from "../../../components/ui/Loader";
import StatusBadge from "../../../components/status/statusbadge";
import Breadcrumb from "../../../components/Breadcrumb/Breadcrumb";
import Modal from "../../../components/Modal/modal";
import { showStatusToast } from "../../../components/toastfy/toast";
import { formatCurrency, formatDisplayDate } from "../utils/format";
import InvoiceDocument from "../components/invoice/InvoiceDocument";

import {
  getTaxCalculation,
  getTaxCalculationErrorMessage,
} from "../services/taxCalculationService";
import {
  getInvoice,
  generateInvoice,
  generateInvoiceForOccurrence,
  submitInvoiceForApproval,
  getInvoiceErrorMessage,
} from "../services/invoiceService";
import {
  getBillingOccurrence,
  getOccurrenceTaxCalculation,
  getOccurrenceErrorMessage,
} from "../services/billingOccurrenceService";
import {
  getBillingSnapshotByPeriod,
  fetchActiveBillingConfigurations,
  saveAcquiredSnapshotMetadata,
  formatBillingPeriod,
  toIsoDateOnly,
} from "../services/billingDataAcquisitionService";

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

const INVOICE_WORKSPACE_PATH = "/account-receivable/invoice-generation";
const INVOICE_APPROVAL_PATH = "/account-receivable/invoice-approval";


function Field({
  label,
  children,
  truncate = true,
  className = "",
}) {
  return (
    <div className={className}>
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span
        className={`mt-0.5 block text-sm font-semibold text-slate-800 ${truncate ? "truncate" : "whitespace-nowrap"}`}
        title={typeof children === "string" ? children : undefined}
      >
        {children || "—"}
      </span>
    </div>
  );
}

export default function InvoiceGenerationDetail() {
  const { snapshotId, occurrenceId: paramOccurrenceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const passedState = location.state || {};

  const effectiveOccurrenceId =
    paramOccurrenceId ||
    passedState.occurrenceId ||
    passedState.billingScheduleId ||
    passedState.occurrence?.billingScheduleId ||
    null;

  const isOccurrenceMode = Boolean(
    effectiveOccurrenceId ||
    (!snapshotId && passedState.occurrence) ||
    location.pathname.includes("/occurrence/")
  );

  const effectiveSnapshotId = isOccurrenceMode ? null : (snapshotId || passedState.snapshotId || null);
  const effectiveId = isOccurrenceMode ? effectiveOccurrenceId : effectiveSnapshotId;

  // Loaded states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Data states
  const [taxCalc, setTaxCalc] = useState(passedState.taxCalculation || null);
  const [invoice, setInvoice] = useState(null);
  const [snapshotData, setSnapshotData] = useState(passedState.config || null);
  const [occurrenceData, setOccurrenceData] = useState(passedState.occurrence || null);
  const [items, setItems] = useState([]);

  // Preview Modal & Delivery workflow states
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [deliveryState, setDeliveryState] = useState(() => ({
    deliveryStatus: DEMO_DELIVERY_STATUS.NOT_SENT,
    sentAt: null,
    sentBy: null,
  }));
  const [sendingToClient, setSendingToClient] = useState(false);

  // Sync demo delivery status whenever invoiceId is known
  useEffect(() => {
    if (invoice?.invoiceId) {
      const stored = getDemoDelivery(invoice.invoiceId);
      setDeliveryState(stored);
    }
  }, [invoice?.invoiceId]);

  const loadData = async (isManual = false) => {
    if (!effectiveId) {
      setErrorMsg(isOccurrenceMode ? "Billing occurrence identifier is required." : "Billing snapshot identifier is required.");
      setLoading(false);
      return;
    }

    if (isManual) setRefreshing(true);
    else setLoading(true);
    setErrorMsg("");

    try {
      if (isOccurrenceMode) {
        // 1. Check if invoice has ALREADY been generated for this occurrence
        let existingInvoice = null;
        try {
          existingInvoice = await getInvoice(effectiveOccurrenceId);
          if (existingInvoice && (existingInvoice.invoiceId || existingInvoice.invoiceNumber)) {
            setInvoice(existingInvoice);
            if (Array.isArray(existingInvoice.items) && existingInvoice.items.length > 0) {
              setItems(existingInvoice.items);
            }
          }
        } catch (invErr) {
          const isNotFound = invErr?.response?.status === 404;
          if (!isNotFound) {
            console.warn("[InvoiceGenerationDetail] Occurrence invoice check notice:", invErr?.message);
          }
          setInvoice(null);
        }

        // 2. Fetch completed tax calculation / occurrence details
        let occ = occurrenceData || passedState.occurrence;
        try {
          const fetchedOcc = await getBillingOccurrence(effectiveOccurrenceId);
          if (fetchedOcc) occ = fetchedOcc;
        } catch (occErr) {
          console.warn("[InvoiceGenerationDetail] Fetch occurrence notice:", occErr?.message);
        }

        try {
          const occTax = await getOccurrenceTaxCalculation(effectiveOccurrenceId);
          if (occTax) {
            occ = occ ? { ...occ, ...occTax } : occTax;
          }
        } catch (taxErr) {
          console.warn("[InvoiceGenerationDetail] Occurrence tax calculation notice:", taxErr?.message);
        }

        setOccurrenceData(occ);

        // 3. Hydrate line items if not already loaded from existing invoice
        if (!existingInvoice || !existingInvoice.items || existingInvoice.items.length === 0) {
          const rateAmt = occ?.billingAmount ?? occ?.taxableAmount ?? 0;
          const itemName = occ?.projectName
            ? `${occ.projectName} - Fixed Price Billing`
            : "Fixed Price Billing";
          const role = "Fixed Price Milestone";
          const workDate = toIsoDateOnly(occ?.billingDate || occ?.periodEndDate);

          const fixedItem = {
            id: `fixed-price-${effectiveOccurrenceId}`,
            itemName,
            role,
            workDate,
            quantity: 1,
            rate: rateAmt,
            amount: rateAmt,
            itemType: "FIXED_PRICE",
          };

          setItems([fixedItem]);
        }
      } else {
        // 1. Check if invoice has ALREADY been generated for this snapshot
        let existingInvoice = null;
        try {
          existingInvoice = await getInvoice(effectiveSnapshotId);
          if (existingInvoice && (existingInvoice.invoiceId || existingInvoice.invoiceNumber)) {
            setInvoice(existingInvoice);
            if (Array.isArray(existingInvoice.items) && existingInvoice.items.length > 0) {
              setItems(existingInvoice.items);
            }
          }
        } catch (invErr) {
          const isNotFound = invErr?.response?.status === 404;
          if (!isNotFound) {
            console.warn("[InvoiceGenerationDetail] Invoice check notice:", invErr?.message);
          }
          setInvoice(null);
        }

        // 2. Fetch completed tax calculation for this snapshot
        let calc = taxCalc;
        try {
          calc = await getTaxCalculation(effectiveSnapshotId);
          if (calc) {
            setTaxCalc(calc);
          }
        } catch (calcErr) {
          console.warn("[InvoiceGenerationDetail] Tax calculation fetch notice:", calcErr?.message);
        }

        // 3. Hydrate line items if not already loaded from existing invoice
        if (!existingInvoice || !existingInvoice.items || existingInvoice.items.length === 0) {
          let loadedItems = [];

          // Check if labor items were passed via location.state
          const passedLabor = passedState.acquisitionResults?.labor;
          if (passedLabor && Array.isArray(passedLabor.timesheets) && passedLabor.timesheets.length > 0) {
            loadedItems = passedLabor.timesheets.map((t, idx) => ({
              id: t.sourceReferenceId || `item-${idx}`,
              itemName: t.employee || t.itemName || "Timesheet Entry",
              role: t.role || "Consultant",
              workDate: toIsoDateOnly(t.workDate),
              quantity: t.hours || t.quantity || 0,
              rate: t.rate || 0,
              amount: t.amount || 0,
            }));
          } else {
            // Attempt to fetch from billing-snapshots/by-period if projectId and dates are known
            const pId = calc?.projectId || snapshotData?.projectId || passedState.projectId;
            const pStart = toIsoDateOnly(calc?.billingPeriodStart || snapshotData?.billingPeriodStart);
            const pEnd = toIsoDateOnly(calc?.billingPeriodEnd || snapshotData?.billingPeriodEnd);

            if (pId && pStart && pEnd) {
              try {
                const snap = await getBillingSnapshotByPeriod(pId, pStart, pEnd);
                if (snap && Array.isArray(snap.laborRecords) && snap.laborRecords.length > 0) {
                  loadedItems = snap.laborRecords.map((t, idx) => ({
                    id: t.id || `item-${idx}`,
                    itemName: t.employee || "Timesheet Entry",
                    role: t.role || "Consultant",
                    workDate: t.workDate,
                    quantity: t.hours || 0,
                    rate: t.rate || 0,
                    amount: t.amount || 0,
                  }));
                }
              } catch (snapErr) {
                console.warn("[InvoiceGenerationDetail] Snapshot items fetch notice:", snapErr?.message);
              }
            }
          }

          // Fallback: if no detailed line items, represent the billable labor total from taxCalc/snapshot
          if (loadedItems.length === 0) {
            const subtotalAmt = calc?.taxableAmount ?? snapshotData?.totalAmount ?? 0;
            if (subtotalAmt > 0) {
              loadedItems = [
                {
                  id: "labor-summary-1",
                  itemName: `${calc?.projectName || snapshotData?.projectName || "Project"} Billable Services`,
                  role: "Consultant / Engineering",
                  workDate: toIsoDateOnly(calc?.billingPeriodEnd || snapshotData?.billingPeriodEnd),
                  quantity: 1,
                  rate: subtotalAmt,
                  amount: subtotalAmt,
                },
              ];
            }
          }

          setItems(loadedItems);
        }
      }

      if (isManual) {
        showStatusToast("Invoice generation details refreshed.", "success");
      }
    } catch (err) {
      console.error("[InvoiceGenerationDetail] Error loading data:", err);
      const msg = isOccurrenceMode
        ? getOccurrenceErrorMessage(err, "Failed to load occurrence details for invoice generation.")
        : getInvoiceErrorMessage(err, "Failed to load snapshot details for invoice generation.");
      setErrorMsg(msg);
      showStatusToast(msg, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [effectiveId]);

  // Primary Action: Generate Invoice
  const handleGenerateInvoice = async () => {
    const targetId = isOccurrenceMode ? effectiveOccurrenceId : effectiveSnapshotId;
    if (!targetId || generating) return;

    setGenerating(true);
    try {
      let generated = null;
      if (isOccurrenceMode) {
        generated = await generateInvoiceForOccurrence(effectiveOccurrenceId);
      } else {
        generated = await generateInvoice(effectiveSnapshotId);
      }

      setInvoice(generated);
      if (Array.isArray(generated?.items) && generated.items.length > 0) {
        setItems(generated.items);
      }

      if (!isOccurrenceMode) {
        const pId = generated?.projectId || taxCalc?.projectId || snapshotData?.projectId;
        if (pId) {
          saveAcquiredSnapshotMetadata(pId, {
            status: "INVOICED",
            invoiceNumber: generated.invoiceNumber,
          });
        }
      }

      showStatusToast("Invoice generated successfully.", "success");
    } catch (err) {
      const status = err?.response?.status;
      const msg = (err?.response?.data?.message || err?.message || "").toLowerCase();

      // Handle 409 conflict gracefully: invoice was already generated
      if (status === 409 || msg.includes("already")) {
        showStatusToast("Invoice already exists for this record.", "info");
        try {
          const existing = await getInvoice(targetId);
          if (existing) {
            setInvoice(existing);
            if (Array.isArray(existing.items) && existing.items.length > 0) {
              setItems(existing.items);
            }
            return;
          }
        } catch {
          // ignore
        }
      }

      const errorText = isOccurrenceMode
        ? getOccurrenceErrorMessage(err, "Failed to generate invoice for billing occurrence.")
        : getInvoiceErrorMessage(err, "Failed to generate invoice.");
      showStatusToast(errorText, "error");
    } finally {
      setGenerating(false);
    }
  };

  // Submit for Approval action
  const handleSubmitForApproval = async () => {
    if (!invoice?.invoiceId || submitting) return;

    setSubmitting(true);
    try {
      const updated = await submitInvoiceForApproval(invoice.invoiceId);
      showStatusToast("Invoice submitted for approval successfully.", "success");

      // Authoritative reload of invoice from backend
      try {
        const refreshed = await getInvoice(effectiveId);
        if (refreshed && (refreshed.invoiceId || refreshed.invoiceNumber)) {
          setInvoice(refreshed);
          if (Array.isArray(refreshed.items) && refreshed.items.length > 0) {
            setItems(refreshed.items);
          }
        } else if (updated) {
          setInvoice((prev) => ({
            ...prev,
            invoiceStatus: updated.invoiceStatus || "PENDING_APPROVAL",
          }));
        }
      } catch {
        if (updated) {
          setInvoice((prev) => ({
            ...prev,
            invoiceStatus: updated.invoiceStatus || "PENDING_APPROVAL",
          }));
        } else {
          setInvoice((prev) => ({
            ...prev,
            invoiceStatus: "PENDING_APPROVAL",
          }));
        }
      }
    } catch (err) {
      console.error("[InvoiceGenerationDetail] Error submitting for approval:", err);
      const msg = getInvoiceErrorMessage(err, "Failed to submit invoice for approval.");
      showStatusToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Demo Send to Client action (when invoice is APPROVED)
  const handleSendToClient = () => {
    if (!invoice?.invoiceId || sendingToClient) return;
    setSendingToClient(true);
    setTimeout(() => {
      const entry = {
        deliveryStatus: DEMO_DELIVERY_STATUS.SENT_TO_CLIENT,
        sentAt: new Date().toISOString(),
        sentBy: DEMO_SENT_BY,
      };
      saveDemoDelivery(invoice.invoiceId, entry);
      setDeliveryState(entry);
      setSendingToClient(false);
      showStatusToast(
        `Invoice ${invoice.invoiceNumber || invoice.invoiceId} marked as sent to client.`,
        "success"
      );
    }, 600);
  };

  if (loading && !refreshing) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader size="lg" text="Loading Invoice Generation workspace..." />
      </div>
    );
  }

  // Derived contextual fields (Authoritative from backend tax calculation, occurrence, or invoice)
  const isInvoiceGenerated = Boolean(invoice && (invoice.invoiceId || invoice.invoiceNumber));
  const invoiceStatus = (invoice?.invoiceStatus || (isInvoiceGenerated ? "GENERATED" : "TAX_COMPLETED")).toUpperCase();

  const projectName =
    invoice?.projectName ||
    taxCalc?.projectName ||
    occurrenceData?.projectName ||
    snapshotData?.projectName ||
    DEMO_PROJECT.name;

  const projectCode =
    invoice?.projectCode ||
    snapshotData?.projectCode ||
    taxCalc?.projectCode ||
    occurrenceData?.projectCode ||
    (snapshotData?.projectId ? `PRJ-${snapshotData.projectId}` : null) ||
    (taxCalc?.projectId ? `PRJ-${taxCalc.projectId}` : null) ||
    (occurrenceData?.billingConfigurationId ? `CFG-${occurrenceData.billingConfigurationId}` : null) ||
    DEMO_PROJECT.code;

  const clientName =
    invoice?.clientName ||
    taxCalc?.clientName ||
    occurrenceData?.clientName ||
    snapshotData?.clientName ||
    DEMO_CLIENT.legalName;

  const recordLabel = isOccurrenceMode
    ? (occurrenceData?.periodNumber ? `Occurrence #${occurrenceData.periodNumber}` : (effectiveOccurrenceId || "Billing Occurrence"))
    : (invoice?.snapshotNumber || invoice?.billingSnapshotNumber || taxCalc?.snapshotNumber || snapshotData?.snapshotNumber || snapshotId);

  const rawStart =
    invoice?.billingPeriodStart ||
    taxCalc?.billingPeriodStart ||
    occurrenceData?.periodStartDate ||
    snapshotData?.billingPeriodStart;

  const rawEnd =
    invoice?.billingPeriodEnd ||
    taxCalc?.billingPeriodEnd ||
    occurrenceData?.periodEndDate ||
    snapshotData?.billingPeriodEnd;

  const billingPeriod =
    rawStart && rawEnd
      ? formatBillingPeriod(rawStart, rawEnd)
      : invoice?.billingPeriod || taxCalc?.billingPeriod || occurrenceData?.period || snapshotData?.billingPeriod || "—";

  const currency =
    invoice?.currency ||
    taxCalc?.currencyCode ||
    occurrenceData?.currencyCode ||
    snapshotData?.currency ||
    "USD";

  const paymentTerms = invoice?.paymentTerms || "Net 30";

  // Financial Totals: Strictly backend authoritative
  const subtotal =
    invoice?.subtotal ??
    taxCalc?.taxableAmount ??
    occurrenceData?.taxableAmount ??
    occurrenceData?.billingAmount ??
    snapshotData?.subtotal ??
    0;

  const totalTax =
    invoice?.totalTax ??
    taxCalc?.totalTaxAmount ??
    occurrenceData?.totalTaxAmount ??
    0;

  const grandTotal =
    invoice?.grandTotal ??
    taxCalc?.grandTotal ??
    occurrenceData?.grandTotal ??
    (subtotal + totalTax);

  const backToTaxUrl = isOccurrenceMode
    ? `/account-receivable/tax-calculation/occurrence/${effectiveOccurrenceId}`
    : `/account-receivable/tax-calculation/${snapshotId}`;


  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={
          isOccurrenceMode
            ? [
                { label: "Tax Calculation", to: backToTaxUrl },
                { label: "Invoice Generation" },
                { label: isInvoiceGenerated ? (invoice?.invoiceNumber || recordLabel) : recordLabel },
              ]
            : [
                { label: "Billing Data Acquisition", to: "/account-receivable/billing-data-acquisition/workspace" },
                { label: "Tax Calculation", to: backToTaxUrl },
                { label: "Invoice Generation" },
                { label: isInvoiceGenerated ? (invoice?.invoiceNumber || recordLabel) : recordLabel },
              ]
        }
      />

      {/* Header Bar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Invoice Generation</h1>
            <StatusBadge label={invoiceStatus} size="sm" />
          </div>
          <p className="text-sm text-slate-600">
            {isOccurrenceMode ? "Occurrence: " : "Snapshot: "}
            <span className="font-mono font-bold text-indigo-700">{recordLabel}</span>
            {isInvoiceGenerated && invoice?.invoiceNumber && (
              <>
                <span className="mx-2 text-slate-300">&middot;</span>
                Invoice: <span className="font-mono font-bold text-emerald-700">{invoice.invoiceNumber}</span>
              </>
            )}
          </p>
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{projectName}</span>
            <span className="mx-1.5 text-slate-300">&middot;</span>
            <span>{clientName}</span>
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="small"
            onClick={() => navigate(backToTaxUrl)}
            className="flex items-center gap-1.5 text-xs text-slate-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Tax Calculation
          </Button>

          <Button
            variant="outline"
            size="small"
            onClick={() => navigate(INVOICE_WORKSPACE_PATH)}
            className="flex items-center gap-1.5 text-xs text-slate-600"
          >
            Invoice Generation Dashboard
          </Button>

          <Button
            variant="outline"
            size="small"
            onClick={() => loadData(true)}
            disabled={refreshing || generating || submitting}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Workflow Guidance Banner */}
      {isInvoiceGenerated ? (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-emerald-950">Invoice Generated Successfully</h3>
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  {invoice?.invoiceNumber}
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Authoritative invoice has been created and persisted. Review line items and submit for approval.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {invoiceStatus === "GENERATED" && (
              <Button
                variant="primary"
                size="small"
                onClick={handleSubmitForApproval}
                disabled={submitting}
                className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white flex items-center gap-1.5 text-xs font-semibold shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Submit for Approval
                  </>
                )}
              </Button>
            )}

            {invoiceStatus === "PENDING_APPROVAL" && (
              <Button
                variant="outline"
                size="small"
                onClick={() => navigate(INVOICE_APPROVAL_PATH)}
                className="bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 flex items-center gap-1.5 text-xs font-semibold"
              >
                View in Invoice Approval <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}

            <Button
              variant="outline"
              size="small"
              onClick={() => setIsPreviewModalOpen(true)}
              className="bg-white text-slate-700 border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 text-xs"
            >
              <Eye className="h-3.5 w-3.5" /> Preview Invoice
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-indigo-950">Tax Calculation Verified</h3>
                <span className="text-xs font-semibold text-indigo-600">&rarr;</span>
                <span className="text-xs font-bold text-indigo-800">Ready to Generate Invoice</span>
              </div>
              <p className="text-xs text-indigo-700 mt-0.5">
                Review invoice context, line items, and summary below. Click "Generate Invoice" to create the authoritative invoice.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="small"
            onClick={handleGenerateInvoice}
            disabled={generating}
            className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white flex items-center justify-center gap-1.5 text-xs font-semibold shadow-sm shrink-0"
          >
            {generating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating Invoice...
              </>
            ) : (
              <>
                <FileText className="h-3.5 w-3.5" /> Generate Invoice
              </>
            )}
          </Button>
        </div>
      )}

      {/* Main Container Card */}
      <PageCard className="overflow-hidden border border-slate-200 shadow-sm">
        {/* Section 1: Invoice Context */}
        <div className="border-b border-slate-200 bg-slate-50/50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Invoice Context
            </span>
            {isInvoiceGenerated && (
              <StatusBadge label={invoiceStatus} size="sm" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-12">
            <Field label="Project" className="lg:col-span-2">{projectName}</Field>
            <Field label="Project Code" className="lg:col-span-2">{projectCode}</Field>
            <Field label="Client" className="lg:col-span-2">{clientName}</Field>
            <Field label="Billing Period" className="lg:col-span-3" truncate={false}>
              {billingPeriod}
            </Field>
            <Field label="Currency" className="lg:col-span-1">{currency}</Field>
            <Field label="Payment Terms" className="lg:col-span-2">{paymentTerms}</Field>
          </div>

          {isInvoiceGenerated && (
            <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Invoice Number">{invoice?.invoiceNumber}</Field>
              <Field label="Invoice Date">
                {invoice?.invoiceDate ? formatDisplayDate(invoice.invoiceDate) : "—"}
              </Field>
              <Field label="Due Date">
                {invoice?.dueDate ? formatDisplayDate(invoice.dueDate) : "—"}
              </Field>
            </div>
          )}
        </div>

        {/* Section 2: Invoice Line Items */}
        <div className="border-b border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <FileText className="h-3.5 w-3.5 text-indigo-600" /> Invoice Line Items
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {items.length} {items.length === 1 ? "Item" : "Items"}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-6 text-center text-xs text-slate-500">
              No line items recorded for this billing snapshot.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-2 pr-3 font-bold">Resource / Item</th>
                    <th className="pb-2 px-3 font-bold">Role</th>
                    <th className="pb-2 px-3 font-bold">Work Date</th>
                    <th className="pb-2 px-3 text-right font-bold">Hours / Qty</th>
                    <th className="pb-2 px-3 text-right font-bold">Rate</th>
                    <th className="pb-2 pl-3 text-right font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-3 pr-3 font-semibold text-slate-800">
                        {it.itemName || it.item || "—"}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {it.role || "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-500">
                        {it.workDate ? formatDisplayDate(it.workDate) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {it.quantity !== undefined && it.quantity !== null ? Number(it.quantity).toFixed(2) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {formatCurrency(it.rate, currency)}
                      </td>
                      <td className="py-3 pl-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(it.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 3: Compact Invoice Summary */}
        <div className="bg-slate-50/50 p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="space-y-1.5 max-w-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Invoice Summary
              </span>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tax calculated and verified in Tax Calculation. Financial values are authoritative from the billing snapshot.
              </p>
            </div>

            <div className="w-full sm:w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Subtotal</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatCurrency(subtotal, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Tax</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatCurrency(totalTax, currency)}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Grand Total</span>
                <span className="font-mono text-base font-extrabold text-indigo-950">
                  {formatCurrency(grandTotal, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="small"
              onClick={() => navigate(backToTaxUrl)}
              className="text-xs text-slate-700"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Tax Calculation
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {isInvoiceGenerated && (
              <Button
                variant="outline"
                size="small"
                onClick={() => setIsPreviewModalOpen(true)}
                className="bg-white text-slate-700 border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 text-xs font-semibold px-4 py-2"
              >
                <Eye className="h-3.5 w-3.5" /> Preview Invoice
              </Button>
            )}

            {!isInvoiceGenerated ? (
              <Button
                variant="primary"
                size="small"
                onClick={handleGenerateInvoice}
                disabled={generating}
                className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white text-xs font-semibold px-5 py-2.5 shadow-sm"
              >
                {generating ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating Invoice...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Generate Invoice
                  </span>
                )}
              </Button>
            ) : invoiceStatus === "GENERATED" ? (
              <Button
                variant="primary"
                size="small"
                onClick={handleSubmitForApproval}
                disabled={submitting}
                className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white text-xs font-semibold px-5 py-2.5 shadow-sm"
              >
                {submitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5" /> Submit for Approval
                  </span>
                )}
              </Button>
            ) : invoiceStatus === "PENDING_APPROVAL" ? (
              <Button
                variant="primary"
                size="small"
                onClick={() => navigate(INVOICE_APPROVAL_PATH)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-4 py-2"
              >
                View in Invoice Approval <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>
      </PageCard>

      {/* Full-Screen/Large Invoice Preview Modal With Workflow Actions */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Preview Invoice"
        subtitle="Review invoice details and submit for approval"
        className="w-[92vw] max-w-[1000px]"
        maxHeight="max-h-[90vh]"
        scrollable={true}
        bodyClassName="p-4 sm:p-5 bg-slate-100/60"
        footerClassName="p-4 sm:p-5 bg-white border-t border-slate-200"
        footer={
          <div className="flex flex-wrap items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                size="small"
                onClick={() => setIsPreviewModalOpen(false)}
                className="text-xs text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2"
              >
                Close
              </Button>

              {invoiceStatus === "GENERATED" && (
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleSubmitForApproval}
                  disabled={submitting}
                  className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white flex items-center gap-1.5 text-xs font-semibold shadow-sm px-4 py-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" /> Submit for Approval
                    </>
                  )}
                </Button>
              )}

              {invoiceStatus === "APPROVED" && (
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleSendToClient}
                  disabled={
                    sendingToClient ||
                    deliveryState?.deliveryStatus === DEMO_DELIVERY_STATUS.SENT_TO_CLIENT
                  }
                  className={`${
                    deliveryState?.deliveryStatus === DEMO_DELIVERY_STATUS.SENT_TO_CLIENT
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                      : "bg-[#0A0082] hover:bg-[#0A0082]/90 text-white shadow-sm"
                  } flex items-center gap-1.5 text-xs font-semibold px-4 py-2`}
                >
                  {sendingToClient ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <MailCheck className="h-3.5 w-3.5" />
                      {deliveryState?.deliveryStatus === DEMO_DELIVERY_STATUS.SENT_TO_CLIENT
                        ? "Sent to Client"
                        : "Send to Client"}
                    </>
                  )}
                </Button>
              )}
          </div>
        }
      >
        <InvoiceDocument
          invoice={invoice}
          snapshotId={effectiveId}
          deliveryState={deliveryState}
          taxCalc={taxCalc || occurrenceData}
          snapshotData={snapshotData || occurrenceData}
        />
      </Modal>
    </div>
  );
}
