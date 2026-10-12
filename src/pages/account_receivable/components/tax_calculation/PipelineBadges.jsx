import { PIPELINE_STAGE_LABELS } from "../../utils/taxPipeline";

// Shared by the Billing Tax Pipeline list and both Tax Calculation detail
// views, so a record's single status and billing type look identical
// everywhere on the Tax Calculation pages.

const STATUS_BADGE_CLASSES = {
  UPCOMING: "bg-slate-50 text-slate-600 ring-slate-200",
  READY_FOR_TAX: "bg-amber-50 text-amber-700 ring-amber-200",
  TAX_CALCULATED: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  INVOICED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const STATUS_DOT_CLASSES = {
  UPCOMING: "bg-slate-400",
  READY_FOR_TAX: "bg-amber-500",
  TAX_CALCULATED: "bg-indigo-500",
  INVOICED: "bg-emerald-500",
};

export function StageBadge({ stage, label, title }) {
  return (
    <span
      title={title || undefined}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
        STATUS_BADGE_CLASSES[stage] || STATUS_BADGE_CLASSES.UPCOMING
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_CLASSES[stage] || STATUS_DOT_CLASSES.UPCOMING}`} />
      {label || PIPELINE_STAGE_LABELS[stage] || "—"}
    </span>
  );
}

export function BillingTypeBadge({ label }) {
  return (
    <span className="inline-block whitespace-nowrap rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
      {label}
    </span>
  );
}
