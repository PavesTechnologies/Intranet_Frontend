import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { PageCard } from "../../../../components/Cards/PageCard";
import Loader from "../../../../components/ui/Loader";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { formatDisplayDate } from "../../utils/format";
import {
  PIPELINE_STAGES,
  getOccurrenceBillingType,
  getOccurrenceStage,
  formatFullPeriod,
} from "../../utils/taxPipeline";
import BackIconButton from "../common/BackIconButton";
import TaxCalculationDetailView from "./TaxCalculationDetailView";

import {
  getBillingOccurrence,
  getOccurrenceTaxCalculation,
  calculateOccurrenceTax,
  getOccurrenceErrorMessage,
  mergeOccurrenceWithTaxCalc,
} from "../../services/billingOccurrenceService";
import {
  getActiveTaxRateConfigurations,
  getTaxRateConfigurationsByTaxRegion,
} from "../../services/taxRateConfigurationService";

const CONSOLE_PATH = "/account-receivable/tax-calculation";

/**
 * Tax Calculation detail view for a Milestone Plan / Recurring Billing
 * Occurrence. Renders through the same TaxCalculationDetailView as the T&M
 * snapshot detail (TaxCalculation.jsx) so both billing flows share one
 * layout, but reads/writes exclusively through the BillingOccurrenceController
 * endpoints — it never touches the billing-snapshot tax APIs.
 */
export default function OccurrenceTaxCalculationDetail({ occurrenceId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const passedState = location.state || {};

  const [occurrence, setOccurrence] = useState(passedState.occurrence || null);
  const [taxConfig, setTaxConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState("");

  const loadOccurrenceDetail = async () => {
    setLoading(true);
    setCalcError("");
    try {
      const base = await getBillingOccurrence(occurrenceId);
      let merged = base;

      const periodStatusUpper = (base?.periodStatus || "").toUpperCase();
      const taxStatusUpper = (base?.taxStatus || "").toUpperCase();
      const calcStatusUpper = (base?.taxCalculationStatus || "").toUpperCase();
      const isCalculated =
        periodStatusUpper === "TAX_CALCULATED" ||
        taxStatusUpper === "TAX_CALCULATED" ||
        taxStatusUpper === "CALCULATED" ||
        calcStatusUpper === "CALCULATED" ||
        base?.isInvoiced;

      if (base && isCalculated) {
        // If taxComponents or totalTaxAmount are not yet present on base, fetch from tax-calculation endpoint
        if (!base.taxComponents?.length || base.totalTaxAmount === null) {
          try {
            const taxCalc = await getOccurrenceTaxCalculation(occurrenceId);
            if (taxCalc) merged = mergeOccurrenceWithTaxCalc(base, taxCalc);
          } catch (err) {
            console.log("[OccurrenceTaxCalculationDetail] No secondary tax calculation response, using occurrence data.");
          }
        }
      }

      setOccurrence(merged);

      // Read-only GET of applicable tax configuration for this occurrence's tax region
      try {
        const regionId = merged?.taxRegionId || base?.taxRegionId;
        const regionCode = merged?.taxRegionCode || base?.taxRegionCode;
        const regionName = merged?.taxRegionName || base?.taxRegionName;

        if (regionId) {
          const configs = await getTaxRateConfigurationsByTaxRegion(regionId);
          if (Array.isArray(configs) && configs.length > 0) {
            setTaxConfig(configs.find((c) => c.active) || configs[0]);
          }
        } else if (regionCode || regionName) {
          const allActive = await getActiveTaxRateConfigurations();
          const match = allActive.find(
            (c) =>
              (regionCode && c.taxRegionCode?.toUpperCase() === regionCode.toUpperCase()) ||
              (regionName && c.taxRegionName?.toUpperCase() === regionName.toUpperCase())
          );
          if (match) setTaxConfig(match);
        }
      } catch (e) {
        console.warn("[OccurrenceTaxCalculationDetail] Could not load tax configuration preview:", e?.message);
      }
    } catch (err) {
      showStatusToast(getOccurrenceErrorMessage(err, "Unable to load billing occurrence."), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (occurrenceId) {
      loadOccurrenceDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occurrenceId]);

  const handleCalculateTax = async () => {
    if (!occurrenceId || calculating) return;

    setCalculating(true);
    setCalcError("");
    try {
      const calcResult = await calculateOccurrenceTax(occurrenceId);
      showStatusToast("Tax calculation completed successfully.", "success");
      // Immediately merge the calculate POST response into state
      if (calcResult) {
        setOccurrence((prev) => mergeOccurrenceWithTaxCalc(prev, calcResult));
      }
      // Re-fetch authoritative occurrence from GET /api/billing-occurrences/{id}
      await loadOccurrenceDetail();
    } catch (err) {
      const msg = getOccurrenceErrorMessage(err, "Tax calculation failed. Please review tax configuration.");
      setCalcError(msg);
      showStatusToast(msg, "error");
    } finally {
      setCalculating(false);
    }
  };

  const handleGenerateInvoice = () => {
    if (!occurrenceId || !isTaxCompleted) return;
    navigate(`/account-receivable/invoice-generation/occurrence/${occurrence?.billingScheduleId || occurrenceId}`, {
      state: {
        from: "tax-calculation",
        source: "tax-calculation",
        occurrenceId: occurrence?.billingScheduleId || occurrenceId,
        billingScheduleId: occurrence?.billingScheduleId || occurrenceId,
        occurrence,
      },
    });
  };

  const handleViewInvoice = () => {
    navigate(`/account-receivable/invoices/occurrence/${occurrence?.billingScheduleId || occurrenceId}`, {
      state: {
        from: "tax-calculation",
        source: "tax-calculation",
        occurrenceId: occurrence?.billingScheduleId || occurrenceId,
        occurrence,
      },
    });
  };

  if (loading && !occurrence) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader size="lg" text="Loading billing occurrence..." />
      </div>
    );
  }

  if (!occurrence) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex items-center gap-3">
          <BackIconButton onClick={() => navigate(CONSOLE_PATH)} label="Back to Tax Calculation" />
          <h1 className="text-lg font-semibold text-slate-900">Tax Calculation</h1>
        </div>
        <PageCard>
          <div className="p-6 text-center text-sm text-slate-500">
            This billing occurrence could not be found.
          </div>
        </PageCard>
      </div>
    );
  }

  const currency = occurrence.currencyCode || "USD";
  const billingType = getOccurrenceBillingType(occurrence);

  const components = Array.isArray(occurrence.taxComponents)
    ? occurrence.taxComponents
    : Array.isArray(occurrence.components)
    ? occurrence.components
    : [];

  // One display status from the same backend fields this page has always
  // used (isInvoiced / periodStatus / taxStatus / taxCalculationStatus).
  const stage = getOccurrenceStage(occurrence);
  const isTaxCompleted = stage === PIPELINE_STAGES.TAX_CALCULATED || stage === PIPELINE_STAGES.INVOICED;
  const isReady = stage === PIPELINE_STAGES.READY_FOR_TAX;
  const statusLabel = stage
    ? undefined
    : String(occurrence.periodStatus || occurrence.taxStatus || "—").replace(/_/g, " ");

  const billingAmount =
    occurrence.billingAmount !== null && occurrence.billingAmount !== undefined
      ? occurrence.billingAmount
      : occurrence.taxableAmount !== null && occurrence.taxableAmount !== undefined
      ? occurrence.taxableAmount
      : 0;

  const taxableAmount =
    occurrence.taxableAmount !== null && occurrence.taxableAmount !== undefined
      ? occurrence.taxableAmount
      : occurrence.billingAmount !== null && occurrence.billingAmount !== undefined
      ? occurrence.billingAmount
      : 0;

  const totalTaxAmount = occurrence.totalTaxAmount ?? 0;
  const grandTotal = occurrence.grandTotal ?? (isTaxCompleted ? taxableAmount + totalTaxAmount : null);

  const contextFields = [
    { label: "Billing Period", value: formatFullPeriod(occurrence.periodStartDate, occurrence.periodEndDate) },
    { label: "Billing Date", value: formatDisplayDate(occurrence.billingDate) },
    occurrence.taxRegionName && { label: "Tax Region", value: occurrence.taxRegionName },
    occurrence.primaryLocation && { label: "Primary Location", value: occurrence.primaryLocation },
  ];

  // Applicable tax configuration (read-only preview) for a record awaiting calculation.
  const configParts = isReady
    ? [
        occurrence.taxRegionName || taxConfig?.taxRegionLabel,
        taxConfig?.taxRegime || "GST",
        taxConfig?.cgstRate !== null && taxConfig?.cgstRate !== undefined ? `CGST ${taxConfig.cgstRate}%` : null,
        taxConfig?.sgstRate !== null && taxConfig?.sgstRate !== undefined ? `SGST ${taxConfig.sgstRate}%` : null,
        taxConfig?.igstRate !== null && taxConfig?.igstRate !== undefined ? `IGST ${taxConfig.igstRate}%` : null,
      ].filter(Boolean)
    : [];

  const actionBar = occurrence.isInvoiced
    ? {
        title: "Invoice Generated",
        description: occurrence.invoiceDate
          ? `Invoiced on ${formatDisplayDate(occurrence.invoiceDate)}`
          : "An invoice has been generated for this billing occurrence.",
        action: { label: "View Invoice", onClick: handleViewInvoice },
      }
    : isTaxCompleted
    ? {
        title: "Tax Calculation Verified",
        description: "Ready to Generate Invoice",
        action: { label: "Proceed to Invoice Generation", onClick: handleGenerateInvoice },
      }
    : isReady
    ? {
        title: "Ready for Tax Calculation",
        description: "Billing amount is confirmed. Calculate tax to compute the tax components.",
        action: {
          label: "Calculate Tax",
          loadingLabel: "Calculating Tax...",
          loading: calculating,
          onClick: handleCalculateTax,
        },
      }
    : {
        title: "Awaiting Tax Pending Status",
        description: "The scheduler moves this occurrence to tax-pending automatically when it becomes due.",
      };

  return (
    <TaxCalculationDetailView
      onBack={() => navigate(CONSOLE_PATH)}
      billingType={billingType}
      stage={stage || PIPELINE_STAGES.UPCOMING}
      statusLabel={statusLabel}
      project={occurrence.projectName}
      client={occurrence.clientName}
      contextFields={contextFields}
      currency={currency}
      billingAmount={billingAmount}
      taxableAmount={taxableAmount}
      totalTaxAmount={totalTaxAmount}
      grandTotal={grandTotal}
      isTaxCompleted={isTaxCompleted}
      components={components}
      pendingMessage={
        isReady
          ? "Tax has not been calculated for this billing occurrence yet."
          : "This occurrence has not yet reached the tax-pending stage."
      }
      pendingDetail={
        configParts.length > 0 ? (
          <p className="text-xs text-slate-400">Applicable configuration: {configParts.join(" · ")}</p>
        ) : null
      }
      summaryNotes={[occurrence.taxCalculatedAt ? `Calculated on ${formatDisplayDate(occurrence.taxCalculatedAt)}` : null]}
      calcError={calcError}
      actionBar={actionBar}
    />
  );
}
