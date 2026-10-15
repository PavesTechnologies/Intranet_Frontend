/** Recurring invoice schedules (rent, SaaS, cloud bills) - mirrors Backend recurring_service.py. */
export const RECURRING_MANAGE_PERMISSIONS = ["RECURRING_INVOICE_MANAGE", "AP_AUTOMATION_MANAGE"];
export const RECURRING_VIEW_PERMISSIONS = [...RECURRING_MANAGE_PERMISSIONS, "INVOICE_VIEW", "PAYMENT_VIEW", "PAYMENT_PROCESS"];

export const FREQUENCY_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "HALF_YEARLY", label: "Half-yearly" },
  { value: "YEARLY", label: "Yearly" },
];

/** Period state -> label + badge colour (UPCOMING / DUE / MISSING from EXPECTED; RECEIVED; SKIPPED). */
export const PERIOD_STATE = {
  UPCOMING: { label: "Upcoming", tone: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-300" },
  DUE: { label: "Due", tone: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-400" },
  MISSING: { label: "Not received", tone: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  RECEIVED: { label: "Received", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  SKIPPED: { label: "Skipped", tone: "bg-slate-50 text-slate-500 ring-slate-200", dot: "bg-slate-200" },
};

export const VARIANCE_LABEL = { WITHIN: "As expected", OVER: "Higher than expected", UNDER: "Lower than expected" };
