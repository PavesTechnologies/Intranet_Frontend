import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FileText,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Send,
} from "lucide-react";

import Button from "../../../components/Button/Button";
import Loader from "../../../components/ui/Loader";
import StatusBadge from "../../../components/status/statusbadge";
import Breadcrumb from "../../../components/Breadcrumb/Breadcrumb";
import { showStatusToast } from "../../../components/toastfy/toast";
import { getActiveCompanyProfile } from "../services/companyProfileService";

import InvoiceContextCards from "../components/invoice/InvoiceContextCards";
import InvoiceDraftBanner from "../components/invoice/InvoiceDraftBanner";
import InvoicePreviewDocument from "../components/invoice/InvoicePreviewDocument";
import InvoiceLifecycleStepper from "../components/invoice/InvoiceLifecycleStepper";
import InvoiceGenerationModal from "../components/invoice/InvoiceGenerationModal";

import {
  getTaxCalculation,
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
  formatBillingPeriod,
  toIsoDateOnly,
} from "../services/billingDataAcquisitionService";

export const DEFAULT_MIN_PRESENTATION_MS = 1000;

export default function InvoiceGenerationDetail({ minPresentationDuration = DEFAULT_MIN_PRESENTATION_MS } = {}) {
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

  const backToTaxUrl = isOccurrenceMode
    ? `/account-receivable/tax-calculation/occurrence/${effectiveOccurrenceId}`
    : `/account-receivable/tax-calculation/${effectiveSnapshotId || snapshotId}`;

  const canonicalInvoiceUrl = isOccurrenceMode
    ? `/account-receivable/invoices/occurrence/${effectiveOccurrenceId}`
    : `/account-receivable/invoices/${effectiveSnapshotId || snapshotId}`;

  // Loaded states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [generationModalOpen, setGenerationModalOpen] = useState(false);
  const [generationModalState, setGenerationModalState] = useState("GENERATING");

  // Data states
  const [taxCalc, setTaxCalc] = useState(passedState.taxCalculation || null);
  const [invoice, setInvoice] = useState(null);
  const [snapshotData, setSnapshotData] = useState(passedState.config || null);
  const [occurrenceData, setOccurrenceData] = useState(passedState.occurrence || null);
  const [items, setItems] = useState([]);
  const [companyProfile, setCompanyProfile] = useState(null);

  const loadData = async (isManual = false) => {
    if (!effectiveId) {
      setErrorMsg(isOccurrenceMode ? "Billing occurrence identifier is required." : "Billing snapshot identifier is required.");
      setLoading(false);
      return;
    }

    if (isManual) setRefreshing(true);
    else setLoading(true);
    setErrorMsg("");

    // 1. Fetch active seller company profile for Invoice Preview
    try {
      const profile = await getActiveCompanyProfile();
      setCompanyProfile(profile);
    } catch (profErr) {
      console.warn("[InvoiceGenerationDetail] Company profile notice:", profErr?.message);
    }

    try {
      if (isOccurrenceMode) {
        // Check if invoice has ALREADY been generated for this occurrence
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

        // Fetch completed tax calculation / occurrence details
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

        // Hydrate line items if not already loaded from existing invoice
        if (!existingInvoice || !existingInvoice.items || existingInvoice.items.length === 0) {
          const rateAmt = occ?.billingAmount ?? occ?.taxableAmount ?? 0;
          const itemName = occ?.projectName
            ? `${occ.projectName} - Fixed Price Billing`
            : "Fixed Price Billing";
          const role = "Fixed Price Milestone";
          const workDate = toIsoDateOnly(occ?.billingDate || occ?.periodEndDate);

          const fixedItem = {
            id: `fixed-price-${effectiveOccurrenceId}`,
            resourceName: itemName,
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
        // Check if invoice has ALREADY been generated for this snapshot
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

        // Fetch completed tax calculation for this snapshot
        let calc = taxCalc;
        try {
          calc = await getTaxCalculation(effectiveSnapshotId);
          if (calc) {
            setTaxCalc(calc);
          }
        } catch (calcErr) {
          console.warn("[InvoiceGenerationDetail] Tax calculation fetch notice:", calcErr?.message);
        }

        // Hydrate line items if not already loaded from existing invoice
        if (!existingInvoice || !existingInvoice.items || existingInvoice.items.length === 0) {
          let loadedItems = [];

          const passedLabor = passedState.acquisitionResults?.labor;
          if (passedLabor && Array.isArray(passedLabor.timesheets) && passedLabor.timesheets.length > 0) {
            loadedItems = passedLabor.timesheets.map((t, idx) => ({
              id: t.sourceReferenceId || `item-${idx}`,
              resourceName: t.employee || t.itemName || "Timesheet Entry",
              itemName: t.employee || t.itemName || "Timesheet Entry",
              employee: t.employee || "Timesheet Entry",
              role: t.role || "Consultant",
              workDate: toIsoDateOnly(t.workDate),
              hours: t.hours || t.quantity || 0,
              quantity: t.hours || t.quantity || 0,
              rate: t.rate || 0,
              amount: t.amount || 0,
            }));
          } else {
            const pId = calc?.projectId || snapshotData?.projectId || passedState.projectId;
            const pStart = toIsoDateOnly(calc?.billingPeriodStart || snapshotData?.billingPeriodStart);
            const pEnd = toIsoDateOnly(calc?.billingPeriodEnd || snapshotData?.billingPeriodEnd);

            if (pId && pStart && pEnd) {
              try {
                const snap = await getBillingSnapshotByPeriod(pId, pStart, pEnd);
                if (snap && Array.isArray(snap.laborRecords) && snap.laborRecords.length > 0) {
                  loadedItems = snap.laborRecords.map((t, idx) => ({
                    id: t.id || `item-${idx}`,
                    resourceName: t.employee || "Timesheet Entry",
                    itemName: t.employee || "Timesheet Entry",
                    employee: t.employee || "Timesheet Entry",
                    role: t.role || "Consultant",
                    workDate: t.workDate,
                    hours: t.hours || 0,
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

          // Fallback: billable services summary from taxable amount
          if (loadedItems.length === 0) {
            const subtotalAmt = calc?.taxableAmount ?? snapshotData?.totalAmount ?? 0;
            if (subtotalAmt > 0) {
              loadedItems = [
                {
                  id: "labor-summary-1",
                  resourceName: `${calc?.projectName || snapshotData?.projectName || "Project"} Billable Services`,
                  itemName: `${calc?.projectName || snapshotData?.projectName || "Project"} Billable Services`,
                  role: "Consultant / Engineering",
                  workDate: toIsoDateOnly(calc?.billingPeriodEnd || snapshotData?.billingPeriodEnd),
                  hours: 1,
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


  if (loading && !refreshing) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader size="lg" text="Loading Invoice Generation workspace..." />
      </div>
    );
  }

  // Derived contextual fields (Authoritative from backend tax calculation, occurrence, or invoice)
  const isInvoiceGenerated = Boolean(invoice && (invoice.invoiceId || invoice.invoiceNumber));
  const isTaxCompleted = isOccurrenceMode
    ? Boolean(
        occurrenceData?.taxCalculationStatus === "COMPLETED" ||
        occurrenceData?.taxStatus === "COMPLETED" ||
        occurrenceData?.taxCalculated ||
        occurrenceData?.totalTaxAmount !== undefined ||
        occurrenceData?.grandTotal !== undefined
      )
    : Boolean(
        taxCalc?.taxCalculationStatus === "COMPLETED" ||
        taxCalc?.calculationStatus === "COMPLETED" ||
        taxCalc?.status === "COMPLETED" ||
        taxCalc?.grandTotal !== undefined ||
        taxCalc?.totalTaxAmount !== undefined
      );

  // Derived contextual fields
  const invoiceStatus = isInvoiceGenerated
    ? (invoice?.invoiceStatus || "GENERATED").toUpperCase()
    : "Draft Preview";

  const projectName =
    invoice?.projectName ||
    taxCalc?.projectName ||
    occurrenceData?.projectName ||
    snapshotData?.projectName ||
    "—";

  const projectCode =
    invoice?.projectCode ||
    snapshotData?.projectCode ||
    taxCalc?.projectCode ||
    occurrenceData?.projectCode ||
    "Not provided";

  const clientName =
    invoice?.clientName ||
    taxCalc?.clientName ||
    occurrenceData?.clientName ||
    snapshotData?.clientName ||
    "—";

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

  const paymentTerms =
    invoice?.paymentTermName ||
    snapshotData?.paymentTermName ||
    taxCalc?.paymentTermName ||
    (invoice?.paymentTermCode ? `${invoice.paymentTermCode} Days` : null) ||
    (snapshotData?.paymentTermCode ? `${snapshotData.paymentTermCode} Days` : null) ||
    (taxCalc?.paymentTermCode ? `${taxCalc.paymentTermCode} Days` : null) ||
    "Not provided";

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

  // Authoritative Preview Invoice object for rendering before backend persistence
  const previewInvoice = useMemo(() => {
    if (invoice) return invoice;
    return {
      invoiceId: null,
      invoiceNumber: null,
      invoiceStatus: "DRAFT_PREVIEW",
      isDraftPreview: true,
      snapshotId: effectiveSnapshotId,
      billingSnapshotId: effectiveSnapshotId,
      billingScheduleId: effectiveOccurrenceId,
      snapshotNumber: recordLabel,
      billingSnapshotNumber: recordLabel,
      projectId: taxCalc?.projectId || occurrenceData?.projectId || snapshotData?.projectId,
      projectCode,
      projectName,
      clientName,
      billingPeriod,
      billingPeriodStart: rawStart,
      billingPeriodEnd: rawEnd,
      currency,
      paymentTermName: paymentTerms,
      paymentTerms,
      subtotal,
      totalTax,
      grandTotal,
      taxComponents: taxCalc?.taxComponents || taxCalc?.taxBreakdown || occurrenceData?.taxComponents || [],
      taxBreakdown: taxCalc?.taxComponents || taxCalc?.taxBreakdown || occurrenceData?.taxComponents || [],
      items,
      sellerName: companyProfile?.legalName || companyProfile?.companyName,
      sellerAddress: companyProfile?.address,
      sellerGstin: companyProfile?.taxRegistrationNumber || companyProfile?.gstin,
      sellerEmail: companyProfile?.email,
      sellerPhone: companyProfile?.phoneNumber || companyProfile?.phone,
      sellerInfo: companyProfile
        ? {
            legalName: companyProfile.legalName || companyProfile.companyName,
            address: companyProfile.address,
            gstin: companyProfile.taxRegistrationNumber || companyProfile.gstin,
            email: companyProfile.email,
            phone: companyProfile.phoneNumber || companyProfile.phone,
            logoUrl: companyProfile.logoUrl,
          }
        : null,
      clientInfo: {
        clientName,
        billingAddress: snapshotData?.billingAddress || taxCalc?.billingAddress || occurrenceData?.billingAddress,
        country: snapshotData?.country || taxCalc?.country || occurrenceData?.country,
        email: snapshotData?.clientEmail || taxCalc?.clientEmail || occurrenceData?.clientEmail,
        phone: snapshotData?.clientPhone || taxCalc?.clientPhone || occurrenceData?.clientPhone,
        taxId: snapshotData?.clientTaxId || taxCalc?.clientTaxId || occurrenceData?.clientTaxId,
      },
    };
  }, [
    invoice,
    effectiveSnapshotId,
    effectiveOccurrenceId,
    recordLabel,
    taxCalc,
    occurrenceData,
    snapshotData,
    projectCode,
    projectName,
    clientName,
    billingPeriod,
    rawStart,
    rawEnd,
    currency,
    paymentTerms,
    subtotal,
    totalTax,
    grandTotal,
    items,
    companyProfile,
  ]);

  // Explicit Invoice Generation action triggered ONLY by user clicking Generate Official Invoice
  const handleGenerateInvoice = async () => {
    if (isGeneratingRef.current || generating) return;

    if (!isTaxCompleted) {
      const msg = "Tax calculation must be completed before generating an invoice.";
      setGenerateError(msg);
      showStatusToast(msg, "warning");
      return;
    }

    if (isInvoiceGenerated) {
      showStatusToast("Invoice has already been generated for this snapshot.", "info");
      return;
    }

    isGeneratingRef.current = true;
    setGenerating(true);
    setIsGenerationCompleted(false);
    setGenerateError("");
    setGenerationModalOpen(true);
    setGenerationModalState("GENERATING");

    let timerId = null;

    try {
      const minDelayPromise = new Promise((resolve) => {
        timerId = setTimeout(resolve, minPresentationDuration);
      });

      const apiPromise = isOccurrenceMode
        ? generateInvoiceForOccurrence(effectiveOccurrenceId)
        : generateInvoice(effectiveSnapshotId);

      // Coordinate single backend POST with minimum presentation duration:
      // - Fast API response (< minPresentationDuration) waits for min presentation duration
      // - Slower API response (> minPresentationDuration) resolves immediately upon API response without extra delay
      // - API failure rejects immediately via Promise.all without waiting for min presentation duration
      const [createdInvoice] = await Promise.all([apiPromise, minDelayPromise]);

      // Complete visual progress state (all 4 steps show checkmarks)
      setIsGenerationCompleted(true);
      await new Promise((r) => setTimeout(r, 250));

      // Persist the authoritative generated invoice into local state — DO NOT NAVIGATE AWAY!
      setInvoice(createdInvoice);
      if (Array.isArray(createdInvoice?.items) && createdInvoice.items.length > 0) {
        setItems(createdInvoice.items);
      }

      setGenerationModalState("GENERATED");
      showStatusToast("Invoice generated successfully.", "success");
    } catch (err) {
      console.error("[InvoiceGenerationDetail] Error generating invoice:", err);
      if (err?.response?.status === 409) {
        showStatusToast("Invoice has already been generated for this snapshot.", "info");
        try {
          const existing = await getInvoice(effectiveId);
          if (existing && (existing.invoiceId || existing.invoiceNumber)) {
            setInvoice(existing);
            if (Array.isArray(existing.items) && existing.items.length > 0) {
              setItems(existing.items);
            }
            setGenerationModalState("GENERATED");
            return;
          }
        } catch (_) {}
      }

      const msg = isOccurrenceMode
        ? getOccurrenceErrorMessage(err, "Failed to generate invoice for occurrence.")
        : getInvoiceErrorMessage(err, "Failed to generate invoice.");
      setGenerateError(msg);
      setGenerationModalState("ERROR");
      showStatusToast(msg, "error");
    } finally {
      if (timerId) {
        clearTimeout(timerId);
      }
      setGenerating(false);
      setIsGenerationCompleted(false);
      isGeneratingRef.current = false;
    }
  };

  // Submit for Approval action after generation
  const handleSubmitForApproval = async () => {
    if (!invoice?.invoiceId || submittingForApproval) return;
    setSubmittingForApproval(true);
    try {
      const updated = await submitInvoiceForApproval(invoice.invoiceId);
      showStatusToast("Invoice submitted for approval successfully.", "success");
      if (updated) {
        setInvoice((prev) => ({
          ...prev,
          ...updated,
          invoiceStatus: updated.invoiceStatus || "PENDING_APPROVAL",
        }));
      } else {
        setInvoice((prev) => ({
          ...prev,
          invoiceStatus: "PENDING_APPROVAL",
        }));
      }
    } catch (err) {
      console.error("[InvoiceGenerationDetail] Error submitting invoice for approval:", err);
      const msg = getInvoiceErrorMessage(err, "Failed to submit invoice for approval.");
      showStatusToast(msg, "error");
    } finally {
      setSubmittingForApproval(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader size="lg" text="Loading Invoice Generation draft preview..." />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* A. Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: "Home", to: "/dashboard" },
          { label: "Billing Data Acquisition", to: "/account-receivable/billing-data-acquisition/workspace" },
          { label: "Tax Calculation", to: backToTaxUrl },
          { label: "Invoice Generation" },
        ]}
      />


      {/* Page Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Invoice Generation
            </h1>
            <StatusBadge
              label={
                generating
                  ? "GENERATING"
                  : isInvoiceGenerated
                  ? (invoice?.invoiceStatus === "GENERATED" || !invoice?.invoiceStatus ? "INVOICE GENERATED" : invoiceStatus)
                  : "Draft Preview"
              }
              size="sm"
            />
            {!isInvoiceGenerated && !generating && (
              <span
                className="inline-flex items-center rounded border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-800"
                aria-label="Draft not generated"
              >
                DRAFT — NOT GENERATED
              </span>
            )}
            {isInvoiceGenerated && (
              <span
                className="inline-flex items-center rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-800"
              >
                INVOICE GENERATED
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600">
            {generating
              ? "Creating your official invoice..."
              : isInvoiceGenerated
              ? (
                <span>
                  Official authoritative invoice created.
                  {invoice?.invoiceNumber && (
                    <span className="font-mono font-bold text-indigo-700 ml-1.5">
                      {invoice.invoiceNumber}
                    </span>
                  )}
                </span>
              )
              : "Review the invoice details before generating the official invoice."}
          </p>
        </div>

        {/* Top-Right Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="small"
            onClick={() => navigate(backToTaxUrl)}
            className="flex items-center gap-1.5 text-xs text-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Tax Calculation
          </Button>

          <Button
            variant="outline"
            size="small"
            onClick={() => loadData(true)}
            disabled={refreshing || submitting || generating || submittingForApproval}
            className="flex items-center gap-1.5 text-xs text-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />{" "}
            {isInvoiceGenerated ? "Refresh" : "Refresh Preview"}
          </Button>
        </div>
      </div>

      {/* A. AR Lifecycle Stepper */}
      <InvoiceLifecycleStepper
        generationState={generating ? "GENERATING" : isInvoiceGenerated ? "GENERATED" : "DRAFT"}
        invoiceStatus={invoice?.invoiceStatus}
        backToTaxUrl={backToTaxUrl}
      />

      {/* B. Invoice Context Cards */}
      <InvoiceContextCards
        projectName={projectName}
        clientName={clientName}
        billingPeriod={billingPeriod}
        currency={currency}
      />

      {/* C. Invoice Banner (hidden while modal is generating) */}
      {!generating && (
        <InvoiceDraftBanner
          isInvoiceGenerated={isInvoiceGenerated}
          invoiceStatus={invoiceStatus}
          invoiceNumber={invoice?.invoiceNumber}
          isTaxCompleted={isTaxCompleted}
          generating={generating}
          generateError={generateError}
          onGenerateInvoice={handleGenerateInvoice}
          onSubmitForApproval={handleSubmitForApproval}
          submittingForApproval={submittingForApproval}
          onViewInvoice={() => {
            setGenerationModalState("GENERATED");
            setGenerationModalOpen(true);
          }}
          onBackToTax={() => navigate(backToTaxUrl)}
        />
      )}

      {/* D. Document-Style Invoice: rendered in all 3 states (with live isGenerating state in State B) */}
      <InvoicePreviewDocument
        invoice={invoice || previewInvoice}
        snapshotId={effectiveId}
        taxCalc={taxCalc || occurrenceData}
        snapshotData={snapshotData || occurrenceData}
        companyProfile={companyProfile}
        isGenerating={generating}
      />


      {/* E. Generation Modal (GENERATING -> GENERATED -> ERROR) */}
      <InvoiceGenerationModal
        isOpen={generationModalOpen}
        modalState={generationModalState}
        invoice={invoice}
        projectName={projectName}
        clientName={clientName}
        snapshotId={effectiveId}
        taxCalc={taxCalc || occurrenceData}
        snapshotData={snapshotData || occurrenceData}
        companyProfile={companyProfile}
        generateError={generateError}
        submittingForApproval={submittingForApproval}
        isGenerationCompleted={isGenerationCompleted}
        onClose={() => setGenerationModalOpen(false)}
        onRetry={handleGenerateInvoice}
        onSubmitForApproval={handleSubmitForApproval}
      />
    </div>
  );
}
