import { getBillingTypeDisplayName } from "../../utils/billingType";

const BILLING_TYPE_LABELS = {
  TIME_MATERIAL: "Time & Material",
  FIXED_PRICE: "Fixed Price",
  MILESTONE: "Milestone",
  RECURRING: "Recurring",
};

const frequencyLabel = (freq) => {
  if (!freq) return "—";
  return freq.charAt(0) + freq.slice(1).toLowerCase();
};

function Field({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-800">{children ?? "—"}</span>
    </div>
  );
}

// Snapshot Overview: Detailed commercial and context information.
// Project Duration represents overall project/configuration duration.
// Billing Period represents the user-selected/acquired billing snapshot period.
// Status is omitted here because it is already displayed prominently in the page header.
export default function BillingSummaryGrid({ config = {} }) {
  const billingTypeLabel =
    BILLING_TYPE_LABELS[config.billingType] || getBillingTypeDisplayName(config.billingType) || "—";

  const isAcquired = Boolean(
    config.snapshotId ||
    config.existingSnapshot ||
    (config.snapshotLifecycleStatus &&
      config.snapshotLifecycleStatus !== "NOT_ACQUIRED" &&
      config.snapshotLifecycleStatus !== "ACQUISITION_FAILED") ||
    (config.billingStatus &&
      config.billingStatus !== "NOT_ACQUIRED" &&
      config.billingStatus !== "ACQUISITION_FAILED" &&
      config.billingStatus !== "VALIDATING")
  );

  const displayedBillingPeriod =
    isAcquired && config.billingPeriod && config.billingPeriod !== "—"
      ? config.billingPeriod
      : "—";

  return (
    <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
      <div className="divide-y divide-slate-100">
        <Field label="Project">{config.projectName || "—"}</Field>
        <Field label="Client">{config.client || "—"}</Field>
        <Field label="Project Duration">
          <span className="tabular-nums">{config.projectDuration || "—"}</span>
        </Field>
        <Field label="Billing Type">{billingTypeLabel}</Field>
        <Field label="Billing Frequency">{frequencyLabel(config.billingFrequency)}</Field>
      </div>
      <div className="divide-y divide-slate-100">
        <Field label="Billing Period">
          <span className="tabular-nums">{displayedBillingPeriod}</span>
        </Field>
        <Field label="Currency">
          <span className="tabular-nums">{config.currency || "USD"}</span>
        </Field>
        <Field label="Payment Terms">{config.paymentTerms || "Net 30"}</Field>
        <Field label="Expense Billing">
          {config.expenseBillingEligible ? (
            <span
              data-testid="expense-billing-status"
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Enabled
            </span>
          ) : (
            <span
              data-testid="expense-billing-status"
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-400/20"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Disabled
            </span>
          )}
        </Field>
      </div>
    </div>
  );
}
