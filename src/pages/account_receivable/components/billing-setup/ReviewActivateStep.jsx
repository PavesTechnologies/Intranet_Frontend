import { useContext, useMemo, useState } from "react";
import { Wallet, Receipt, Pencil, ChevronRight, Building2, Calendar, Info } from "lucide-react";

import { PageCard } from "../../../../components/Cards/PageCard";
import SearchInput from "../../../../components/filter/Searchbar";
import Modal from "../../../../components/Modal/modal";
import StatusBadge from "../../../../components/status/statusbadge";
import { BILLING_MODE_LABELS } from "../../data/wizardOptions";
import { getBillingTypeDisplayName } from "../../utils/billingType";
import { formatCurrency, formatDisplayDate, formatProjectDuration } from "../../utils/format";
import ConfigurationChanges, { ChangedFieldsContext, ChangedIndicator, getChangedFieldLabels, useIsFieldChanged } from "./ConfigurationChanges";

// Display-time safety net: a Project Code must never be the project's own
// internal id — see the matching guard in ProjectStep.jsx / billingConfigurationService.js.
const sanitizeProjectCode = (code, projectId) => {
  const codeStr = code === null || code === undefined ? "" : String(code).trim();
  if (!codeStr) return "";
  if (projectId === null || projectId === undefined || projectId === "") return codeStr;
  return codeStr === String(projectId).trim() ? "" : codeStr;
};

const labelizeStatus = (value) => {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const FREQUENCY_LABEL_MAP = {
  ONE_TIME: "One-Time",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUALLY: "Annually",
  BI_WEEKLY: "Bi-Weekly",
  WEEKLY: "Weekly",
  SEMI_ANNUALLY: "Semi-Annually",
};

export function formatFrequencyLabel(freqVal, freqName, freqLabel, isOneTimeHint = false) {
  const nameCandidate = freqName || freqLabel || "";
  if (nameCandidate && !/^[0-9a-fA-F-]{20,}$/.test(nameCandidate)) {
    const candidateUpper = String(nameCandidate).trim().toUpperCase();
    if (FREQUENCY_LABEL_MAP[candidateUpper]) return FREQUENCY_LABEL_MAP[candidateUpper];
    return nameCandidate;
  }
  if (!freqVal) return isOneTimeHint ? "One-Time" : "—";
  const upper = String(freqVal).trim().toUpperCase();
  if (upper.includes("ONE") || upper.includes("SINGLE") || isOneTimeHint) {
    return "One-Time";
  }
  if (FREQUENCY_LABEL_MAP[upper]) return FREQUENCY_LABEL_MAP[upper];
  return isOneTimeHint ? "One-Time" : "Monthly";
}

const RATE_DISPLAY_LIMIT = 5;
const RATE_PREVIEW_COUNT = 4;

const RATE_PERIOD_SUFFIX = { HOURLY: "/ hr", DAILY: "/ day", WEEKLY: "/ wk" };
const RATE_PERIOD_LABEL = { HOURLY: "Hourly", DAILY: "Daily", WEEKLY: "Weekly" };


function formatMoney(value, currency) {
  if (value === "" || value === null || value === undefined) return null;
  if (Number.isNaN(Number(value))) return String(value);
  return formatCurrency(value, currency);
}

function parseNumericValue(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isNaN(value) ? null : value;
  const str = String(value).replace(/,/g, "").replace(/[^0-9.-]+/g, "").trim();
  if (!str) return null;
  const num = Number(str);
  return Number.isNaN(num) ? null : num;
}

function resolveMilestonePlanContractValue(milestonePlan, projectInfo, wizardData = {}) {
  const candidates = [
    milestonePlan?.totalContractValue,
    milestonePlan?.contractValue,
    milestonePlan?.totalAmount,
    milestonePlan?.amount,
    wizardData?.billingConfig?.milestonePlan?.totalContractValue,
    wizardData?.billingConfig?.milestonePlanDetails?.totalContractValue,
    wizardData?.billingConfig?.milestonePlanDetails?.contractValue,
    wizardData?.billingConfig?.totalContractValue,
    wizardData?.billingConfig?.contractValue,
    wizardData?.milestonePlanDetails?.totalContractValue,
    wizardData?.totalContractValue,
    projectInfo?.projectBudget,
    projectInfo?.budget,
    projectInfo?.budgetAmount,
  ];

  for (const candidate of candidates) {
    const parsed = parseNumericValue(candidate);
    if (parsed !== null && parsed > 0) {
      return parsed;
    }
  }

  return 0;
}

function resolvePaymentEntryAmount(entry, totalContractValue) {
  const explicitAmount = parseNumericValue(entry?.amount);
  if (explicitAmount !== null && explicitAmount > 0) {
    return explicitAmount;
  }
  const percentage = parseNumericValue(entry?.percentage);
  if (percentage !== null && percentage > 0 && totalContractValue > 0) {
    return (percentage / 100) * totalContractValue;
  }
  return explicitAmount !== null ? explicitAmount : 0;
}

function ratePeriodSuffix(period) {
  if (!period) return "";
  return RATE_PERIOD_SUFFIX[period] || `/ ${String(period).toLowerCase()}`;
}

function ratePeriodLabel(period) {
  if (!period) return "—";
  return RATE_PERIOD_LABEL[period] || period;
}

function rateDateRange(role) {
  if (!role.effectiveFrom && !role.effectiveTo) return null;
  return `${role.effectiveFrom ? formatDisplayDate(role.effectiveFrom) : "—"} – ${
    role.effectiveTo ? formatDisplayDate(role.effectiveTo) : "Ongoing"
  }`;
}

function getCommercialEffectiveDates(billingConfig) {
  const { billingType, billingMode } = billingConfig;

  if (billingType === "TIME_MATERIAL" && billingMode === "ROLE_BASED") {
    const roles = billingConfig.timeAndMaterial?.roles || [];
    const fromDates = roles.map((role) => role.effectiveFrom).filter(Boolean).sort();
    const toDates = roles.map((role) => role.effectiveTo).filter(Boolean).sort();
    return {
      from: fromDates[0] || null,
      to: toDates.length ? toDates[toDates.length - 1] : null,
    };
  }
  if (billingType === "TIME_MATERIAL" && (billingMode === "STANDARD" || !billingMode)) {
    return {
      from: billingConfig.timeAndMaterial?.effectiveFrom || null,
      to: billingConfig.timeAndMaterial?.effectiveTo || null,
    };
  }
  if (billingType === "RECURRING") {
    return {
      from: billingConfig.recurring?.recurringStartDate || billingConfig.recurring?.effectiveFrom || null,
      to: billingConfig.recurring?.recurringEndDate || billingConfig.recurring?.effectiveTo || null,
    };
  }
  if (billingType === "FIXED_PRICE") {
    return {
      from: billingConfig.fixedPrice?.effectiveFrom || billingConfig.fixedPrice?.startDate || null,
      to: billingConfig.fixedPrice?.effectiveTo || billingConfig.fixedPrice?.endDate || null,
    };
  }
  if (
    billingType === "MILESTONE_PLAN" ||
    billingType === "MILESTONE_BASED" ||
    billingType === "MILESTONE" ||
    String(billingType || "").toUpperCase().includes("MILESTONE")
  ) {
    return { from: null, to: null };
  }
  return { from: null, to: null };
}

// --- Presentation primitives ----------------------------------------------
// Compact, data-dense type scale: section titles 15px semibold, labels 12px
// regular slate-500, values 13px medium; only money, status and the project
// name are semibold/bold.

// One review section: header (icon + title, plus the wizard's per-step
// "Edit" link when reviewing inside the wizard) and a tight body.
function ReviewSection({ icon, title, stepId, onEdit, children }) {
  const Icon = icon;
  return (
    // Body is rendered directly in PageCard — PageCardContent always adds p-4,
    // which would double the section padding.
    <PageCard className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-2.5">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#0A0082]" />
          <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
        </div>
        {onEdit && stepId && (
          <button
            type="button"
            onClick={() => onEdit(stepId)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-[#0A0082] transition-colors hover:bg-[#0A0082]/5"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        )}
      </div>
      <div className="px-5 py-3">{children}</div>
    </PageCard>
  );
}

const VALUE_TONES = {
  default: "text-slate-800",
  money: "text-slate-900",
  brand: "text-[#0A0082]",
  success: "text-emerald-700",
  warning: "text-amber-700",
};

// Label/value row. Values are right-aligned with tabular figures so amounts
// line up; `money` makes the value semibold, `tone` colours it.
function ReviewField({ label, value, money = false, tone, divider = true }) {
  const isChanged = useIsFieldChanged(label);
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2 ${divider ? "border-b border-slate-100 last:border-0" : ""}`}>
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500">
        {label}
        {isChanged && <ChangedIndicator />}
      </span>
      <span
        className={`min-w-0 break-words text-right text-[13px] tabular-nums ${money ? "font-semibold" : "font-medium"} ${
          VALUE_TONES[tone || (money ? "money" : "default")]
        }`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

const fieldKey = (field, index) => `${typeof field.label === "string" ? field.label : "field"}-${index}`;

// Single-column list of fields.
function FieldList({ fields }) {
  return (
    <div>
      {fields.map((field, index) => (
        <ReviewField key={fieldKey(field, index)} {...field} />
      ))}
    </div>
  );
}

// Two-column field grid on desktop (stacks on mobile) — for short settings.
// Rows are separated by spacing rather than rules so odd counts stay tidy.
function FieldGrid({ fields }) {
  return (
    <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
      {fields.map((field, index) => (
        <ReviewField key={fieldKey(field, index)} {...field} divider={false} />
      ))}
    </div>
  );
}

// Compact boxed metadata cells (label over value) — 2 columns on mobile, up
// to 4 on desktop. Used by the overview summary and schedule metadata.
function MetaGrid({ items }) {
  const changed = useContext(ChangedFieldsContext);
  return (
    <div className={`grid grid-cols-2 gap-2 ${items.length >= 4 ? "lg:grid-cols-4" : items.length === 3 ? "sm:grid-cols-3" : ""}`}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0 rounded-lg border border-slate-200/70 bg-slate-50/70 px-3 py-2">
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            {item.label}
            {changed.has(String(item.label).toLowerCase()) && <ChangedIndicator />}
          </p>
          <p
            className={`mt-0.5 break-words text-[13px] tabular-nums ${
              item.emphasize ? "font-semibold text-[#0A0082]" : item.strong ? "font-semibold text-slate-900" : "font-medium text-slate-800"
            }`}
          >
            {item.value || "—"}
          </p>
        </div>
      ))}
    </div>
  );
}

function RoleRatesTable({ roles, currency }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-100">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-medium text-slate-500">
            <th className="px-3 py-2 font-medium">Role</th>
            <th className="px-3 py-2 font-medium">Rate</th>
            <th className="px-3 py-2 font-medium">Frequency</th>
            <th className="px-3 py-2 font-medium">Effective Period</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-[13px]">
          {roles.map((role, index) => (
            <tr key={`${role.role}-${index}`}>
              <td className="px-3 py-2 font-medium text-slate-800">{role.role || "—"}</td>
              <td className="px-3 py-2 font-semibold tabular-nums text-slate-900">{formatMoney(role.rate, currency) || "—"}</td>
              <td className="px-3 py-2 text-slate-600">{ratePeriodLabel(role.ratePeriod)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-600">{rateDateRange(role) || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleRatesDrawer({ isOpen, onClose, roles, currency }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return roles;
    const q = query.trim().toLowerCase();
    return roles.filter((role) => (role.role || "").toLowerCase().includes(q));
  }, [roles, query]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`All Rate Cards (${roles.length})`}
      bodyClassName="p-0"
      maxHeight="max-h-[82vh]"
      panelStyle={{ width: "78vw", maxWidth: "1400px" }}
    >
      <div className="border-b border-slate-100 p-4">
        <div className="relative max-w-md">
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search role..."
          />
        </div>
      </div>
      <div className="max-h-[62vh] overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">No roles match &quot;{query}&quot;.</p>
        ) : (
          <RoleRatesTable roles={filtered} currency={currency} />
        )}
      </div>
    </Modal>
  );
}

function RoleRatesList({ roles, currency }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (roles.length === 0) {
    return <ReviewField label="Roles Configured" value="—" />;
  }

  if (roles.length <= RATE_DISPLAY_LIMIT) {
    return <RoleRatesTable roles={roles} currency={currency} />;
  }

  return (
    <div className="space-y-2">
      <RoleRatesTable roles={roles.slice(0, RATE_PREVIEW_COUNT)} currency={currency} />
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-1.5 text-xs font-medium text-[#0A0082] transition-colors hover:bg-[#0A0082]/5"
      >
        View all {roles.length} rates <ChevronRight className="h-3.5 w-3.5" />
      </button>
      <RoleRatesDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} roles={roles} currency={currency} />
    </div>
  );
}

// Two amounts are the same business value when they're equal to the cent —
// e.g. a Milestone Plan's Total Value that is sourced from the Project Budget.
const isSameAmount = (a, b) => a !== null && b !== null && Math.abs(a - b) < 0.005;

// Milestone Plan figures, computed once for both Billing & Pricing (summary)
// and Payment Schedule (detail) so the two sections can never disagree.
function buildMilestonePlanReview(wizardData, projectInfo) {
  const { billingConfig = {} } = wizardData;
  const milestonePlan =
    billingConfig.milestonePlan ||
    billingConfig.milestonePlanDetails ||
    wizardData.milestonePlanDetails ||
    wizardData.milestonePlan ||
    {};
  const totalValue = resolveMilestonePlanContractValue(milestonePlan, projectInfo, wizardData);
  const rawEntries =
    milestonePlan.entries ||
    milestonePlan.paymentEntries ||
    milestonePlan.installmentEntries ||
    milestonePlan.milestonePlanEntries ||
    wizardData.paymentEntries ||
    [];
  const paymentStructure =
    milestonePlan.paymentStructure || (rawEntries.length > 1 ? "INSTALLMENTS" : "FULL_PAYMENT");
  const isFullPayment = paymentStructure === "FULL_PAYMENT";

  // Full Payment is always one 100% payment, even before an entry is saved.
  // Installments show exactly what's configured — possibly nothing yet, or a
  // partial allocation such as 55%.
  const sourceEntries =
    isFullPayment && rawEntries.length === 0
      ? [{ sequence: 1, percentage: 100, billingDate: "", remarks: "" }]
      : rawEntries;
  const payments = [...sourceEntries]
    .map((entry, index) => ({ ...entry, sequence: entry.sequence ?? index + 1 }))
    .sort((a, b) => a.sequence - b.sequence)
    .map((entry) => ({
      ...entry,
      percentage: parseNumericValue(entry.percentage) || 0,
      amount: resolvePaymentEntryAmount(entry, totalValue),
    }));

  const allocationPercentage = Math.round(payments.reduce((sum, p) => sum + p.percentage, 0) * 100) / 100;
  const scheduledTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = Math.max(0, totalValue - scheduledTotal);
  const billingDates = payments.map((p) => p.billingDate).filter(Boolean).sort();

  return {
    milestonePlan,
    totalValue,
    isFullPayment,
    paymentStructureLabel: isFullPayment ? "Full Payment" : "Installments",
    payments,
    allocationPercentage,
    remainingAmount,
    isFullyAllocated: Math.abs(allocationPercentage - 100) < 0.01,
    firstPaymentDate: billingDates[0] || null,
    lastPaymentDate: billingDates[billingDates.length - 1] || null,
  };
}

// --- Page-level blocks -----------------------------------------------------

// Primary card: project identity (Project Name/Code, Primary Location,
// Project Duration) + status + actions, then the boxed billing summary. The
// only place these, Billing Type/Frequency, Currency and Project Budget
// appear. Shared with the Finance approval review (BillingApprovals.jsx) so
// all screens present the project identically.
export function ReviewHeader({ projectInfo, isProductService, approvalStatus, billingStatus, leading, actions, summary }) {
  const projectCode = sanitizeProjectCode(projectInfo.projectCode, projectInfo.projectId);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          {leading}
          <span className="mt-0.5 hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0A0082]/10 text-[#0A0082] sm:flex">
            <Building2 className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              {projectInfo.clientName || "Client Unspecified"}
            </p>
            <h2 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
              {isProductService ? projectInfo.productName || "Billing Setup" : projectInfo.projectName || "Billing Setup"}
            </h2>
            {isProductService ? (
              <p className="mt-1 text-xs text-slate-500">
                Product / Service Description: <span className="font-medium text-slate-700">{projectInfo.productDescription || "—"}</span>
              </p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                <span>
                  Project Code: <span className="font-medium text-slate-700">{projectCode || "—"}</span>
                </span>
                <span>
                  Primary Location: <span className="font-medium text-slate-700">{projectInfo.primaryLocation || "—"}</span>
                </span>
                <span>
                  Project Duration: <span className="font-medium text-slate-700">{formatProjectDuration(projectInfo) || "—"}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end">
          {(approvalStatus || billingStatus) && (
            <div className="flex flex-wrap gap-1.5 sm:justify-end">
              {approvalStatus && <StatusBadge label={labelizeStatus(approvalStatus)} size="sm" />}
              {billingStatus && <StatusBadge label={labelizeStatus(billingStatus)} size="sm" />}
            </div>
          )}
          {actions}
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-3">
        <MetaGrid items={summary} />
      </div>
    </div>
  );
}

function PaymentCard({ payment, index, currency }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Payment {index + 1}</span>
        <span className="rounded bg-[#0A0082]/10 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-[#0A0082]">
          {payment.percentage}%
        </span>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500">Payment Amount</p>
          <p className="text-sm font-semibold tabular-nums text-slate-900">{formatMoney(payment.amount, currency) || "—"}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[11px] text-slate-500">Billing Date</p>
          <p className="text-[13px] font-medium text-slate-800">{formatDisplayDate(payment.billingDate)}</p>
        </div>
      </div>
      {payment.remarks && (
        <p className="mt-2 border-t border-slate-100 pt-1.5 text-xs text-slate-600">
          <span className="text-slate-500">Remarks: </span>
          {payment.remarks}
        </p>
      )}
    </div>
  );
}

function PaymentSchedule({ review, currency }) {
  const meta = review.isFullPayment
    ? [{ label: "Schedule Type", value: "One-Time Payment" }]
    : [
        { label: "Schedule Type", value: "Custom Payment Dates" },
        { label: "Number of Payments", value: String(review.payments.length) },
        { label: "First Billing Date", value: formatDisplayDate(review.firstPaymentDate) },
        { label: "Last Billing Date", value: formatDisplayDate(review.lastPaymentDate) },
      ];
  return (
    <div className="space-y-3 py-1">
      <MetaGrid items={meta} />
      {review.payments.length > 0 ? (
        <div className={`grid grid-cols-1 gap-2.5 sm:grid-cols-2 ${review.payments.length > 4 ? "xl:grid-cols-3" : ""}`}>
          {review.payments.map((payment, index) => (
            <PaymentCard key={payment.paymentEntryId || index} payment={payment} index={index} currency={currency} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-center text-xs text-slate-500">
          No payments configured yet.
        </p>
      )}
    </div>
  );
}

// --- Billing-type-specific content ---------------------------------------
// Each returns the body of Billing & Pricing for its type; the shell
// (header, sections, invoice settings) is shared by every billing type.

function FixedPricePricing({ billingConfig, currency, projectBudgetValue }) {
  const fixedPrice = billingConfig.fixedPrice || {};
  const totalContractValue = Number(fixedPrice.totalContractValue) || 0;
  const retentionPercent = Number(fixedPrice.retentionPercent) || 0;
  const retentionAmountInput = Number(fixedPrice.retentionAmount) || 0;

  const retentionAmount =
    retentionAmountInput > 0
      ? retentionAmountInput
      : retentionPercent > 0 && totalContractValue > 0
      ? (totalContractValue * retentionPercent) / 100
      : 0;

  const hasRetention = retentionAmount > 0 || retentionPercent > 0;

  const billableAmount =
    fixedPrice.billableAmount !== "" && fixedPrice.billableAmount !== null && fixedPrice.billableAmount !== undefined && Number(fixedPrice.billableAmount) > 0
      ? Number(fixedPrice.billableAmount)
      : totalContractValue - retentionAmount;

  const advanceReceived = Number(fixedPrice.advanceReceived) || 0;
  const hasAdvance = advanceReceived > 0;

  const remainingAmount =
    fixedPrice.remainingAmount !== "" && fixedPrice.remainingAmount !== null && fixedPrice.remainingAmount !== undefined && Number(fixedPrice.remainingAmount) > 0
      ? Number(fixedPrice.remainingAmount)
      : billableAmount - advanceReceived;

  const pmsBudgetVal = parseNumericValue(fixedPrice.pmsProjectBudget) ?? projectBudgetValue;
  // Contract Value is shown only when it is a different amount from the
  // Project Budget already shown in the overview.
  const isDifferentAmount = pmsBudgetVal !== null && pmsBudgetVal > 0 && !isSameAmount(totalContractValue, pmsBudgetVal);

  return (
    <div className="space-y-2.5 py-1">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-indigo-50/60 px-3 py-2 text-xs text-slate-700">
        <span className="mr-1 text-[11px] text-slate-500">Financial Calculation Formula</span>
        <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5">Billable Amount</span>
        <span className="text-slate-400">−</span>
        <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5">Retention Amount</span>
        <span className="text-slate-400">−</span>
        <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5">Advance Received</span>
        <span className="font-semibold text-indigo-600">=</span>
        <span className="rounded bg-[#0A0082] px-1.5 py-0.5 font-medium text-white">Remaining Receivable</span>
      </div>

      {isDifferentAmount && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs text-amber-900">
          <Info className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>Contract Value is used for billing calculation because it differs from the Project Budget.</span>
        </div>
      )}

      <FieldList
        fields={[
          ...(isDifferentAmount
            ? [
                {
                  label: (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span>Contract Value</span>
                      <span className="rounded bg-indigo-50 px-1.5 py-px text-[10px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
                        Billing Amount Used
                      </span>
                    </span>
                  ),
                  value: totalContractValue ? formatMoney(totalContractValue, currency) : "—",
                  money: true,
                },
              ]
            : []),
          { label: "Retention %", value: hasRetention ? `${retentionPercent}%` : "0%" },
          {
            label: "Retention Amount",
            value: hasRetention ? `-${formatMoney(retentionAmount, currency)}` : formatMoney(0, currency),
            money: true,
          },
          { label: "Billable Amount", value: formatMoney(billableAmount, currency), money: true },
          {
            label: "Advance Received",
            value: hasAdvance ? `-${formatMoney(advanceReceived, currency)}` : formatMoney(0, currency),
            money: true,
          },
          ...(fixedPrice.remarks ? [{ label: "Remarks", value: fixedPrice.remarks }] : []),
        ]}
      />

      {/* Remaining Receivable — the final financial result */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3.5 py-2">
        <span className="text-[13px] font-medium text-emerald-900">
          Remaining Receivable <span className="text-xs font-normal text-emerald-700">· Net outstanding balance to collect</span>
        </span>
        <span className="text-base font-semibold tabular-nums text-emerald-900">{formatMoney(remainingAmount, currency) || "—"}</span>
      </div>
    </div>
  );
}

function TimeMaterialPricing({ billingConfig, currency }) {
  const pricingModel = billingConfig.pricingModel || billingConfig.billingMode || "";
  const roleRateRows = (billingConfig.timeAndMaterial?.roles || []).filter((roleRate) => roleRate.role || roleRate.rate);
  const standardRate = billingConfig.timeAndMaterial || {};
  return (
    <div className="space-y-2">
      <FieldList
        fields={[
          ...(pricingModel ? [{ label: "Pricing Mode", value: BILLING_MODE_LABELS[pricingModel] || pricingModel, tone: "brand" }] : []),
          ...(pricingModel === "STANDARD" || !pricingModel
            ? [
                {
                  label: "Standard Rate",
                  value: `${formatMoney(standardRate.rate, currency) || "—"} ${ratePeriodSuffix(standardRate.ratePeriod)}`.trim(),
                  money: true,
                },
              ]
            : []),
        ]}
      />
      {pricingModel === "ROLE_BASED" && (
        <div className="pb-1">
          <RoleRatesList roles={roleRateRows} currency={currency} />
        </div>
      )}
    </div>
  );
}

function RecurringPricing({ billingConfig, currency, projectBudgetValue, isProductService }) {
  const recurring = billingConfig.recurring || {};
  const amount = parseNumericValue(recurring.contractValue);
  const isPmsSource = recurring.contractValueSource === "PMS";
  const budgetSourceLabel = isProductService ? "Manual" : isPmsSource ? "Project Budget" : "Manual";
  const renewalModeLabel =
    recurring.renewalMode === "CUSTOM" ? "Custom" : recurring.renewalMode === "SAME_AS_PREVIOUS" ? "Same as Previous" : "Not configured";
  // Billing Frequency is already in the overview; Total Budget is shown only
  // when it differs from the Project Budget shown there.
  const showTotalBudget = !isSameAmount(amount, projectBudgetValue);

  return (
    <FieldList
      fields={[
        { label: "Billing Context", value: isProductService ? "Product / Service" : "Project" },
        { label: "Budget Source", value: budgetSourceLabel },
        ...(showTotalBudget ? [{ label: "Total Budget", value: amount ? formatMoney(amount, currency) : "—", money: true }] : []),
        // Renewal is a Subscription (Product/Service) concept only — a
        // project-based Recurring configuration is never renewed.
        ...(isProductService ? [{ label: "Renewal", value: renewalModeLabel }] : []),
        ...(recurring.remarks ? [{ label: "Remarks", value: recurring.remarks }] : []),
      ]}
    />
  );
}

function MilestonePlanPricing({ review, currency, projectBudgetValue }) {
  return (
    <FieldList
      fields={[
        { label: "Payment Structure", value: review.paymentStructureLabel },
        // Total Value is normally the Project Budget itself — shown only when
        // it is a different amount.
        ...(isSameAmount(review.totalValue, projectBudgetValue)
          ? []
          : [{ label: "Total Value", value: formatMoney(review.totalValue, currency), money: true }]),
        {
          label: "Allocation Percentage",
          value: `${review.allocationPercentage}%`,
          tone: review.isFullyAllocated ? undefined : "warning",
        },
        {
          label: "Remaining Amount",
          value: formatMoney(review.remainingAmount, currency),
          money: true,
          tone: review.remainingAmount > 0 ? "warning" : "success",
        },
        ...(review.milestonePlan.remarks ? [{ label: "Remarks", value: review.milestonePlan.remarks }] : []),
      ]}
    />
  );
}

// Read-only review of a billing configuration — used as the wizard's final
// step (onEditStep enables per-section "Edit" links) and as the standalone
// Billing Configuration view (leading/headerActions place the Back button and
// "Edit Configuration" inside the overview card).
//
// One business value -> one primary display: Currency and Project Budget
// live only in the overview; lower sections show a total only when it is a
// genuinely different amount, and individual payment amounts appear only in
// Payment Schedule.
export default function ReviewActivateStep({ wizardData, onEditStep, leading, headerActions, pendingChanges }) {
  const { projectInfo = {}, billingConfig = {}, controls = {}, approvalStatus, billingStatus } = wizardData;

  const billingContext = projectInfo.billingContext || "PROJECT";
  const isProductService = billingContext === "PRODUCT_SERVICE";

  const currency = projectInfo.projectBudgetCurrency || projectInfo.currency || "";
  const projectBudgetValue = isProductService ? null : parseNumericValue(projectInfo.projectBudget);

  const frequencyNameCode = String(
    billingConfig.billingFrequencyName || billingConfig.billingFrequencyLabel || ""
  )
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  const isOneTime = frequencyNameCode === "ONE_TIME";

  const isMilestonePlan =
    billingConfig.billingType === "MILESTONE_PLAN" ||
    billingConfig.billingType === "MILESTONE_BASED" ||
    billingConfig.billingType === "MILESTONE" ||
    String(billingConfig.billingTypeName || "").toUpperCase().includes("MILESTONE") ||
    String(billingConfig.billingTypeLabel || "").toUpperCase().includes("MILESTONE");

  const billingTypeLabel = getBillingTypeDisplayName(
    billingConfig.billingTypeName ||
      billingConfig.billingTypeLabel ||
      billingConfig.billingType ||
      "—",
  );

  const billingFrequencyLabel = isMilestonePlan
    ? "One-Time"
    : formatFrequencyLabel(
        billingConfig.billingFrequency,
        billingConfig.billingFrequencyName,
        billingConfig.billingFrequencyLabel,
        isOneTime,
      );

  const commercialEffectiveDates = getCommercialEffectiveDates(billingConfig);
  // Billing dates only — never the project's own start/end (that is Project
  // Duration, shown in the primary summary).
  const hasSchedule = Boolean(commercialEffectiveDates.from || commercialEffectiveDates.to);

  const milestoneReview = isMilestonePlan ? buildMilestonePlanReview(wizardData, projectInfo) : null;
  // Labels of fields the backend reports as changed — drives the subtle
  // "Changed" chips on matching review rows. Empty outside the view page.
  const changedFieldLabels = useMemo(() => getChangedFieldLabels(pendingChanges), [pendingChanges]);

  const pricingProps = { billingConfig, currency, projectBudgetValue, isProductService };
  let pricingContent = null;
  if (milestoneReview) {
    pricingContent = <MilestonePlanPricing review={milestoneReview} currency={currency} projectBudgetValue={projectBudgetValue} />;
  } else if (billingConfig.billingType === "FIXED_PRICE") {
    pricingContent = <FixedPricePricing {...pricingProps} />;
  } else if (billingConfig.billingType === "TIME_MATERIAL") {
    pricingContent = <TimeMaterialPricing {...pricingProps} />;
  } else if (billingConfig.billingType === "RECURRING") {
    pricingContent = <RecurringPricing {...pricingProps} />;
  } else if (billingConfig.billingType === "MILESTONE") {
    pricingContent = <FieldList fields={[{ label: "Milestones", value: `${(billingConfig.milestones || []).length} defined` }]} />;
  }

  const effectivePeriod = `${commercialEffectiveDates.from ? formatDisplayDate(commercialEffectiveDates.from) : "—"} – ${
    commercialEffectiveDates.to ? formatDisplayDate(commercialEffectiveDates.to) : "Ongoing"
  }`;

  return (
    <ChangedFieldsContext.Provider value={changedFieldLabels}>
      <div className="space-y-4">
        {/* 1. Project / Configuration */}
        <ReviewHeader
          projectInfo={projectInfo}
          isProductService={isProductService}
          approvalStatus={approvalStatus}
          billingStatus={billingStatus}
          leading={leading}
          actions={
            (headerActions || onEditStep) && (
              <div className="flex items-center gap-2">
                {headerActions}
                {onEditStep && (
                  <button
                    type="button"
                    onClick={() => onEditStep(1)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-500" /> Edit Setup
                  </button>
                )}
              </div>
            )
          }
          summary={[
            { label: "Billing Type", value: billingTypeLabel, strong: true },
            { label: "Billing Frequency", value: billingFrequencyLabel },
            { label: "Currency", value: currency },
            { label: "Project Budget", value: isProductService ? "—" : formatMoney(projectInfo.projectBudget, currency), emphasize: true },
          ]}
        />

        {/* Changes Pending Approval — backend change snapshot (previous approved
            -> new proposed), shown before the details it affects. */}
        {pendingChanges !== undefined && (
          <ConfigurationChanges changes={pendingChanges} currency={currency} />
        )}

        {/* 2. Billing & Pricing — billing-type-specific commercial details */}
        <ReviewSection icon={Wallet} title="Billing & Pricing" stepId={2} onEdit={onEditStep}>
          {pricingContent || <FieldList fields={[{ label: "Billing Type", value: "—" }]} />}
        </ReviewSection>

        {/* 3. Payment / Billing Schedule — billing-type aware */}
        {milestoneReview ? (
          <ReviewSection icon={Calendar} title="Payment Schedule" stepId={2} onEdit={onEditStep}>
            <PaymentSchedule review={milestoneReview} currency={currency} />
          </ReviewSection>
        ) : (
          <ReviewSection icon={Calendar} title="Billing Schedule" stepId={2} onEdit={onEditStep}>
            {/* Billing dates only — Project Duration (the PMS project period)
                lives in the primary summary. */}
            {hasSchedule ? (
              <FieldList fields={[{ label: "Effective Period", value: effectivePeriod }]} />
            ) : (
              <p className="flex items-center gap-2 py-1.5 text-xs text-slate-500">
                <Calendar className="h-4 w-4 text-slate-300" />
                Billing schedule not applicable — this billing configuration type does not require a recurring schedule.
              </p>
            )}
          </ReviewSection>
        )}

        {/* 4. Invoice & Control Settings */}
        <ReviewSection icon={Receipt} title="Invoice & Control Settings" stepId={3} onEdit={onEditStep}>
          <FieldGrid
            fields={[
              {
                label: "Invoice Generation",
                value:
                  controls.autoInvoiceGeneration === true
                    ? "Automatic"
                    : controls.autoInvoiceGeneration === false
                    ? "Manual"
                    : "—",
              },
              ...(controls.autoInvoiceGeneration === true
                ? [{ label: "Generation Day", value: controls.invoiceGenerationDay ? `Day ${controls.invoiceGenerationDay}` : "—" }]
                : []),
              { label: "Payment Terms", value: controls.paymentTermName || controls.paymentTerms || controls.paymentTermId || "—" },
              { label: "Tax Region", value: controls.taxRegionName || controls.taxRegionId || "—" },
              { label: "Expense Billing Eligibility", value: controls.expenseBillingEligible ? "Eligible" : "Not Eligible" },
            ]}
          />
        </ReviewSection>
      </div>
    </ChangedFieldsContext.Provider>
  );
}
