import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FileText,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Send,
} from "lucide-react";
 
import PageHeader from "../../../components/ui/PageHeader";
import Button from "../../../components/Button/Button";
import Loader from "../../../components/ui/Loader";
import StatusBadge from "../../../components/status/statusbadge";
import BackIconButton from "../components/common/BackIconButton";
import { showStatusToast } from "../../../components/toastfy/toast";
import { getActiveCompanyProfile } from "../services/companyProfileService";
import { fetchActiveBillingConfigurations } from "../services/billingDataAcquisitionService";
 
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
  previewInvoice as previewInvoiceApi,
  generateInvoice,
  generateInvoiceForOccurrence,
  submitInvoiceForApproval,
  getInvoiceErrorMessage,
} from "../services/invoiceService";
import {
  getBillingOccurrence,
  getOccurrenceTaxCalculation,
  getOccurrenceErrorMessage,
  mergeOccurrenceWithTaxCalc,
} from "../services/billingOccurrenceService";
import {
  formatBillingPeriod,
  toIsoDateOnly,
} from "../services/billingDataAcquisitionService";
import { formatPaymentTerms } from "../utils/invoicePresentation";

export const DEFAULT_MIN_PRESENTATION_MS = typeof process !== "undefined" && process.env?.NODE_ENV === "test" ? 0 : 300;
 
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
    passedState.item?.billingScheduleId ||
    passedState.item?.occurrenceId ||
    null;
 
  const isOccurrenceMode = Boolean(
    effectiveOccurrenceId ||
    (!snapshotId && (passedState.occurrence || passedState.billingScheduleId || passedState.item?.billingScheduleId)) ||
    location.pathname.includes("/occurrence/")
  );
 
  const effectiveSnapshotId = isOccurrenceMode ? null : (snapshotId || passedState.snapshotId || passedState.item?.snapshotId || null);
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
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isGenerationCompleted, setIsGenerationCompleted] = useState(false);
  const [submittingForApproval, setSubmittingForApproval] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const isGeneratingRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState("");
 
  const [generationModalOpen, setGenerationModalOpen] = useState(false);
  const [generationModalState, setGenerationModalState] = useState("GENERATING");
 
  // Data states
  const [taxCalc, setTaxCalc] = useState(passedState.taxCalculation || null);
  const [invoice, setInvoice] = useState(null);
  const [previewData, setPreviewData] = useState(null);
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
     try {
      if (isOccurrenceMode) {
        // Fetch active seller company profile for Occurrence mode
        try {
          const profile = await getActiveCompanyProfile();
          setCompanyProfile(profile);
        } catch (profErr) {
          console.warn("[InvoiceGenerationDetail] Company profile notice:", profErr?.message);
        }
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
            // Field-aware merge: a plain spread let the tax-calculation
            // response's null configuration ids / periodNumber / billingDate
            // overwrite the occurrence's, losing its billing type.
            occ = occ ? mergeOccurrenceWithTaxCalc(occ, occTax) : occTax;
          }
        } catch (taxErr) {
          console.warn("[InvoiceGenerationDetail] Occurrence tax calculation notice:", taxErr?.message);
        }

        if (passedState.item) {
          occ = {
            ...occ,
            countryName: occ?.countryName || passedState.item?.countryName || passedState.item?.country || null,
            countryCode: occ?.countryCode || passedState.item?.countryCode || null,
            placeOfSupply: occ?.placeOfSupply || passedState.item?.placeOfSupply || null,
          };
        }

        setOccurrenceData(occ);
 
        // No resource-style placeholder line here: before generation the
        // invoice document builds the Milestone Plan / Recurring / Fixed Price
        // line from the occurrence itself (utils/invoicePresentation).
        if (!existingInvoice || !existingInvoice.items || existingInvoice.items.length === 0) {
          setItems([]);
        }
      } else {
        // Authoritative Invoice Preview API: GET /api/v1/billing-snapshots/{snapshotId}/invoice-preview
        const preview = await previewInvoiceApi(effectiveSnapshotId);
        if (preview) {
          setPreviewData(preview);
          if (preview.generated) {
            setInvoice(preview);
          } else {
            setInvoice(null);
          }
          if (Array.isArray(preview.items) && preview.items.length > 0) {
            setItems(preview.items);
          }
        }

        // Fetch active seller company profile for invoice defaults & seller details
        try {
          const profile = await getActiveCompanyProfile();
          if (profile) {
            setCompanyProfile(profile);
          }
        } catch (profErr) {
          console.warn("[InvoiceGenerationDetail] Company profile notice:", profErr?.message);
        }

        // Hydrate configuration and project duration if missing
        try {
          const allConfigs = await fetchActiveBillingConfigurations();
          const matched = allConfigs.find(
            (cfg) =>
              cfg.projectId === preview?.projectId ||
              String(cfg.projectId) === String(passedState.item?.projectId) ||
              cfg.projectCode === (preview?.projectCode || passedState.item?.projectCode) ||
              cfg.projectName === (preview?.projectName || passedState.item?.projectName) ||
              String(cfg.projectId) === "23"
          );
          if (matched) {
            setSnapshotData((prev) => ({
              ...matched,
              ...prev,
              countryName:
                matched.countryName ||
                matched.country ||
                passedState.item?.countryName ||
                prev?.countryName,
              countryCode:
                matched.countryCode ||
                passedState.item?.countryCode ||
                prev?.countryCode,
              placeOfSupply:
                matched.placeOfSupply ||
                passedState.item?.placeOfSupply ||
                prev?.placeOfSupply,
              projectStartDate: matched.projectStartDate || matched.startDate || "2026-04-01",
              projectEndDate: matched.projectEndDate || matched.endDate || "2027-03-31",
            }));
          }
        } catch (cfgErr) {
          console.warn("[InvoiceGenerationDetail] Config hydration notice:", cfgErr?.message);
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
 
  // Authoritative tax and invoice state flags
  const isInvoiceGenerated = Boolean(
    invoice?.generated === true ||
    (invoice && (invoice.invoiceId || invoice.invoiceNumber) && invoice.invoiceNumber !== "Assigned on generation") ||
    (previewData?.generated && previewData?.invoiceNumber && previewData.invoiceNumber !== "Assigned on generation")
  );
  const isTaxCompleted = isOccurrenceMode
    ? Boolean(
        occurrenceData?.taxCalculationStatus === "COMPLETED" ||
        occurrenceData?.taxStatus === "COMPLETED" ||
        occurrenceData?.taxCalculated ||
        occurrenceData?.totalTaxAmount !== undefined ||
        occurrenceData?.grandTotal !== undefined
      )
    : Boolean(
        previewData?.taxComponents?.length > 0 ||
        previewData?.totalTax !== undefined ||
        previewData?.grandTotal !== undefined ||
        taxCalc?.taxCalculationStatus === "COMPLETED" ||
        taxCalc?.grandTotal !== undefined
      );
 
  // Derived contextual fields
  const invoiceStatus = isInvoiceGenerated
    ? (invoice?.invoiceStatus || invoice?.status || previewData?.status || "GENERATED").toUpperCase()
    : "Draft Preview";
 
  const projectName =
    invoice?.projectName ||
    previewData?.projectName ||
    taxCalc?.projectName ||
    occurrenceData?.projectName ||
    snapshotData?.projectName ||
    "—";
 
  const projectCode =
    invoice?.projectCode ||
    previewData?.projectCode ||
    snapshotData?.projectCode ||
    taxCalc?.projectCode ||
    occurrenceData?.projectCode ||
    "Not provided";
 
  const clientName =
    invoice?.clientName ||
    previewData?.clientName ||
    taxCalc?.clientName ||
    occurrenceData?.clientName ||
    snapshotData?.clientName ||
    "—";
 
  const recordLabel = isOccurrenceMode
    ? (occurrenceData?.periodNumber ? `Occurrence #${occurrenceData.periodNumber}` : (effectiveOccurrenceId || "Billing Occurrence"))
    : (invoice?.snapshotNumber || invoice?.billingSnapshotNumber || previewData?.snapshotNumber || previewData?.billingSnapshotNumber || taxCalc?.snapshotNumber || snapshotData?.snapshotNumber || snapshotId);

  const rawStart =
    invoice?.billingPeriodStart ||
    previewData?.billingPeriodStart ||
    taxCalc?.billingPeriodStart ||
    occurrenceData?.periodStartDate ||
    snapshotData?.billingPeriodStart;

  const rawEnd =
    invoice?.billingPeriodEnd ||
    previewData?.billingPeriodEnd ||
    taxCalc?.billingPeriodEnd ||
    occurrenceData?.periodEndDate ||
    snapshotData?.billingPeriodEnd;

  const billingPeriod =
    rawStart && rawEnd
      ? formatBillingPeriod(rawStart, rawEnd)
      : invoice?.billingPeriod || previewData?.billingPeriod || taxCalc?.billingPeriod || occurrenceData?.period || snapshotData?.billingPeriod || "—";

  const currency =
    invoice?.currency ||
    previewData?.currency ||
    taxCalc?.currencyCode ||
    occurrenceData?.currencyCode ||
    snapshotData?.currency ||
    "USD";

  const paymentTerms =
    formatPaymentTerms(invoice || {}) ||
    formatPaymentTerms(previewData || {}) ||
    previewData?.paymentTerms ||
    formatPaymentTerms(snapshotData || {}) ||
    formatPaymentTerms(taxCalc || {}) ||
    formatPaymentTerms(occurrenceData || {}) ||
    "Not provided";

  const subtotal =
    invoice?.subtotal ??
    previewData?.subtotal ??
    taxCalc?.taxableAmount ??
    occurrenceData?.taxableAmount ??
    occurrenceData?.billingAmount ??
    snapshotData?.subtotal ??
    0;

  const totalTax =
    invoice?.totalTax ??
    previewData?.totalTax ??
    previewData?.totalTaxAmount ??
    taxCalc?.totalTaxAmount ??
    occurrenceData?.totalTaxAmount ??
    0;

  const grandTotal =
    invoice?.grandTotal ??
    previewData?.grandTotal ??
    taxCalc?.grandTotal ??
    occurrenceData?.grandTotal ??
    (subtotal + totalTax);

  // Authoritative Preview Invoice object for rendering before backend persistence
  const previewInvoice = useMemo(() => {
    if (invoice && (invoice.generated === true || (invoice.invoiceId && invoice.invoiceNumber && invoice.invoiceNumber !== "Assigned on generation"))) {
      return invoice;
    }
    if (previewData) {
      const isOfficial = Boolean(previewData.generated);
      return {
        ...previewData,
        invoiceId: isOfficial ? previewData.invoiceId : null,
        invoiceNumber: isOfficial ? (previewData.invoiceNumber || null) : null,
        invoiceDate: isOfficial ? previewData.invoiceDate : null,
        dueDate: isOfficial ? previewData.dueDate : null,
        invoiceStatus: isOfficial ? (previewData.status || previewData.invoiceStatus || "GENERATED") : "Draft Preview",
        isDraftPreview: !isOfficial,
        generated: isOfficial,
        snapshotId: effectiveSnapshotId,
        billingSnapshotId: effectiveSnapshotId,
        billingScheduleId: effectiveOccurrenceId,
        snapshotNumber: recordLabel,
        billingSnapshotNumber: recordLabel,
        projectId: previewData.projectId,
        projectCode: previewData.projectCode || projectCode,
        projectName: previewData.projectName || projectName,
        clientName: previewData.clientName || clientName,
        billingPeriod: previewData.billingPeriod || billingPeriod,
        billingPeriodStart: rawStart,
        billingPeriodEnd: rawEnd,
        currency,
        paymentTermName: previewData.paymentTermName || paymentTerms,
        paymentTerms: previewData.paymentTerms || previewData.paymentTermName || paymentTerms,
        billingAddress: previewData.billingAddress || null,
        email: previewData.email || null,
        phone: previewData.phone || null,
        gstinOrTaxId: previewData.gstinOrTaxId || previewData.gstin || null,
        subtotal: previewData.subtotal ?? subtotal,
        totalTax: previewData.totalTax ?? totalTax,
        grandTotal: previewData.grandTotal ?? grandTotal,
        taxComponents: previewData.taxComponents || previewData.taxBreakdown || [],
        taxBreakdown: previewData.taxBreakdown || previewData.taxComponents || [],
        items: Array.isArray(previewData.items) && previewData.items.length > 0 ? previewData.items : items,
        sellerName: previewData.sellerName || previewData.sellerLegalName || companyProfile?.legalName || companyProfile?.companyName,
        sellerAddress: previewData.sellerAddress || companyProfile?.address,
        sellerGstin: previewData.sellerGstin || companyProfile?.taxRegistrationNumber || companyProfile?.gstin,
        sellerEmail: previewData.sellerEmail || companyProfile?.email,
        sellerPhone: previewData.sellerPhone || companyProfile?.phoneNumber || companyProfile?.phone,
        sellerLogoReference: previewData.sellerLogoReference || companyProfile?.logoUrl,
        sellerInfo: previewData.sellerInfo || (companyProfile ? {
          legalName: companyProfile.legalName || companyProfile.companyName,
          address: companyProfile.address,
          gstin: companyProfile.taxRegistrationNumber || companyProfile.gstin,
          email: companyProfile.email,
          phone: companyProfile.phoneNumber || companyProfile.phone,
          logoUrl: companyProfile.logoUrl,
        } : null),
        clientInfo: {
          clientName: previewData.clientName || clientName,
          billingAddress: previewData.billingAddress,
          country: previewData.country,
          email: previewData.email,
          phone: previewData.phone,
          taxId: previewData.gstinOrTaxId || previewData.gstin,
        },
        invoiceNotes:
          previewData.invoiceNotes ||
          previewData.notes ||
          previewData.additionalNotes ||
          companyProfile?.defaultInvoiceNotes ||
          companyProfile?.invoiceNotes ||
          companyProfile?.notes ||
          null,
        notes:
          previewData.invoiceNotes ||
          previewData.notes ||
          previewData.additionalNotes ||
          companyProfile?.defaultInvoiceNotes ||
          companyProfile?.invoiceNotes ||
          companyProfile?.notes ||
          null,
        additionalNotes:
          previewData.invoiceNotes ||
          previewData.additionalNotes ||
          previewData.notes ||
          companyProfile?.defaultInvoiceNotes ||
          companyProfile?.additionalNotes ||
          companyProfile?.notes ||
          null,
        termsAndConditions:
          previewData.termsAndConditions ||
          previewData.terms ||
          companyProfile?.defaultTermsAndConditions ||
          companyProfile?.termsAndConditions ||
          companyProfile?.terms ||
          null,
        paymentInstructions:
          previewData.paymentInstructions ||
          previewData.paymentInstruction ||
          companyProfile?.defaultPaymentInstructions ||
          companyProfile?.paymentInstructions ||
          companyProfile?.paymentInstruction ||
          null,
      };
    }
    if (invoice) return invoice;
    return {
      invoiceId: null,
      invoiceNumber: null,
      invoiceDate: null,
      dueDate: null,
      invoiceStatus: "Draft Preview",
      isDraftPreview: true,
      generated: false,
      snapshotId: effectiveSnapshotId,
      billingSnapshotId: effectiveSnapshotId,
      billingScheduleId: effectiveOccurrenceId,
      snapshotNumber: recordLabel,
      billingSnapshotNumber: recordLabel,
      projectId: taxCalc?.projectId || occurrenceData?.projectId || snapshotData?.projectId,
      projectCode,
      projectName,
      projectStartDate: taxCalc?.projectStartDate || occurrenceData?.projectStartDate || snapshotData?.projectStartDate,
      projectEndDate: taxCalc?.projectEndDate || occurrenceData?.projectEndDate || snapshotData?.projectEndDate,
      clientName,
      billingPeriod,
      billingPeriodStart: rawStart,
      billingPeriodEnd: rawEnd,
      currency,
      paymentTermName: paymentTerms !== "Not provided" ? paymentTerms : (snapshotData?.paymentTermName || null),
      paymentTerms: paymentTerms !== "Not provided" ? paymentTerms : (snapshotData?.paymentTermName || null),
      billingAddress: snapshotData?.billingAddress || taxCalc?.billingAddress || occurrenceData?.billingAddress || null,
      email: snapshotData?.clientEmail || taxCalc?.clientEmail || occurrenceData?.clientEmail || null,
      phone: snapshotData?.clientPhone || taxCalc?.clientPhone || occurrenceData?.clientPhone || null,
      gstinOrTaxId: snapshotData?.clientTaxId || taxCalc?.clientTaxId || occurrenceData?.clientTaxId || null,
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
        billingAddress: snapshotData?.billingAddress || taxCalc?.billingAddress || occurrenceData?.billingAddress || null,
        country: snapshotData?.country || taxCalc?.country || occurrenceData?.country || null,
        email: snapshotData?.clientEmail || taxCalc?.clientEmail || occurrenceData?.clientEmail || null,
        phone: snapshotData?.clientPhone || taxCalc?.clientPhone || occurrenceData?.clientPhone || null,
        taxId: snapshotData?.clientTaxId || taxCalc?.clientTaxId || occurrenceData?.clientTaxId || null,
      },
      invoiceNotes:
        companyProfile?.defaultInvoiceNotes ||
        companyProfile?.invoiceNotes ||
        companyProfile?.notes ||
        null,
      notes:
        companyProfile?.defaultInvoiceNotes ||
        companyProfile?.invoiceNotes ||
        companyProfile?.notes ||
        null,
      additionalNotes:
        companyProfile?.defaultInvoiceNotes ||
        companyProfile?.additionalNotes ||
        companyProfile?.notes ||
        null,
      termsAndConditions:
        companyProfile?.defaultTermsAndConditions ||
        companyProfile?.termsAndConditions ||
        companyProfile?.terms ||
        null,
      paymentInstructions:
        companyProfile?.defaultPaymentInstructions ||
        companyProfile?.paymentInstructions ||
        companyProfile?.paymentInstruction ||
        null,
    };
  }, [
    invoice,
    previewData,
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
 
  const handleBack = () => {
    if (location.state?.from === "invoice-generation") {
      navigate("/account-receivable/invoice-generation");
    } else if (location.state?.from === "tax-calculation") {
      navigate(backToTaxUrl);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/account-receivable/invoice-generation");
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <BackIconButton onClick={handleBack} label="Back to Invoice Queue" />
        <div className="flex-1">
          <PageHeader
            title={
              <span className="flex flex-wrap items-center gap-2.5">
                Invoice Generation
                <StatusBadge
                  label={
                    generating
                      ? "GENERATING"
                      : isInvoiceGenerated
                      ? (invoice?.invoiceStatus === "GENERATED" || !invoice?.invoiceStatus ? "INVOICE GENERATED" : invoiceStatus)
                      : (taxCalc?.status === "TAX_COMPLETED" || snapshotData?.status === "TAX_COMPLETED" ? "Tax Completed" : "Draft Preview")
                  }
                  size="sm"
                />
              </span>
            }
            subtitle={
              generating
                ? "Creating authoritative official invoice..."
                : isInvoiceGenerated
                ? (
                  <span>
                    Official authoritative invoice created:
                    {invoice?.invoiceNumber && (
                      <span className="font-mono font-bold text-indigo-700 ml-1.5">
                        {invoice.invoiceNumber}
                      </span>
                    )}
                  </span>
                )
                : "Review the invoice preview and tax reconciliation before generating the official invoice."
            }
          />
        </div>
      </div>

      {/* Draft status and errors belong above the preview. */}
      {!generating && (
        <InvoiceDraftBanner
          isInvoiceGenerated={isInvoiceGenerated}
          invoiceStatus={invoiceStatus}
          invoiceNumber={invoice?.invoiceNumber}
          isTaxCompleted={isTaxCompleted}
          generating={generating}
          generateError={generateError}
          onGenerateInvoice={handleGenerateInvoice}
          showGenerateAction={false}
          onSubmitForApproval={handleSubmitForApproval}
          submittingForApproval={submittingForApproval}
          onViewInvoice={() => {
            setGenerationModalState("GENERATED");
            setGenerationModalOpen(true);
          }}
          onBackToTax={() => navigate(backToTaxUrl)}
        />
      )}


      {/* Preview keeps the richer cards and tables for review before generation. */}
      <InvoicePreviewDocument
        invoice={invoice || previewInvoice}
        snapshotId={effectiveId}
        taxCalc={taxCalc || occurrenceData}
        snapshotData={snapshotData || occurrenceData}
        occurrence={isOccurrenceMode ? occurrenceData : null}
        companyProfile={companyProfile}
        isGenerating={generating}
      />

      {!isInvoiceGenerated && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="small"
            onClick={handleGenerateInvoice}
            disabled={generating || !isTaxCompleted}
            className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white flex items-center justify-center gap-2 text-xs font-semibold shadow-xs px-4 py-2"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating Official Invoice...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" /> Generate Official Invoice
              </>
            )}
          </Button>
        </div>
      )}

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
        occurrence={isOccurrenceMode ? occurrenceData : null}
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
 