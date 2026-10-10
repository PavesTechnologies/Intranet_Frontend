import { useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Briefcase,
  Building2,
  Layers,
  Calendar,
  CalendarRange,
  Clock,
  Globe2,
  Hash,
  Copy,
  Check,
  Receipt,
  Coins,
  Percent,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  FileSpreadsheet,
  Lock,
} from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";
import { PageCard } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import BackIconButton from "../common/BackIconButton";
import { StageBadge } from "./PipelineBadges";
import { formatCurrency } from "../../utils/format";
import { PIPELINE_STAGE_LABELS } from "../../utils/taxPipeline";

const formatRatePercentage = (rate) => {
  if (rate === null || rate === undefined || rate === "") return null;
  const num = Number(rate);
  if (Number.isNaN(num)) return null;
  return `${num.toFixed(2)}%`;
};

// Applicability is decided entirely by the backend tax engine; this maps known
// enum values to a readable label with generic title-case fallback.
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

/**
 * Enhanced Tax Calculation Detail layout.
 * Visual hierarchy:
 * 1. Clean Header (Back navigation, title, authoritative pipeline stage badge)
 * 2. Billing Context (Project, client, billing type, duration, periods, tax region, copyable ID)
 * 3. Calculation Summary (High-contrast Financial Metric KPI cards)
 * 4. Tax Breakdown (Interactive preview state or detailed components table + reconciliation)
 * 5. Elevated Workflow Action Banner
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
  const [copiedKey, setCopiedKey] = useState(null);

  const money = (value) =>
    value === null || value === undefined ? "—" : formatCurrency(value, currency);

  const displayStatus = statusLabel || PIPELINE_STAGE_LABELS[stage] || "—";

  const handleCopy = (text, key) => {
    if (!text || text === "—") return;
    navigator.clipboard?.writeText(String(text).trim());
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Curate context fields (status is preserved exclusively in the header to prevent duplication)
  const allFields = [
    { label: "Project", value: project, icon: Briefcase },
    { label: "Client", value: client, icon: Building2 },
    { label: "Billing Type", value: billingType, icon: Layers },
    ...contextFields
      .filter((f) => f && f.label && f.label.toLowerCase() !== "status")
      .map((f) => {
        let icon = FileSpreadsheet;
        const lower = f.label.toLowerCase();
        if (lower.includes("duration")) icon = CalendarRange;
        else if (lower.includes("period")) icon = Calendar;
        else if (lower.includes("date")) icon = Clock;
        else if (lower.includes("region")) icon = Globe2;
        return { ...f, icon };
      }),
    ...extraContextFields
      .filter((f) => f && f.label && f.label.toLowerCase() !== "status")
      .map((f) => {
        const lower = f.label.toLowerCase();
        const isIdentifier =
          lower.includes("snapshot") || lower.includes("id") || lower.includes("occurrence");
        return { ...f, icon: Hash, isIdentifier };
      }),
  ];

  const taxableNum = Number(taxableAmount) || 0;
  const taxNum = Number(totalTaxAmount) || 0;
  const effectiveRate =
    taxableNum > 0 && isTaxCompleted ? ((taxNum / taxableNum) * 100).toFixed(2) : null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* 1. Header with Status */}
      <div className="flex items-center gap-3">
        <BackIconButton onClick={onBack} label={backLabel} />
        <div className="min-w-0 flex-1">
          <PageHeader
            title={
              <span className="flex flex-wrap items-center gap-2.5">
                Tax Calculation
                <StageBadge stage={stage} label={displayStatus} />
              </span>
            }
            subtitle="Authoritative tax engine computation & compliance breakdown"
            actions={headerActions}
          />
        </div>
      </div>

      {/* Calculation Error Banner if triggered */}
      {calcError && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-800 shadow-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div className="space-y-0.5">
            <span className="font-bold text-rose-900">Tax calculation failed: </span>
            <span>{calcError}</span>
          </div>
        </div>
      )}

      {/* 2. Billing Context Card */}
      <PageCard className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Billing Context
            </h2>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            Source setup & acquisition period
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {allFields.map((field) => {
              const FieldIcon = field.icon || FileSpreadsheet;
              return (
                <div
                  key={field.label}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3.5 py-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2.5 text-slate-500">
                    <FieldIcon className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-600">{field.label}</span>
                  </div>
                  <div className="text-right">
                    {field.isStatus ? (
                      <StageBadge stage={stage} label={field.value} />
                    ) : field.isIdentifier ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="font-mono text-xs font-bold text-slate-800 max-w-[190px] sm:max-w-[240px] truncate bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200"
                          title={field.value}
                        >
                          {field.value || "—"}
                        </span>
                        {field.value && field.value !== "—" && (
                          <button
                            type="button"
                            onClick={() => handleCopy(field.value, field.label)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition active:scale-95"
                            title="Copy to clipboard"
                          >
                            {copiedKey === field.label ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span
                        className="text-xs font-semibold text-slate-900"
                        title={typeof field.value === "string" ? field.value : undefined}
                      >
                        {field.value || "—"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </PageCard>

      {/* 3. Calculation Summary (Compact & Refined Segmented Metric Bar) */}
      <PageCard className="overflow-hidden">
        <div className="flex items-center border-b border-slate-100 bg-slate-50/60 px-4 py-2 sm:px-5 sm:py-2.5">
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-50 text-emerald-700">
              <Coins className="h-3 w-3" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Calculation Summary
            </h2>
          </div>
        </div>

        {/* Streamlined 3-Column Segmented Bar */}
        <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-y-0 sm:divide-x sm:divide-slate-200/80">
          {/* Segment 1: Taxable Base Amount */}
          <div className="flex flex-col justify-between p-3.5 sm:px-5 sm:py-3.5 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">
                Taxable Base Amount
              </span>
              <Receipt className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="mt-1.5">
              <div className="tabular-nums text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                {money(taxableAmount)}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                Confirmed billing subtotal
              </div>
            </div>
          </div>

          {/* Segment 2: Total Calculated Tax */}
          <div
            className={`flex flex-col justify-between p-3.5 sm:px-5 sm:py-3.5 transition-colors ${
              isTaxCompleted ? "bg-emerald-50/20" : "bg-amber-50/15"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-semibold ${
                  isTaxCompleted ? "text-emerald-900" : "text-amber-900"
                }`}
              >
                Total Calculated Tax
              </span>
              {isTaxCompleted ? (
                <Percent className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Clock className="h-3.5 w-3.5 text-amber-500" />
              )}
            </div>
            <div className="mt-1.5">
              {isTaxCompleted ? (
                <div className="tabular-nums text-lg sm:text-xl font-bold tracking-tight text-emerald-700">
                  {money(totalTaxAmount)}
                </div>
              ) : (
                <div className="tabular-nums text-base sm:text-lg font-bold tracking-tight text-amber-800">
                  Pending
                </div>
              )}
              <div
                className={`mt-0.5 flex items-center gap-1.5 text-[10px] ${
                  isTaxCompleted ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    isTaxCompleted ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                {isTaxCompleted
                  ? effectiveRate
                    ? `Effective tax rate: ${effectiveRate}%`
                    : "Verified components applied"
                  : "Awaiting tax engine computation"}
              </div>
            </div>
          </div>

          {/* Segment 3: Grand Total */}
          <div
            className={`flex flex-col justify-between p-3.5 sm:px-5 sm:py-3.5 transition-colors ${
              isTaxCompleted
                ? "bg-gradient-to-br from-indigo-50/40 via-white to-indigo-50/10"
                : "bg-slate-50/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-950">
                Grand Total
              </span>
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-700" />
            </div>
            <div className="mt-1.5">
              {isTaxCompleted ? (
                <div className="tabular-nums text-lg sm:text-xl font-black tracking-tight text-indigo-950">
                  {money(grandTotal)}
                </div>
              ) : (
                <div className="tabular-nums text-base sm:text-lg font-bold tracking-tight text-slate-500">
                  Pending
                </div>
              )}
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
                {isTaxCompleted
                  ? "Taxable subtotal + applicable taxes"
                  : "Computed upon tax calculation"}
              </div>
            </div>
          </div>
        </div>
      </PageCard>

      {/* 4. Tax Breakdown Section (Option 2 Finalized: Merged Action Card when pending) */}
      <PageCard className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
              <Percent className="h-4 w-4" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Tax Breakdown
            </h2>
          </div>
          {isTaxCompleted && components.length > 0 ? (
            <span className="text-[11px] font-semibold text-slate-500">
              {components.length} {components.length === 1 ? "Component" : "Components"} Applied
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              <Clock className="h-3 w-3 text-amber-600" /> Pending Computation
            </span>
          )}
        </div>

        <div className="p-4 sm:p-5">
          {!isTaxCompleted ? (
            /* Merged Action Card: Seamlessly integrates Calculate Tax without empty space */
            <div className="flex flex-col gap-3.5 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/30 p-4 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A0082] text-white shadow-2xs">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {actionBar?.title || "Ready for Tax Calculation"}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600 leading-relaxed max-w-xl">
                    {actionBar?.description || pendingDetail || "Source timesheets and taxable amount are verified. Calculate tax to compute and itemize jurisdiction tax components."}
                  </p>
                </div>
              </div>
              {actionBar?.action && (
                <Button
                  variant="primary"
                  onClick={actionBar.action.onClick}
                  disabled={actionBar.action.disabled || actionBar.action.loading}
                  className="flex shrink-0 items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#0A0082] hover:bg-[#0A0082]/90 shadow-sm transition-all hover:shadow active:scale-[0.99]"
                >
                  {actionBar.action.loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{actionBar.action.loadingLabel || actionBar.action.label}</span>
                    </>
                  ) : (
                    <>
                      <Calculator className="h-4 w-4" />
                      <span>{actionBar.action.label}</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : components.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
              No tax components are applicable for this record.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full min-w-[540px] border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="px-4 py-3 text-left">Tax Component</th>
                      <th className="px-4 py-3 text-left">Applicability</th>
                      <th className="px-4 py-3 text-left">Applied Rate</th>
                      <th className="px-4 py-3 text-left">Tax Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {components.map((component) => (
                      <tr
                        key={component.id}
                        className="transition-colors hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-3 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {component.taxTypeName || component.taxTypeCode || "Tax Component"}
                            </span>
                            {component.taxTypeCode && component.taxTypeName && (
                              <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700 border border-indigo-100">
                                {component.taxTypeCode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-left text-slate-600 font-medium">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                            {humanizeApplicability(component.applicabilityType)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-left font-medium text-slate-700 tabular-nums">
                          {formatRatePercentage(component.appliedRate) ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-left font-bold text-slate-900 tabular-nums">
                          {formatCurrency(component.taxAmount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Reconciliation Receipt Card */}
              <div className="flex justify-end">
                <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-2xs">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Taxable Amount</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {money(taxableAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>+ Total Tax</span>
                      <span className="font-semibold text-emerald-700 tabular-nums">
                        +{money(totalTaxAmount)}
                      </span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                      <span className="text-indigo-950 font-bold">Grand Total</span>
                      <span className="font-extrabold text-indigo-950 tabular-nums">
                        {money(grandTotal)}
                      </span>
                    </div>
                  </div>
                  {summaryNotes.filter(Boolean).map((note) => (
                    <p key={note} className="mt-2 text-right tabular-nums text-[11px] text-slate-400">
                      {note}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </PageCard>

      {/* 5. Elevated Workflow Action Banner (Only rendered once tax is completed to proceed to Invoice Generation) */}
      {actionBar && isTaxCompleted && (
        <div className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 shadow-xs transition-all">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">{actionBar.title}</div>
              {actionBar.description && (
                <div className="mt-0.5 text-xs text-slate-600 leading-relaxed max-w-xl">
                  {actionBar.description}
                </div>
              )}
            </div>
          </div>
          {actionBar.action && (
            <Button
              variant="primary"
              onClick={actionBar.action.onClick}
              disabled={actionBar.action.disabled || actionBar.action.loading}
              className="flex shrink-0 items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm transition-all hover:shadow active:scale-[0.99]"
            >
              <span>{actionBar.action.label}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Audit Footnote */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 px-1">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>Tax amounts are generated by the backend tax engine and are read-only for audit compliance.</span>
      </div>
    </div>
  );
}
