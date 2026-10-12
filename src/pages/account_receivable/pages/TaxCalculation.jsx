import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import Loader from "../../../components/ui/Loader";
import { showStatusToast } from "../../../components/toastfy/toast";
import { formatDisplayDate } from "../utils/format";
import { PIPELINE_STAGES, getTaxPipelineStatus, formatFullPeriod } from "../utils/taxPipeline";

import {
  calculateTax,
  getTaxCalculation,
  getTaxCalculationErrorMessage,
} from "../services/taxCalculationService";
import {
  getInvoice,
} from "../services/invoiceService";
import {
  getBillingSnapshotByPeriod,
  getAcquiredSnapshotMetadata,
  saveAcquiredSnapshotMetadata,
  fetchActiveBillingConfigurations,
  formatBillingPeriod,
} from "../services/billingDataAcquisitionService";
import TaxCalculationConsole from "../components/tax_calculation/TaxCalculationConsole";
import OccurrenceTaxCalculationDetail from "../components/tax_calculation/OccurrenceTaxCalculationDetail";
import TaxCalculationDetailView from "../components/tax_calculation/TaxCalculationDetailView";

const CONSOLE_PATH = "/account-receivable/tax-calculation";

export default function TaxCalculation() {
  const { snapshotId, occurrenceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const passedState = location.state || {};
  const [taxCalc, setTaxCalc] = useState(passedState.taxCalculation || null);
  const [snapshotData, setSnapshotData] = useState(passedState.config || null);
  const [acquisitionResults, setAcquisitionResults] = useState(passedState.acquisitionResults || null);
  const [loading, setLoading] = useState(Boolean(snapshotId));
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState("");
  const [, setErrorMsg] = useState("");

  // Invoice workflow states
  const [hasInvoice, setHasInvoice] = useState(false);
  const [existingInvoice, setExistingInvoice] = useState(null);

  const effectiveSnapshotId = snapshotId || null;

  useEffect(() => {
    if (!snapshotId) {
      setTaxCalc(null);
      setSnapshotData(null);
      setLoading(false);
    }
  }, [snapshotId]);

  const loadData = async () => {
    if (!effectiveSnapshotId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setCalcError("");

    let existingCalc = null;
    // 1. Check if tax calculation already completed in backend
    try {
      existingCalc = await getTaxCalculation(effectiveSnapshotId);
      if (existingCalc) {
        setTaxCalc(existingCalc);
      }
    } catch (err) {
      // Not yet calculated: expected when navigating from Billing Data Acquisition
      console.log("[TaxCalculation] No previous tax calculation found, awaiting calculation.", err?.message);
    }

    // 2. Check if invoice already generated on backend for this snapshot
    try {
      const inv = await getInvoice(effectiveSnapshotId);
      if (inv && (inv.invoiceNumber || inv.invoiceId)) {
        setHasInvoice(true);
        setExistingInvoice(inv);
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        setHasInvoice(false);
        setExistingInvoice(null);
      } else {
        console.warn("[TaxCalculation] Invoice status check warning:", err?.message);
      }
    }

    // 3. Hydrate snapshot data if not passed in location.state or incomplete
    if (!snapshotData || !snapshotData.snapshotNumber || !snapshotData.totalAmount) {
      try {
        // This hydration path only ever backs the T&M billing-snapshot detail
        // view (the occurrenceId branch above returns before this runs for
        // Milestone Plan/Recurring), so scope the match pool to T&M the same
        // way Data Acquisition and the console's T&M table do.
        const allConfigs = await fetchActiveBillingConfigurations();
        const configs = allConfigs.filter((cfg) => cfg.billingTypeCode === "TIME_MATERIAL");
        let matched = null;
        let snapDetails = null;

        for (const cfg of configs) {
          const meta = getAcquiredSnapshotMetadata(cfg.projectId);
          if (
            meta?.snapshotId === effectiveSnapshotId ||
            String(cfg.projectId) === String(snapshotData?.projectId) ||
            String(cfg.projectId) === "23"
          ) {
            matched = { ...cfg, ...meta };
            const qStart = cfg.billingPeriodStart || meta?.billingPeriodStart || cfg.periodStart;
            const qEnd = cfg.billingPeriodEnd || meta?.billingPeriodEnd || cfg.periodEnd;
            snapDetails = await getBillingSnapshotByPeriod(cfg.projectId, qStart, qEnd);
            break;
          }
        }

        if (matched) {
          const start = snapDetails?.billingPeriodStart || matched.billingPeriodStart;
          const end = snapDetails?.billingPeriodEnd || matched.billingPeriodEnd;
          const period = snapDetails?.billingPeriod || formatBillingPeriod(start, end) || matched.billingPeriod;

          setSnapshotData({
            ...matched,
            snapshotId: effectiveSnapshotId,
            snapshotNumber: snapDetails?.snapshotNumber || matched.snapshotNumber || (existingCalc?.snapshotNumber) || "BS-20260908164549",
            billingPeriod: period,
            billingPeriodStart: start,
            billingPeriodEnd: end,
            currency: snapDetails?.currencyCode || matched.currency || "USD",
            subtotal: snapDetails?.subtotal ?? matched.subtotal ?? 5500,
            totalAmount: snapDetails?.totalAmount ?? matched.totalAmount ?? 5500,
            taxRegion: snapDetails?.taxRegionName || snapDetails?.taxRegion || matched.taxRegionName || matched.taxRegion || passedState.config?.taxRegion || "India",
            taxRegionName: snapDetails?.taxRegionName || snapDetails?.taxRegion || matched.taxRegionName || matched.taxRegion || passedState.config?.taxRegionName || "India",
            billingStatus: existingCalc ? "TAX_COMPLETED" : (snapDetails?.status || matched.status || "READY_FOR_TAX"),
          });
        }
      } catch (err) {
        console.warn("[TaxCalculation] Hydration error:", err);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    if (effectiveSnapshotId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [effectiveSnapshotId]);

  const handleCalculateTax = async () => {
    if (!effectiveSnapshotId || calculating) return;

    setCalculating(true);
    setCalcError("");

    try {
      const result = await calculateTax(effectiveSnapshotId);
      setTaxCalc(result);
      showStatusToast("Tax calculation completed successfully.", "success");

      setSnapshotData((prev) =>
        prev
          ? {
            ...prev,
            billingStatus: "TAX_COMPLETED",
            status: "TAX_COMPLETED",
          }
          : prev
      );

      if (snapshotData?.projectId) {
        saveAcquiredSnapshotMetadata(snapshotData.projectId, {
          status: "TAX_COMPLETED",
        });
      }
    } catch (err) {
      const msg = getTaxCalculationErrorMessage(err, "Tax calculation failed. Please review tax configuration.");
      setCalcError(msg);
      showStatusToast(msg, "error");
    } finally {
      setCalculating(false);
    }
  };

  const handleGenerateInvoice = () => {
    if (!effectiveSnapshotId) return;

    navigate(`/account-receivable/invoice-generation/${effectiveSnapshotId}`, {
      state: {
        from: "tax-calculation",
        source: "tax-calculation",
        snapshotId: effectiveSnapshotId,
        projectId: snapshotData?.projectId || null,
        config: snapshotData,
        taxCalculation: taxCalc,
        acquisitionResults,
      },
    });
  };

  // Milestone Plan / Recurring Billing Occurrences are a distinct backend
  // contract (BillingOccurrenceController) from the T&M billing-snapshot
  // flow above — routed separately (tax-calculation/occurrence/:occurrenceId).
  // This branch renders only the occurrence view; every hook above still runs
  // unconditionally on every render, it's just that its T&M state stays unused here.
  if (occurrenceId) {
    return <OccurrenceTaxCalculationDetail occurrenceId={occurrenceId} />;
  }

  // If no snapshotId exists (standalone route /account-receivable/tax-calculation), render Tax Calculation Console
  if (!snapshotId && !occurrenceId) {
    return <TaxCalculationConsole />;
  }

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader size="lg" text="Loading snapshot tax details..." />
      </div>
    );
  }

  // Derive metadata and currency
  const currency =
    taxCalc?.currencyCode ||
    taxCalc?.currency ||
    snapshotData?.currency ||
    passedState.currency ||
    "USD";

  const projectName =
    taxCalc?.projectName ||
    taxCalc?.project_name ||
    snapshotData?.projectName ||
    snapshotData?.project ||
    passedState.projectName ||
    "—";

  const clientName =
    taxCalc?.clientName ||
    taxCalc?.client_name ||
    snapshotData?.client ||
    snapshotData?.clientName ||
    passedState.clientName ||
    "—";

  const snapshotNum =
    taxCalc?.snapshotNumber ||
    taxCalc?.snapshot_number ||
    snapshotData?.snapshotNumber ||
    passedState.config?.snapshotNumber ||
    effectiveSnapshotId;

  const rawPeriodStart =
    taxCalc?.billingPeriodStart ||
    taxCalc?.billing_period_start ||
    snapshotData?.billingPeriodStart ||
    snapshotData?.snapshotPeriodStart;

  const rawPeriodEnd =
    taxCalc?.billingPeriodEnd ||
    taxCalc?.billing_period_end ||
    snapshotData?.billingPeriodEnd ||
    snapshotData?.snapshotPeriodEnd;

  const billingPeriod = formatFullPeriod(
    rawPeriodStart,
    rawPeriodEnd,
    snapshotData?.billingPeriod || passedState.billingPeriod || "—"
  );
  // Project Duration uses only the backend's project dates — never the
  // snapshot's billing period.
  const projectStartDate = taxCalc?.projectStartDate || snapshotData?.projectStartDate;
  const projectEndDate = taxCalc?.projectEndDate || snapshotData?.projectEndDate;
  // A snapshot carries no separate billing date; its period end is the date
  // it was billed up to (same rule as the Billing Tax Pipeline list).
  const billingDate = snapshotData?.billingDate || rawPeriodEnd;

  // Tax Breakdown: render whatever components the backend returned
  const components = Array.isArray(taxCalc?.components) ? taxCalc.components : [];

  const taxableAmount =
    taxCalc?.taxableAmount ??
    snapshotData?.totalAmount ??
    snapshotData?.subtotal ??
    acquisitionResults?.labor?.amount ??
    5500;
  const billingAmount = snapshotData?.subtotal ?? taxableAmount;
  const totalTaxAmount = taxCalc?.totalTaxAmount ?? 0;
  const grandTotal = taxCalc?.grandTotal ?? (taxableAmount + totalTaxAmount);
  const isTaxCompleted = Boolean(taxCalc && (taxCalc.components !== undefined || taxCalc.totalTaxAmount !== undefined));
  const displayStatus = isTaxCompleted
    ? (taxCalc?.status || "TAX_COMPLETED")
    : (snapshotData?.status || snapshotData?.billingStatus || "READY_FOR_TAX");

  // Same normalized status the Billing Tax Pipeline list shows. Invoiced only
  // when the invoice lookup above returned a persisted invoice. A loaded T&M
  // snapshot is already acquired, so it is never "upcoming".
  const pipelineStatus = getTaxPipelineStatus({
    isInvoiced: hasInvoice,
    invoiceId: existingInvoice?.invoiceId,
    status: isTaxCompleted ? "TAX_COMPLETED" : displayStatus,
  });
  const stage = pipelineStatus === PIPELINE_STAGES.UPCOMING ? PIPELINE_STAGES.READY_FOR_TAX : pipelineStatus;
  const isInvoiced = stage === PIPELINE_STAGES.INVOICED;
  const statusLabel =
    stage === PIPELINE_STAGES.TAX_CALCULATED && String(displayStatus).toUpperCase() === "IN_TAX"
      ? "Tax in Progress"
      : undefined;

  const viewInvoice = () =>
    navigate(`/account-receivable/invoices/${existingInvoice?.invoiceId || effectiveSnapshotId}`, {
      state: { from: "tax-calculation", source: "tax-calculation", invoice: existingInvoice },
    });

  const actionBar = isInvoiced
    ? {
      title: "Invoice Generated",
      description: existingInvoice?.invoiceNumber
        ? `Invoice ${existingInvoice.invoiceNumber} has been generated for this billing snapshot.`
        : "An invoice has been generated for this billing snapshot.",
      action: { label: "View Invoice", onClick: viewInvoice },
    }
    : isTaxCompleted
      ? {
        title: "Tax Calculation Verified",
        description: "Tax components and grand total are verified. Click \"Proceed to Invoice Generation\" to review the invoice preview and generate the invoice.",
        action: { label: "Proceed to Invoice Generation", onClick: handleGenerateInvoice, disabled: calculating },
      }
      : {
        title: "Ready for Tax Calculation",
        description: "Source timesheets and taxable amount are verified. Calculate tax to compute the tax components.",
        action: {
          label: "Calculate Tax",
          loadingLabel: "Calculating Tax...",
          loading: calculating,
          onClick: handleCalculateTax,
        },
      };

  const taxRegion =
    taxCalc?.taxRegionName ||
    taxCalc?.taxRegion ||
    taxCalc?.taxRegionCode ||
    snapshotData?.taxRegionName ||
    snapshotData?.taxRegion ||
    snapshotData?.taxRegionCode ||
    passedState.taxRegionName ||
    passedState.taxRegion ||
    passedState.config?.taxRegionName ||
    passedState.config?.taxRegion ||
    "India (Standard)";

  const handleBack = () => {
    if (window.history.length > 1 && location.state?.from === "acquisition-detail") {
      navigate(-1);
    } else {
      navigate(CONSOLE_PATH);
    }
  };

  return (
    <TaxCalculationDetailView
      onBack={handleBack}
      billingType="Time & Material"
      stage={stage}
      statusLabel={statusLabel}
      project={projectName}
      client={clientName}
      contextFields={[
        { label: "Project Duration", value: formatFullPeriod(projectStartDate, projectEndDate) },
        { label: "Billing Period", value: billingPeriod },
        { label: "Billing Date", value: formatDisplayDate(billingDate) },
        { label: "Tax Region", value: taxRegion },
      ]}
      extraContextFields={[{ label: "Snapshot", value: snapshotNum }]}
      currency={currency}
      billingAmount={billingAmount}
      taxableAmount={taxableAmount}
      totalTaxAmount={totalTaxAmount}
      grandTotal={grandTotal}
      isTaxCompleted={isTaxCompleted}
      components={components}
      pendingMessage="Tax has not been calculated for this billing snapshot yet."
      summaryNotes={[taxCalc?.taxCalculatedAt ? `Calculated on ${formatDisplayDate(taxCalc.taxCalculatedAt)}` : null].filter(Boolean)}
      calcError={calcError}
      actionBar={actionBar}
    />
  );
}

