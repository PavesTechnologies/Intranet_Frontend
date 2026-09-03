import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Calculator, ArrowLeft, RefreshCw, FileText, ShieldCheck, AlertCircle } from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import Loader from "../../../components/ui/Loader";
import StatusBadge from "../../../components/status/statusbadge";
import BackIconButton from "../components/common/BackIconButton";
import { showStatusToast } from "../../../components/toastfy/toast";
import { formatCurrency, formatDisplayDate } from "../utils/format";

import {
  getTaxCalculation,
  getTaxCalculationErrorMessage,
} from "../services/taxCalculationService";
import { getActiveTaxRegions } from "../services/taxRateConfigurationService";
import TaxCalculationConsole from "../components/tax_calculation/TaxCalculationConsole";

const ACQUISITION_PATH = "/account-receivable/billing-data-acquisition";

const formatRatePercentage = (rate) => {
  if (rate === null || rate === undefined || rate === "") return null;
  const num = Number(rate);
  if (isNaN(num)) return `${rate}%`;
  const formatted = num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
  return `${formatted}%`;
};

export default function TaxCalculation() {
  const { snapshotId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const passedState = location.state || {};
  const [taxCalc, setTaxCalc] = useState(passedState.taxCalculation || null);
  const [loading, setLoading] = useState(Boolean(snapshotId || passedState.config?.snapshotId || passedState.config?.id) && !passedState.taxCalculation);
  const [errorMsg, setErrorMsg] = useState("");

  const config = passedState.config || {};
  const effectiveSnapshotId = snapshotId || taxCalc?.billingSnapshotId || config?.snapshotId || config?.id;

  const [taxRegions, setTaxRegions] = useState([]);

  useEffect(() => {
    getActiveTaxRegions()
      .then((regions) => setTaxRegions(regions || []))
      .catch(() => setTaxRegions([]));
  }, []);

  const loadTaxCalculationData = async () => {
    if (!effectiveSnapshotId) {
      setErrorMsg("No billing snapshot selected. Please select a billing snapshot from Billing Data Acquisition to view or calculate tax.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const data = await getTaxCalculation(effectiveSnapshotId);
      if (data) {
        setTaxCalc(data);
      } else {
        setErrorMsg("Tax calculation could not be found for this billing snapshot.");
      }
    } catch (err) {
      const msg = getTaxCalculationErrorMessage(err, "Unable to load tax calculation. Please try again.");
      setErrorMsg(msg);
      showStatusToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!taxCalc) {
      if (effectiveSnapshotId) {
        loadTaxCalculationData();
      } else {
        setLoading(false);
        setErrorMsg("No billing snapshot selected.");
      }
    }
  }, [effectiveSnapshotId]);

  // If no snapshotId exists (standalone route /account-receivable/tax-calculation), render Tax Calculation Console
  if (!effectiveSnapshotId) {
    return <TaxCalculationConsole />;
  }

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader size="lg" text="Loading tax calculation..." />
      </div>
    );
  }

  // Handle case where snapshotId was specified but backend fetch failed/returned null
  if (errorMsg || !taxCalc) {
    return (
      <div className="w-full space-y-6">
        <PageHeader
          title="Tax Calculation"
          subtitle="View tax calculation breakdown for billing snapshots"
        />

        <PageCard>
          <PageCardContent className="p-10 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Calculator className="h-7 w-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-slate-800">
                {errorMsg || "Tax calculation could not be found."}
              </h3>
              <p className="text-sm text-slate-500">
                Please verify that billing data acquisition has been completed and tax calculation was executed for this snapshot.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-3">
              <Button
                onClick={() => navigate(ACQUISITION_PATH)}
                className="bg-[#0A0082] text-white hover:bg-[#0A0082]/90 font-medium px-5"
              >
                Go to Billing Data Acquisition
              </Button>
              <Button variant="outline" onClick={loadTaxCalculationData}>
                Retry Loading
              </Button>
            </div>
          </PageCardContent>
        </PageCard>
      </div>
    );
  }

  // Derive metadata and currency
  const currency =
    taxCalc.currencyCode ||
    taxCalc.currency ||
    config.currency ||
    passedState.currency ||
    "USD";

  const projectName =
    taxCalc.projectName ||
    taxCalc.project_name ||
    config.projectName ||
    config.project ||
    passedState.projectName ||
    "Website Redesign";

  const clientName =
    taxCalc.clientName ||
    taxCalc.client_name ||
    config.client ||
    config.clientName ||
    passedState.clientName ||
    "Account Management";

  const snapshotNum =
    taxCalc.snapshotNumber ||
    taxCalc.snapshot_number ||
    config.snapshotNumber ||
    effectiveSnapshotId;

  const rawPeriodStart =
    taxCalc.billingPeriodStart ||
    taxCalc.billing_period_start ||
    taxCalc.periodStart ||
    config.periodStart ||
    config.billingPeriodStart;

  const rawPeriodEnd =
    taxCalc.billingPeriodEnd ||
    taxCalc.billing_period_end ||
    taxCalc.periodEnd ||
    config.periodEnd ||
    config.billingPeriodEnd;

  const billingPeriod =
    rawPeriodStart && rawPeriodEnd
      ? `${formatDisplayDate(rawPeriodStart)} – ${formatDisplayDate(rawPeriodEnd)}`
      : config.billingPeriod || passedState.billingPeriod || "01 Jan 2026 – 08 Jan 2027";

  const rawTaxRegion =
    taxCalc.taxRegionName ||
    taxCalc.tax_region_name ||
    taxCalc.taxRegion ||
    config.taxRegionName ||
    config.taxRegionLabel ||
    taxCalc.taxRegionId ||
    "";

  const isUuid = typeof rawTaxRegion === "string" && rawTaxRegion.includes("-") && rawTaxRegion.length > 30;
  let taxRegion = rawTaxRegion;
  if (!rawTaxRegion || isUuid) {
    const matchedRegion = taxRegions.find(
      (r) => r.taxRegionId === rawTaxRegion || r.id === rawTaxRegion
    );
    taxRegion = matchedRegion?.taxRegionName || matchedRegion?.label || "India";
  }

  // Tax Breakdown logic: Display ONLY applicable non-null components with rate > 0 or amount > 0
  const hasCgst = taxCalc.cgstAmount !== null && taxCalc.cgstAmount !== undefined && Number(taxCalc.cgstAmount) >= 0 && (taxCalc.cgstRate > 0 || taxCalc.cgstAmount > 0);
  const hasSgst = taxCalc.sgstAmount !== null && taxCalc.sgstAmount !== undefined && Number(taxCalc.sgstAmount) >= 0 && (taxCalc.sgstRate > 0 || taxCalc.sgstAmount > 0);
  const hasIgst = taxCalc.igstAmount !== null && taxCalc.igstAmount !== undefined && Number(taxCalc.igstAmount) >= 0 && (taxCalc.igstRate > 0 || taxCalc.igstAmount > 0);

  const taxableAmount = taxCalc.taxableAmount ?? acquisitionResults?.labor?.amount ?? 0;
  const totalTaxAmount = taxCalc.totalTaxAmount ?? 0;
  const grandTotal = taxCalc.grandTotal ?? (taxableAmount + totalTaxAmount);

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BackIconButton onClick={() => navigate(ACQUISITION_PATH)} label="Back to Acquisition" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Tax Calculation</h1>
              <StatusBadge label={taxCalc.status || "TAX_COMPLETED"} size="sm" />
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Snapshot: <span className="font-mono font-semibold text-slate-700">{snapshotNum}</span> &middot; Authoritative calculation result from backend
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTaxCalculationData}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Result
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(ACQUISITION_PATH)}
            className="flex items-center gap-1.5 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Acquisition
          </Button>
        </div>
      </div>

      {/* Snapshot Information Card */}
      <PageCard className="p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6 text-xs">
          <div>
            <span className="block font-medium text-slate-400 uppercase tracking-wider text-[10px]">Project</span>
            <span className="mt-0.5 block font-semibold text-slate-800 truncate" title={projectName}>
              {projectName}
            </span>
          </div>

          <div>
            <span className="block font-medium text-slate-400 uppercase tracking-wider text-[10px]">Client</span>
            <span className="mt-0.5 block font-semibold text-slate-800 truncate" title={clientName}>
              {clientName}
            </span>
          </div>

          <div>
            <span className="block font-medium text-slate-400 uppercase tracking-wider text-[10px]">Snapshot Number</span>
            <span className="mt-0.5 block font-mono font-semibold text-indigo-700">{snapshotNum}</span>
          </div>

          <div>
            <span className="block font-medium text-slate-400 uppercase tracking-wider text-[10px]">Billing Period</span>
            <span className="mt-0.5 block font-medium text-slate-700">{billingPeriod}</span>
          </div>

          <div>
            <span className="block font-medium text-slate-400 uppercase tracking-wider text-[10px]">Tax Region</span>
            <span className="mt-0.5 block font-medium text-slate-700">{taxRegion}</span>
          </div>

          <div>
            <span className="block font-medium text-slate-400 uppercase tracking-wider text-[10px]">Currency</span>
            <span className="mt-0.5 block font-mono font-bold text-slate-900">{currency}</span>
          </div>
        </div>
      </PageCard>

      {/* Workspace Grid: Commercial Value vs Tax Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Commercial Value Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <PageCard className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Calculator className="h-4 w-4 text-indigo-600" /> Commercial Value
              </span>
              <span className="text-[11px] font-medium text-slate-400">Pre-tax Summary</span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal (Billable Hours)</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(taxableAmount, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Expenses</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(0, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-slate-900 font-bold">
                <span>Taxable Amount</span>
                <span className="font-mono text-base text-indigo-900">
                  {formatCurrency(taxableAmount, currency)}
                </span>
              </div>
            </div>
          </PageCard>

          {/* Security / System Banner */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 flex items-start gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Authoritative Financial Record</p>
              <p className="mt-0.5 text-slate-500 text-[11px]">
                Tax calculation amounts are generated by the backend tax engine. This calculation is read-only and immutable for this billing snapshot.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Tax Breakdown & Grand Total (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <PageCard className="p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <FileText className="h-4 w-4 text-indigo-600" /> Tax Breakdown
              </span>
              <span className="text-[11px] font-medium text-slate-400">Applicable Rates & Amounts</span>
            </div>

            {/* Applicable Tax Items */}
            <div className="space-y-3">
              {hasCgst && (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">CGST</span>
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                      {formatRatePercentage(taxCalc.cgstRate)}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(taxCalc.cgstAmount, currency)}
                  </span>
                </div>
              )}

              {hasSgst && (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">SGST</span>
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                      {formatRatePercentage(taxCalc.sgstRate)}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(taxCalc.sgstAmount, currency)}
                  </span>
                </div>
              )}

              {hasIgst && (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">IGST</span>
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                      {formatRatePercentage(taxCalc.igstRate)}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(taxCalc.igstAmount, currency)}
                  </span>
                </div>
              )}

              {!hasCgst && !hasSgst && !hasIgst && (
                <div className="rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-500">
                  No tax components applicable for this configuration.
                </div>
              )}
            </div>

            {/* Total Tax Row */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-semibold text-slate-800">
              <span>Total Tax Amount</span>
              <span className="font-mono text-base font-bold text-slate-900">
                {formatCurrency(totalTaxAmount, currency)}
              </span>
            </div>

            {/* Grand Total Card */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 flex items-center justify-between shadow-sm">
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                  Grand Total
                </span>
                <span className="text-xs text-indigo-600">Taxable Amount + Total Tax</span>
              </div>
              <div className="font-mono text-2xl font-extrabold text-indigo-950">
                {formatCurrency(grandTotal, currency)}
              </div>
            </div>
          </PageCard>
        </div>
      </div>
    </div>
  );
}
