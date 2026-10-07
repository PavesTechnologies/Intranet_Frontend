import { AlertTriangle, Loader2 } from "lucide-react";

import { PageCard } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import BackIconButton from "../common/BackIconButton";
import { StageBadge, BillingTypeBadge } from "./PipelineBadges";
import { formatCurrency } from "../../utils/format";
import { PIPELINE_STAGE_LABELS } from "../../utils/taxPipeline";

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

function Section({ title, aside, children }) {
  return (
    <section className="px-4 py-4 sm:px-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        {aside && <span className="text-[11px] text-slate-400">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function SummaryCell({ label, value, emphasis = false }) {
  return (
    <div className={`rounded-md px-3 py-2 ${emphasis ? "bg-indigo-50/70" : "bg-slate-50"}`}>
      <div className="text-[11px] text-slate-500">{label}</div>
      <div
        className={`mt-0.5 whitespace-nowrap font-mono text-sm tabular-nums ${
          emphasis ? "font-semibold text-indigo-900" : "font-medium text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Compact Tax Calculation detail layout shared by the T&M billing-snapshot
 * view (pages/TaxCalculation.jsx) and the billing-occurrence view
 * (OccurrenceTaxCalculationDetail.jsx). Presentation only — each caller
 * loads its own backend record, owns its actions and passes display values.
 *
 * Hierarchy: Billing Context -> Calculation Summary -> Tax Breakdown ->
 * Tax Summary -> Invoice / workflow action.
 */
export default function TaxCalculationDetailView({
  onBack,
  backLabel = "Back to Tax Calculation",
  headerActions,
  billingType,
  stage,
  statusLabel,
  project,
  client,
  contextFields = [],
  extraContextFields = [],
  currency,
  billingAmount,
  taxableAmount,
  totalTaxAmount,
  grandTotal,
  isTaxCompleted,
  components = [],
  pendingMessage,
  pendingDetail,
  summaryNotes = [],
  calcError,
  actionBar,
}) {
  const money = (value) =>
    value === null || value === undefined ? "—" : formatCurrency(value, currency);
  const pending = <span className="font-sans text-slate-400">Pending</span>;
  const displayStatus = statusLabel || PIPELINE_STAGE_LABELS[stage] || "—";

  // Row-major two-column grid, so the order reads as pairs:
  // Project | Client, Billing Type | Project Duration,
  // Billing Period | Billing Date, Tax Region | Status — then any extras.
  const fields = [
    { label: "Project", value: project },
    { label: "Client", value: client },
    { label: "Billing Type", value: billingType },
    ...contextFields.filter((f) => f && f.label),
    { label: "Status", value: displayStatus },
    ...extraContextFields.filter((f) => f && f.label),
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      {/* Header — same back control placement as the Billing Setup pages */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <BackIconButton onClick={onBack} label={backLabel} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-900">Tax Calculation</h1>
              {billingType && <BillingTypeBadge label={billingType} />}
              <StageBadge stage={stage} label={displayStatus} />
            </div>
            <p className="mt-0.5 truncate text-sm text-slate-500">
              <span className="font-medium text-slate-700">{project || "—"}</span>
              <span className="mx-1.5 text-slate-300">&middot;</span>
              {client || "—"}
            </p>
          </div>
        </div>
        {headerActions && <div className="flex shrink-0 flex-wrap items-center gap-2">{headerActions}</div>}
      </div>

      {calcError && (
        <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div>
            <span className="font-semibold text-rose-900">Tax calculation failed. </span>
            {calcError}
          </div>
        </div>
      )}

      <PageCard className="divide-y divide-slate-200 overflow-hidden">
        {/* Billing Context */}
        <Section title="Billing Context">
          <dl className="grid grid-cols-1 gap-x-10 gap-y-2 text-[13px] sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.label} className="flex min-w-0 items-baseline gap-3">
                <dt className="w-28 shrink-0 text-slate-500">{field.label}</dt>
                <dd className="min-w-0 truncate font-medium text-slate-900" title={typeof field.value === "string" ? field.value : undefined}>
                  {field.value || "—"}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        {/* Calculation Summary */}
        <Section title="Calculation Summary" aside={currency ? `Currency: ${currency}` : null}>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <SummaryCell label="Billing Amount" value={money(billingAmount)} />
            <SummaryCell label="Taxable Amount" value={money(taxableAmount)} />
            <SummaryCell label="Total Tax" value={isTaxCompleted ? money(totalTaxAmount) : pending} />
            <SummaryCell label="Grand Total" value={isTaxCompleted ? money(grandTotal) : pending} emphasis={isTaxCompleted} />
          </div>
        </Section>

        {/* Tax Breakdown */}
        <Section title="Tax Breakdown">
          {!isTaxCompleted ? (
            <div className="space-y-1 rounded-md border border-dashed border-slate-200 px-3 py-3 text-[13px] text-slate-500">
              <p>{pendingMessage || "Tax has not been calculated for this record yet."}</p>
              {pendingDetail}
            </div>
          ) : components.length === 0 ? (
            <p className="rounded-md bg-slate-50 px-3 py-3 text-[13px] text-slate-500">
              No tax components are applicable for this record.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full min-w-[520px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 text-left font-semibold">Tax Component</th>
                    <th className="px-3 py-2 text-left font-semibold">Applicability</th>
                    <th className="px-3 py-2 text-right font-semibold">Rate</th>
                    <th className="px-3 py-2 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {components.map((component) => (
                    <tr key={component.id}>
                      <td className="px-3 py-2">
                        <span className="font-medium text-slate-900">
                          {component.taxTypeName || component.taxTypeCode || "Tax Component"}
                        </span>
                        {component.taxTypeCode && component.taxTypeName && (
                          <span className="ml-2 rounded bg-slate-100 px-1.5 py-px font-mono text-[10px] font-semibold text-slate-600">
                            {component.taxTypeCode}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{humanizeApplicability(component.applicabilityType)}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                        {formatRatePercentage(component.appliedRate) ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900">
                        {formatCurrency(component.taxAmount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Tax Summary — the single reconciliation of taxable amount, tax and total */}
        {isTaxCompleted && (
          <Section title="Tax Summary">
            <div className="ml-auto w-full max-w-sm text-[13px]">
              <div className="flex justify-between py-1 text-slate-600">
                <span>Taxable Amount</span>
                <span className="font-mono tabular-nums text-slate-900">{money(taxableAmount)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600">
                <span>+ Total Tax</span>
                <span className="font-mono tabular-nums text-slate-900">{money(totalTaxAmount)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-slate-300 pt-2 font-semibold text-slate-900">
                <span>Grand Total</span>
                <span className="font-mono tabular-nums text-indigo-900">{money(grandTotal)}</span>
              </div>
              {summaryNotes.filter(Boolean).map((note) => (
                <p key={note} className="mt-1.5 text-right text-[11px] text-slate-400">{note}</p>
              ))}
            </div>
          </Section>
        )}

        {/* Workflow / invoice action bar */}
        {actionBar && (
          <div className="flex flex-col gap-3 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">{actionBar.title}</div>
              {actionBar.description && <div className="text-xs text-slate-500">{actionBar.description}</div>}
            </div>
            {actionBar.action && (
              <Button
                variant="primary"
                size="small"
                onClick={actionBar.action.onClick}
                disabled={actionBar.action.disabled || actionBar.action.loading}
                className="flex shrink-0 items-center justify-center gap-1.5 text-xs font-semibold"
              >
                {actionBar.action.loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {actionBar.action.loading ? actionBar.action.loadingLabel || actionBar.action.label : actionBar.action.label}
              </Button>
            )}
          </div>
        )}
      </PageCard>

      <p className="text-[11px] text-slate-400">
        Tax amounts are generated by the backend tax engine and are read-only.
      </p>
    </div>
  );
}
