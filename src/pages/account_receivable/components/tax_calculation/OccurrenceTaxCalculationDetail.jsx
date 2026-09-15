import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  RefreshCw,
  FileText,
  ShieldCheck,
  Calculator,
  Loader2,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

import { PageCard } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import Loader from "../../../../components/ui/Loader";
import StatusBadge from "../../../../components/status/statusbadge";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { formatCurrency, formatDisplayDate } from "../../utils/format";

import {
  getBillingOccurrence,
  getOccurrenceTaxCalculation,
  calculateOccurrenceTax,
  getOccurrenceErrorMessage,
} from "../../services/billingOccurrenceService";

const CONSOLE_PATH = "/account-receivable/tax-calculation";

const formatRatePercentage = (rate) => {
  if (rate === null || rate === undefined || rate === "") return null;
  const num = Number(rate);
  if (Number.isNaN(num)) return null;
  return `${num.toFixed(2)}%`;
};

// Applicability is decided entirely by the backend tax engine; this only
// maps known enum values to a readable label and falls back to a generic
// title-case conversion so an unrecognized future value never breaks the UI.
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

// Billing Type is a display label only — derived from the backend's own
// scheduleType, falling back to which configuration id was returned.
const humanizeBillingType = (occurrence) => {
  const raw = String(occurrence?.scheduleType || "").trim().toUpperCase();
  if (raw.includes("RECUR")) return "Recurring";
  if (raw.includes("FIXED")) return "Fixed Price";
  if (occurrence?.recurringConfigurationId) return "Recurring";
  if (occurrence?.billingConfigurationId) return "Fixed Price";
  return raw ? raw.replace(/_/g, " ") : "Billing Occurrence";
};

function Field({ label, children }) {
  return (
    <div>
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="mt-0.5 block truncate text-sm font-semibold text-slate-800" title={typeof children === "string" ? children : undefined}>
        {children || "—"}
      </span>
    </div>
  );
}

/**
 * Tax Calculation detail view for a Fixed Price / Recurring Billing
 * Occurrence. Mirrors the layout of the T&M snapshot detail view
 * (TaxCalculation.jsx) so both billing flows share one visual language,
 * but reads/writes exclusively through the BillingOccurrenceController
 * endpoints — it never touches the billing-snapshot tax APIs.
 */
export default function OccurrenceTaxCalculationDetail({ occurrenceId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const passedState = location.state || {};

  const [occurrence, setOccurrence] = useState(passedState.occurrence || null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState("");

  const loadOccurrenceDetail = async () => {
    setLoading(true);
    setCalcError("");
    try {
      const base = await getBillingOccurrence(occurrenceId);
      let merged = base;

      const taxStatusUpper = (base?.taxStatus || "").toUpperCase();
      if (base && (taxStatusUpper === "TAX_CALCULATED" || base.isInvoiced)) {
        try {
          const taxCalc = await getOccurrenceTaxCalculation(occurrenceId);
          if (taxCalc) merged = { ...base, ...taxCalc };
        } catch (err) {
          // Tax calculation not yet retrievable — show the base occurrence as-is.
          console.log("[OccurrenceTaxCalculationDetail] No tax calculation found for occurrence.");
        }
      }

      setOccurrence(merged);
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
      await calculateOccurrenceTax(occurrenceId);
      showStatusToast("Tax calculation completed successfully.", "success");
      await loadOccurrenceDetail();
    } catch (err) {
      const msg = getOccurrenceErrorMessage(err, "Tax calculation failed. Please review tax configuration.");
      setCalcError(msg);
      showStatusToast(msg, "error");
    } finally {
      setCalculating(false);
    }
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
        <Breadcrumb items={[{ label: "Tax Calculation", to: CONSOLE_PATH }, { label: "Not Found" }]} />
        <PageCard>
          <div className="p-8 text-center text-sm text-slate-500">
            This billing occurrence could not be found.
          </div>
        </PageCard>
      </div>
    );
  }

  const currency = occurrence.currencyCode || "USD";
  const billingType = humanizeBillingType(occurrence);
  const period =
    occurrence.periodStartDate || occurrence.periodEndDate
      ? `${formatDisplayDate(occurrence.periodStartDate)} - ${formatDisplayDate(occurrence.periodEndDate)}`
      : "—";

  const components = Array.isArray(occurrence.taxComponents) ? occurrence.taxComponents : [];
  const taxStatus = (occurrence.taxStatus || "").toUpperCase();
  const isTaxCompleted = taxStatus === "TAX_CALCULATED" || occurrence.isInvoiced;
  const isReady = taxStatus === "TAX_PENDING";

  const taxableAmount = occurrence.taxableAmount ?? occurrence.billingAmount ?? 0;
  const totalTaxAmount = occurrence.totalTaxAmount ?? 0;
  const grandTotal = occurrence.grandTotal ?? (isTaxCompleted ? taxableAmount + totalTaxAmount : null);
  const displayStatus = occurrence.isInvoiced ? "INVOICED" : occurrence.taxStatus || occurrence.periodStatus;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <Breadcrumb
        items={[
          { label: "Tax Calculation", to: CONSOLE_PATH },
          { label: `${billingType} Occurrence` },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Tax Calculation</h1>
            <span className="inline-block rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              {billingType}
            </span>
            <StatusBadge label={displayStatus} size="sm" />
          </div>
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{occurrence.projectName || "—"}</span>
            <span className="mx-1.5 text-slate-300">&middot;</span>
            {occurrence.clientName || "—"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="small"
            onClick={() => navigate(CONSOLE_PATH)}
            className="flex items-center gap-1.5 text-xs text-slate-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Tax Workspace
          </Button>

          {isTaxCompleted ? (
            <Button variant="outline" size="small" onClick={loadOccurrenceDetail} className="flex items-center gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          ) : isReady ? (
            <Button
              variant="primary"
              size="small"
              onClick={handleCalculateTax}
              disabled={calculating}
              className="flex items-center gap-1.5 text-xs font-semibold bg-[#0A0082] hover:bg-[#0A0082]/90 text-white shadow-sm"
            >
              {calculating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculating Tax...
                </>
              ) : (
                <>
                  <Calculator className="h-3.5 w-3.5" /> Calculate Tax
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {calcError && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 shadow-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-600 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-rose-900">Tax Calculation Error</div>
            <div className="font-mono text-rose-800">{calcError}</div>
            <div className="text-[11px] text-rose-600 pt-1">
              Backend tax engine rejected calculation. Please review the tax rate configuration for this occurrence's jurisdiction.
            </div>
          </div>
        </div>
      )}

      {/* Financial statement */}
      <PageCard className="divide-y divide-slate-100">
        {/* Calculation Context */}
        <div className="p-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Calculation Context</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Field label="Billing Type">{billingType}</Field>
            <Field label="Project">{occurrence.projectName}</Field>
            <Field label="Client">{occurrence.clientName}</Field>
            <Field label="Billing Period">{period}</Field>
            <Field label="Billing Date">{formatDisplayDate(occurrence.billingDate)}</Field>
            <Field label="Currency">
              <span className="font-mono">{currency}</span>
            </Field>
            {occurrence.taxRegionName && <Field label="Tax Region">{occurrence.taxRegionName}</Field>}
          </div>
        </div>

        {/* Commercial Value */}
        <div className="p-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Commercial Value</h2>
          <div className="max-w-sm space-y-1.5 text-sm">
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
              <span>Taxable Amount</span>
              <span className="font-mono text-base text-indigo-900">{formatCurrency(taxableAmount, currency)}</span>
            </div>
          </div>
        </div>

        {/* Tax Breakdown */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <FileText className="h-3.5 w-3.5 text-indigo-600" /> Tax Breakdown
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {isTaxCompleted ? "Applicable Rates & Amounts" : "Pending Execution"}
            </span>
          </div>

          {!isTaxCompleted ? (
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-slate-50 p-6 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-indigo-100 text-indigo-700">
                <Calculator className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">
                  {isReady ? "Billing Occurrence Ready for Tax Calculation" : "Awaiting Tax Pending Status"}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {isReady ? (
                    <>
                      Billing amount (<strong className="font-mono">{formatCurrency(taxableAmount, currency)}</strong>) is
                      confirmed for this occurrence. Click "Calculate Tax" below to compute tax components.
                    </>
                  ) : (
                    "This occurrence has not yet reached the tax-pending stage. The scheduler will transition it automatically when it becomes due."
                  )}
                </p>
              </div>
              {isReady && (
                <div className="pt-2">
                  <Button
                    variant="primary"
                    onClick={handleCalculateTax}
                    disabled={calculating}
                    className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white text-xs font-semibold px-5 py-2.5 shadow-sm"
                  >
                    {calculating ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculating Tax...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Calculator className="h-3.5 w-3.5" /> Calculate Tax
                      </span>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : components.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-500">
              No tax components applicable for this occurrence.
            </div>
          ) : (
            <>
              {/* Desktop / tablet table */}
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
                    {components.map((component) => (
                      <tr key={component.id}>
                        <td className="py-3 pr-3 align-top">
                          <div className="font-semibold text-slate-800">
                            {component.taxTypeName || component.taxTypeCode || "Tax Component"}
                          </div>
                          {component.taxTypeCode && component.taxTypeName && (
                            <span className="mt-1 inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                              {component.taxTypeCode}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 align-top text-slate-600">
                          {humanizeApplicability(component.applicabilityType)}
                        </td>
                        <td className="py-3 px-3 align-top text-right font-mono font-semibold text-slate-700">
                          {formatRatePercentage(component.appliedRate) ?? "—"}
                        </td>
                        <td className="py-3 pl-3 align-top text-right font-mono font-bold text-slate-900">
                          {formatCurrency(component.taxAmount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <div className="space-y-2.5 sm:hidden">
                {components.map((component) => (
                  <div key={component.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-800">
                        {component.taxTypeName || component.taxTypeCode || "Tax Component"}
                      </span>
                      {component.taxTypeCode && component.taxTypeName && (
                        <span className="shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                          {component.taxTypeCode}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {humanizeApplicability(component.applicabilityType)}
                    </div>
                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-200 pt-2.5">
                      <span className="text-xs text-slate-500">Rate</span>
                      <span className="font-mono font-semibold text-slate-700">
                        {formatRatePercentage(component.appliedRate) ?? "—"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Amount</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(component.taxAmount, currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Tax Summary */}
        <div className="p-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Tax Summary</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="min-w-[130px]">
              <span className="block text-[11px] text-slate-400">Taxable Amount</span>
              <span className="block font-mono text-base font-semibold text-slate-800">
                {formatCurrency(taxableAmount, currency)}
              </span>
            </div>
            <span className="text-base text-slate-300">+</span>
            <div className="min-w-[130px]">
              <span className="block text-[11px] text-slate-400">Total Tax Amount</span>
              <span className="block font-mono text-base font-semibold text-slate-800">
                {isTaxCompleted ? formatCurrency(totalTaxAmount, currency) : "Pending"}
              </span>
            </div>
            <span className="text-base text-slate-300">&rarr;</span>
            <div className="min-w-[130px]">
              <span className="block text-[11px] text-slate-400">Grand Total</span>
              <span className="block font-mono text-base font-semibold text-indigo-900">
                {isTaxCompleted ? formatCurrency(grandTotal, currency) : "Pending"}
              </span>
            </div>
          </div>
          {occurrence.taxCalculatedAt && (
            <p className="mt-2 text-[11px] text-slate-400">
              Tax calculated at {formatDisplayDate(occurrence.taxCalculatedAt)}
            </p>
          )}
          {occurrence.isInvoiced && occurrence.invoiceDate && (
            <p className="mt-1 text-[11px] text-slate-400">Invoiced on {formatDisplayDate(occurrence.invoiceDate)}</p>
          )}
        </div>

        {/* Grand Total */}
        <div className="p-5">
          <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/80 p-4 sm:p-5 flex items-center justify-between shadow-sm">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-indigo-700">Grand Total</span>
              <span className="text-xs text-indigo-600">
                {isTaxCompleted ? "Taxable Amount + Total Tax" : "Tax calculation pending"}
              </span>
            </div>
            <div className="font-mono text-2xl font-extrabold text-indigo-950 sm:text-3xl">
              {isTaxCompleted ? formatCurrency(grandTotal, currency) : "—"}
            </div>
          </div>
        </div>
      </PageCard>

      {/* Authoritative Record */}
      <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <ShieldCheck className="h-4 w-4 flex-shrink-0 text-emerald-600" />
        <p>
          <span className="font-semibold text-slate-700">Authoritative Financial Record.</span>{" "}
          Tax calculation amounts are generated by the backend tax engine and are read-only for this billing occurrence.
        </p>
      </div>
    </div>
  );
}
