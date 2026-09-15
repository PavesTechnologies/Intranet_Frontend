import React from "react";
import { Calculator, Loader2, Eye, CalendarClock } from "lucide-react";

import Button from "../../../../components/Button/Button";
import StatusBadge from "../../../../components/status/statusbadge";
import { formatCurrency, formatDisplayDate } from "../../utils/format";

// Billing Type is purely a display label — derived from the backend's own
// scheduleType when present, falling back to which configuration id was
// returned (an occurrence only ever carries one of the two). No business
// eligibility is inferred here.
const humanizeBillingType = (occurrence) => {
  const raw = String(occurrence?.scheduleType || "").trim().toUpperCase();
  if (raw.includes("RECUR")) return "Recurring";
  if (raw.includes("FIXED")) return "Fixed Price";
  if (occurrence?.recurringConfigurationId) return "Recurring";
  if (occurrence?.billingConfigurationId) return "Fixed Price";
  return raw ? raw.replace(/_/g, " ") : "Billing Occurrence";
};

/**
 * A single Billing Occurrence card used across the Ready / Upcoming /
 * Processed sections of the Tax Calculation workspace. `variant` controls
 * which action (if any) is shown — the backend's periodStatus/taxStatus
 * decide which variant a card is rendered in, never a frontend date check.
 */
export default function BillingOccurrenceCard({
  occurrence,
  variant = "ready", // "ready" | "upcoming" | "processed"
  calculating = false,
  onCalculateTax,
  onView,
}) {
  const currency = occurrence.currencyCode || "USD";
  const billingType = humanizeBillingType(occurrence);
  const period =
    occurrence.periodStartDate || occurrence.periodEndDate
      ? `${formatDisplayDate(occurrence.periodStartDate)} → ${formatDisplayDate(occurrence.periodEndDate)}`
      : "—";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <span className="inline-block rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
          {billingType}
        </span>
        <StatusBadge label={occurrence.taxStatus || occurrence.periodStatus} size="sm" />
      </div>

      <div>
        <div className="font-bold text-slate-900">{occurrence.projectName || "—"}</div>
        <div className="text-xs text-slate-500">{occurrence.clientName || "—"}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="block font-bold uppercase tracking-wider text-slate-400">Period</span>
          <span className="mt-0.5 block font-medium text-slate-700">{period}</span>
        </div>
        <div>
          <span className="block font-bold uppercase tracking-wider text-slate-400">Billing Date</span>
          <span className="mt-0.5 block font-medium text-slate-700">{formatDisplayDate(occurrence.billingDate)}</span>
        </div>
        <div>
          <span className="block font-bold uppercase tracking-wider text-slate-400">Amount</span>
          <span className="mt-0.5 block font-mono font-semibold text-slate-800">
            {formatCurrency(occurrence.billingAmount, currency)}
          </span>
        </div>
        {occurrence.taxRegionName && (
          <div>
            <span className="block font-bold uppercase tracking-wider text-slate-400">Tax Region</span>
            <span className="mt-0.5 block font-medium text-slate-700">{occurrence.taxRegionName}</span>
          </div>
        )}
      </div>

      {variant === "upcoming" && (
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <CalendarClock className="h-3.5 w-3.5 flex-shrink-0" />
          Expected Tax Pending: <span className="font-semibold text-slate-700">{formatDisplayDate(occurrence.billingDate)}</span>
        </div>
      )}

      {variant === "processed" && (
        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-2.5 text-xs">
          <div>
            <span className="block text-slate-400">Total Tax</span>
            <span className="font-mono font-semibold text-slate-800">
              {occurrence.totalTaxAmount !== null ? formatCurrency(occurrence.totalTaxAmount, currency) : "—"}
            </span>
          </div>
          <div>
            <span className="block text-slate-400">Grand Total</span>
            <span className="font-mono font-semibold text-indigo-900">
              {occurrence.grandTotal !== null ? formatCurrency(occurrence.grandTotal, currency) : "—"}
            </span>
          </div>
        </div>
      )}

      {variant === "ready" && (
        <Button
          variant="primary"
          size="small"
          onClick={() => onCalculateTax?.(occurrence)}
          disabled={calculating}
          className="w-full justify-center bg-[#0A0082] hover:bg-[#0A0082]/90 text-white text-xs font-semibold"
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
      )}

      {variant === "processed" && (
        <Button
          variant="outline"
          size="small"
          onClick={() => onView?.(occurrence)}
          className="w-full justify-center text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-semibold"
        >
          <Eye className="h-3.5 w-3.5" /> View Tax Details
        </Button>
      )}
    </div>
  );
}
