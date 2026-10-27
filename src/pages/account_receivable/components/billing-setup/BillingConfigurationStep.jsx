import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, Pencil, Trash2, Loader2, Landmark, Wallet, Layers, Lock, AlertCircle, Tag, ChevronDown, ChevronUp, Search, Target } from "lucide-react";

import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import FormTextArea from "../../../../components/forms/FormTextArea";
import Button from "../../../../components/Button/Button";
import ARTable from "../common/ARTable";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import StatusBadge from "../../../../components/status/statusbadge";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";
import RadioCardGroup from "../common/RadioCardGroup";
import ToggleSwitch from "../common/ToggleSwitch";
import PmsMilestoneSelectionPanel from "./PmsMilestoneSelectionPanel";
import { useProjectMilestones } from "./useProjectMilestones";
import { isMilestoneEntryLocked, toPmsProjectId } from "../../services/projectMilestoneService";
import {
  MILESTONE_STATUS_OPTIONS,
  CURRENCY_OPTIONS,
  CONTRACT_VALUE_SOURCE_OPTIONS,
  RECURRING_RENEWAL_MODE_OPTIONS,
  PAYMENT_STRUCTURE_OPTIONS,
} from "../../data/wizardOptions";
import { formatCurrency, formatDisplayDate, formatIndianNumber, isValidCurrency } from "../../utils/format";
import { getBillingTypeDisplayName } from "../../utils/billingType";
import {
  getRecurringDateErrors,
  hasRecurringDateErrors,
  toDateOnly,
  countRecurringOccurrences,
} from "../../utils/recurringBillingSchedule";
import {
  getActiveBillingTypes,
  getActiveBillingFrequencies,
  getTmRateCardsByBillingConfiguration,
  createTmRateCard,
  updateTmRateCard,
  saveTmRateCard,
  deleteTmRateCard,
  getApiErrorMessage,
  calculateDiscountedRate,
  mapUiDiscountTypeToApi,
  mapApiDiscountTypeToUi,
  getTmRateDiscounts,
  createTmRateDiscount,
  updateTmRateDiscount,
  deleteTmRateDiscount,
  syncStandardRateDiscounts,
  normalizeTmRateDiscount,
  calculateRateDiscountPreview,
  getFixedPriceByBillingConfiguration,
  createFixedPriceConfiguration,
  updateFixedPriceConfiguration,
  deleteFixedPriceConfiguration,
  isMilestonePlanNotFoundError,
  getMilestonePlanByBillingConfiguration,
  createMilestonePlanConfiguration,
  updateMilestonePlanConfiguration,
  deleteMilestonePlanConfiguration,
  buildMilestonePlanRequestPayload,
  normalizeMilestonePaymentEntry,
  toApiContractValueSource,
  formatBillingFrequencyLabel,
  getBillingRecurringByBillingConfigurationId,
  createBillingRecurring,
  updateBillingRecurring,
  deleteBillingRecurring,
  normalizeRecurringConfig,
  buildRecurringRequestPayload,
  getBillingRecurringSchedule,
  getBillingRecurringScheduleByBillingConfigurationId,
  previewBillingSchedule,
  renewBillingRecurring,
  getBillingRecurringRenewalHistory,
} from "../../services/billingConfigurationService";

let milestoneSeq = 0;
function nextMilestoneId() {
  milestoneSeq += 1;
  return `MS-NEW-${milestoneSeq}`;
}

// Recurring billing has no Pricing Model concept anymore — the Billing
// Frequency (durationValue + durationUnit) alone determines the recurring
// period, so RECURRING intentionally returns no options here (see
// RecurringBillingForm).
function getPricingModelOptions(billingType) {
  switch (billingType) {
    case "TIME_MATERIAL":
      return [
        { value: "STANDARD", label: "Standard Rate", description: "One hourly rate applies to all approved billable hours." },
        { value: "ROLE_BASED", label: "Role-Based Rates", description: "Different hourly rates are maintained for each project role." },
      ];
    default:
      return [];
  }
}

// Half-Yearly is offered for Recurring and Fixed Price (see
// getBillingFrequencyOptions); display order is fixed regardless of backend order.
const BILLING_FREQUENCY_ORDER = [
  "WEEKLY",
  "BI_WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "ANNUALLY",
];
// Fixed Price is the only billing type that can be settled as a single lump sum,
// so One-Time is offered there and nowhere else.
const FIXED_PRICE_FREQUENCY_ORDER = [
  "ONE_TIME",
  "WEEKLY",
  "BI_WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "ANNUALLY",
];
// Featured order for new configurations is Time & Material, Milestone Plan,
// Recurring — Fixed Price and the legacy bare Milestone type are kept after
// them only for backward compatibility with existing configurations.
const BILLING_TYPE_ORDER = [
  "TIME_MATERIAL",
  "MILESTONE_PLAN",
  "RECURRING",
  "FIXED_PRICE",
  "MILESTONE",
];

function sortByOrder(options, order, key = "value") {
  const getKey = typeof key === "function" ? key : (item) => item[key];
  return [...options].sort((a, b) => {
    const aIndex = order.indexOf(getKey(a));
    const bIndex = order.indexOf(getKey(b));
    return (
      (aIndex === -1 ? order.length : aIndex) -
      (bIndex === -1 ? order.length : bIndex)
    );
  });
}

// Billing Frequency options come back from the master-data API with `value`
// set to the record's database UUID (see normalizeBillingFrequency), not a
// semantic code — sorting/filtering against BILLING_FREQUENCY_ORDER (or the
// "ONE_TIME"/"HALF_YEARLY" literals below) by `.value` would never match
// anything. Derive a stable code from the display label instead
// ("Bi-Weekly" -> "BI_WEEKLY") so both the fixed display order and the
// One-Time/Half-Yearly exclusions actually take effect.
const frequencyCode = (option) =>
  String(option?.label || option?.billingFrequencyName || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

function getBillingFrequencyOptions(billingType, frequencies = []) {
  if (billingType === "RECURRING") {
    // Recurring supports every active cadence the backend returns (Monthly,
    // Quarterly, Half-Yearly, Annual, or any future frequency) — only
    // One-Time is excluded, since that's a single lump sum with no recurring
    // schedule and only ever applies to Fixed Price.
    return sortByOrder(
      frequencies.filter((option) => frequencyCode(option) !== "ONE_TIME"),
      BILLING_FREQUENCY_ORDER,
      frequencyCode,
    );
  }

  if (billingType === "FIXED_PRICE") {
    return sortByOrder(frequencies, FIXED_PRICE_FREQUENCY_ORDER, frequencyCode);
  }

  // Milestone Plan is driven by payment/installment dates, not a recurring
  // cadence — it is always billed One-Time and the picker is never shown
  // interactively for it (see the Billing Frequency render block below), but
  // this keeps frequencyOptions consistent in case anything else reads it.
  if (billingType === "MILESTONE_PLAN") {
    return frequencies.filter((option) => frequencyCode(option) === "ONE_TIME");
  }

  // One-Time and Half-Yearly only make sense against Fixed Price/Recurring, so
  // every other billing type (T&M, Milestone) never offers them, even if master
  // data does.
  return sortByOrder(
    frequencies.filter(
      (option) => !["ONE_TIME", "HALF_YEARLY"].includes(frequencyCode(option)),
    ),
    BILLING_FREQUENCY_ORDER,
    frequencyCode,
  );
}

const RATE_PERIOD_OPTIONS = [
  { value: "HOURLY", label: "Hourly" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
];

// Effective From/To only ever apply to recurring billing frequencies — a
// One-Time configuration is settled as a single lump sum with no schedule, so
// it carries no date range at all (see FixedPriceForm/TimeAndMaterialForm).
const isOneTimeFrequency = (billingFrequency) => billingFrequency === "ONE_TIME";

// Dates are plain yyyy-mm-dd strings (native <input type="date"> values, and
// project startDate/endDate are normalized to the same format), so lexical
// comparison is equivalent to chronological comparison — no Date parsing needed.
function getEffectiveDateErrors({ effectiveFrom, effectiveTo, projectStartDate, projectEndDate }) {
  const errors = { effectiveFrom: "", effectiveTo: "" };

  if (effectiveFrom && projectStartDate && effectiveFrom < projectStartDate) {
    errors.effectiveFrom = `Effective From cannot be before the project start date (${projectStartDate}).`;
  } else if (effectiveFrom && projectEndDate && effectiveFrom > projectEndDate) {
    errors.effectiveFrom = `Effective From cannot be after the project end date (${projectEndDate}).`;
  }

  if (effectiveTo && projectEndDate && effectiveTo > projectEndDate) {
    errors.effectiveTo = `Effective To cannot be after the project end date (${projectEndDate}).`;
  } else if (effectiveTo && projectStartDate && effectiveTo < projectStartDate) {
    errors.effectiveTo = `Effective To cannot be before the project start date (${projectStartDate}).`;
  }

  if (!errors.effectiveTo && effectiveFrom && effectiveTo && effectiveFrom > effectiveTo) {
    errors.effectiveTo = "Effective To must be on or after Effective From.";
  }

  return errors;
}

const hasEffectiveDateErrors = (errors) => Boolean(errors?.effectiveFrom || errors?.effectiveTo);

const DISCOUNT_TYPE_OPTIONS = [
  { value: "PERCENTAGE", label: "Percentage (%)" },
  { value: "FIXED_AMOUNT", label: "Fixed Amount" },
];

function getRatePeriodSuffix(ratePeriod) {
  switch (ratePeriod) {
    case "HOURLY": return "/ hr";
    case "DAILY": return "/ day";
    case "WEEKLY": return "/ week";
    case "MONTHLY": return "/ month";
    case "ANNUAL": return "/ yr";
    default: return "";
  }
}

function getDiscountDateErrors({ discountStartDate, discountEndDate, effectiveFrom, effectiveTo, projectStartDate, projectEndDate }) {
  const errors = { discountStartDate: "", discountEndDate: "" };
  if (!discountStartDate && !discountEndDate) return errors;

  if (discountStartDate && discountEndDate && discountStartDate > discountEndDate) {
    errors.discountEndDate = "Discount End Date must be on or after Start Date.";
  }

  const rangeStart = effectiveFrom || projectStartDate;
  const rangeEnd = effectiveTo || projectEndDate;

  if (discountStartDate && rangeStart && discountStartDate < rangeStart) {
    errors.discountStartDate = `Discount Start Date cannot be before effective start (${rangeStart}).`;
  }
  if (discountStartDate && rangeEnd && discountStartDate > rangeEnd) {
    errors.discountStartDate = `Discount Start Date cannot be after effective end (${rangeEnd}).`;
  }
  if (discountEndDate && rangeEnd && discountEndDate > rangeEnd) {
    errors.discountEndDate = `Discount End Date cannot be after effective end (${rangeEnd}).`;
  }
  if (discountEndDate && rangeStart && discountEndDate < rangeStart) {
    errors.discountEndDate = `Discount End Date cannot be before effective start (${rangeStart}).`;
  }

  return errors;
}

const EMPTY_RATE_CARD = {
  role: "",
  roleName: "",
  rate: "",
  ratePeriod: "HOURLY",
  effectiveFrom: "",
  effectiveTo: "",
  rateCardId: null,
  isSaved: false,
  remarks: "",
  hasDiscount: false,
  discountType: "PERCENTAGE",
  discountValue: "",
  discountedRate: "",
  discountStartDate: "",
  discountEndDate: "",
  includeBaseRateInInvoice: true,
  includeInInvoice: true,
  discountPeriods: [],
};

// TM rate card dates come back from the backend as Java LocalDate arrays
// ([year, month, day], e.g. [2026, 9, 11]) rather than "yyyy-mm-dd" strings.
// Left as-is, that array is truthy so it flows straight into the native date
// input's value (which silently renders blank) and into string date
// comparisons (where "2026,9,11" sorts lexically differently than
// "2026-09-11", producing bogus before/after-project-date errors even for a
// date equal to the boundary). Normalize to the zero-padded string every
// other date field already uses; strings pass through unchanged.
function normalizeRateCardDate(date) {
  if (Array.isArray(date)) {
    const [year, month, day] = date;
    if (!year || !month || !day) return "";
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return date || "";
}

const mapRateCard = (card = {}, includeRole = true) => {
  const rate = card.rate ?? card.amount ?? "";
  const hasDiscount = Boolean(
    card.hasDiscount ?? (card.discountType && card.discountType !== "NONE" && Number(card.discountValue) > 0)
  );
  const discountType = card.discountType || (card.discountValue ? "PERCENTAGE" : "NONE");
  const discountValue = card.discountValue !== undefined && card.discountValue !== null ? card.discountValue : "";
  const calculatedDiscounted = hasDiscount && rate && discountValue
    ? calculateDiscountedRate(rate, discountType, discountValue)
    : "";
  const discountedRate = card.discountedRate !== undefined && card.discountedRate !== null && card.discountedRate !== ""
    ? card.discountedRate
    : calculatedDiscounted;

  const rawPeriods = Array.isArray(card.discountPeriods) ? card.discountPeriods : [];
  const discountPeriods = rawPeriods.length > 0
    ? rawPeriods.map(normalizeTmRateDiscount)
    : (hasDiscount && discountValue
      ? [
          {
            periodName: "Discount Period 1",
            discountType: discountType || "PERCENTAGE",
            discountValue,
            effectiveFrom: normalizeRateCardDate(card.discountStartDate) || normalizeRateCardDate(card.effectiveFrom) || "",
            effectiveTo: normalizeRateCardDate(card.discountEndDate) || normalizeRateCardDate(card.effectiveTo) || "",
            notes: card.remarks || card.notes || "",
            includeInInvoice: card.includeInInvoice !== false,
          },
        ]
      : []);

  const rateCardId = card.id || card.rateCardId || card.tmRateCardId || null;
  const uid = card._uid || (rateCardId ? `role-${rateCardId}` : `role-new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

  return {
    _uid: uid,
    ...(includeRole
      ? { role: card.roleName || card.role || card.name || "" }
      : {}),
    roleName: card.roleName || card.role || card.name || "",
    rate,
    ratePeriod: card.ratePeriod || card.period || "HOURLY",
    effectiveFrom: normalizeRateCardDate(card.effectiveFrom || card.validFrom),
    effectiveTo: normalizeRateCardDate(card.effectiveTo || card.validTo),
    rateCardId: card.id || card.rateCardId || card.tmRateCardId || null,
    isSaved: Boolean(card.id || card.rateCardId || card.tmRateCardId),
    remarks: card.remarks || card.notes || "",
    hasDiscount: Boolean(hasDiscount || discountPeriods.length > 0),
    discountType: hasDiscount ? discountType : "PERCENTAGE",
    discountValue: hasDiscount ? discountValue : "",
    discountedRate: hasDiscount ? discountedRate : (rate || ""),
    discountStartDate: normalizeRateCardDate(card.discountStartDate),
    discountEndDate: normalizeRateCardDate(card.discountEndDate),
    includeBaseRateInInvoice: card.includeBaseRateInInvoice !== undefined ? card.includeBaseRateInInvoice !== false : card.includeInInvoice !== false,
    includeInInvoice: card.includeBaseRateInInvoice !== undefined ? card.includeBaseRateInInvoice !== false : card.includeInInvoice !== false,
    discountPeriods,
  };
};

function normalizeBillingType(type) {
  const name = String(type?.billingTypeName || "").trim();

  let value = "";

  switch (name.toLowerCase()) {
    case "fixed price":
      value = "FIXED_PRICE";
      break;

    case "timesheet based":
    case "time and material":
    case "time & material":
      value = "TIME_MATERIAL";
      break;

    // The billing_type_master record is still literally named "Milestone Based"
    // (no separate master-data row exists for "Milestone Plan") — this billing
    // type is now the Milestone Plan flow (Full Payment / Installments today,
    // Milestones via PMS to follow later) and routes to MilestonePlanForm, not
    // the legacy bare MilestoneForm. getBillingTypeDisplayName below relabels
    // the raw "Milestone Based" master-data name to "Milestone Plan" for display.
    case "milestone based":
    case "milestone plan":
      value = "MILESTONE_PLAN";
      break;

    case "subscription":
    case "recurring":
      value = "RECURRING";
      break;

    default:
      value = "";
  }

  return {
    ...type,
    value,
    label: value === "RECURRING" ? "Recurring" : getBillingTypeDisplayName(name),
    billingTypeId: type.billingTypeId,
  };
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function PillSelectGroup({ name, options, value, onChange, disabled = false }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = String(value) === String(option.value);
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange?.(option.value)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A0082]/30 ${
              isSelected
                ? "border-[#0A0082] bg-[#0A0082]/5 text-[#0A0082]"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function PmsSyncedBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
      Synced from PMS
    </span>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-center min-h-[72px]">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-base font-bold text-slate-900 mt-1">
        {value || "—"}
      </span>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return <FormInput label={label} value={value || "—"} disabled onChange={() => { }} />;
}

function BillingSummaryHeader({ projectInfo }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        label="Billing Type"
        value={BILLING_TYPE_LABELS[projectInfo.billingType] || projectInfo.billingType}
      />
      <SummaryCard
        label="Billing Mode"
        value={BILLING_MODE_LABELS[projectInfo.billingMode] || projectInfo.billingMode}
      />
      <SummaryCard label="Billing Frequency" value={frequencyLabel(projectInfo.billingFrequency)} />
      <SummaryCard label="Currency" value={projectInfo.currency} />
    </div>
  );
}

function TimeAndMaterialForm({
  value = {},
  onChange,
  billingMode,
  currency,
  isExisting,
  billingConfigurationId,
  ensureBillingConfigurationId,
  billingConfigurationPayload,
  billingFrequency,
  projectStartDate,
  projectEndDate,
}) {
  const update = (patch) => onChange({ ...value, ...patch });
  const isOneTime = isOneTimeFrequency(billingFrequency);
  // Project dates can arrive as a full timestamp depending on which backend
  // lookup supplied them; the date input's min/max (and every comparison
  // below) need a plain yyyy-mm-dd, same normalization FixedPriceForm/
  // RecurringBillingForm already apply to these same props.
  const projectStartDateOnly = toDateOnly(projectStartDate);
  const projectEndDateOnly = toDateOnly(projectEndDate);
  const isCurrencyValid = isValidCurrency(currency);

  const rawPeriods = Array.isArray(value.discountPeriods)
    ? value.discountPeriods
    : (value.hasDiscount && value.discountValue
      ? [
          {
            periodName: "Discount Period 1",
            discountType: value.discountType ? mapApiDiscountTypeToUi(value.discountType) : "PERCENTAGE",
            discountValue: value.discountValue,
            effectiveFrom: value.discountStartDate || value.effectiveFrom || "",
            effectiveTo: value.discountEndDate || value.effectiveTo || "",
            notes: value.remarks || value.notes || "",
            includeInInvoice: value.includeInInvoice !== false,
          },
        ]
      : []);

  const getPeriodStableKey = (p, idx) =>
    String(p?.discountId || p?._uid || p?.periodId || p?.id || `period-key-${idx}`);

  const discountPeriods = rawPeriods.map((p, idx) => ({
    ...p,
    _uid: p._uid || (p.discountId ? `period-${p.discountId}` : `period-uid-${idx}`),
    periodName: p.periodName !== undefined && p.periodName !== null ? p.periodName : `Period ${idx + 1}`,
    discountType: p.discountType ? mapApiDiscountTypeToUi(p.discountType) : "PERCENTAGE",
    includeInInvoice: p.includeInInvoice !== false,
  }));

  const [expandedPeriodKeys, setExpandedPeriodKeys] = useState(() => new Set());

  const toggleExpandPeriod = (key) => {
    setExpandedPeriodKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const standardRate = {
    ...EMPTY_RATE_CARD,
    rate: value.rate || "",
    ratePeriod: value.ratePeriod || "HOURLY",
    effectiveFrom: value.effectiveFrom || "",
    effectiveTo: value.effectiveTo || "",
    rateCardId: value.rateCardId || null,
    isSaved: Boolean(value.rateCardId),
    remarks: value.remarks || value.notes || "",
    hasDiscount: Boolean(value.hasDiscount || discountPeriods.length > 0),
    discountType: value.discountType ? mapApiDiscountTypeToUi(value.discountType) : "PERCENTAGE",
    discountValue: value.discountValue !== undefined && value.discountValue !== null ? value.discountValue : "",
    discountedRate: value.discountedRate || "",
    discountStartDate: value.discountStartDate || "",
    discountEndDate: value.discountEndDate || "",
    includeInInvoice: value.includeInInvoice !== false,
    // EMPTY_RATE_CARD defaults this to true, and the payload builder prefers it over includeInInvoice.
    includeBaseRateInInvoice: value.includeBaseRateInInvoice !== undefined
      ? value.includeBaseRateInInvoice !== false
      : value.includeInInvoice !== false,
    discountPeriods,
  };

  const getPeriodOverlapError = (period, idx, periods) => {
    if (!period.effectiveFrom || !period.effectiveTo) return null;
    for (let i = 0; i < periods.length; i++) {
      if (i === idx) continue;
      const other = periods[i];
      if (other.effectiveFrom && other.effectiveTo) {
        if (period.effectiveFrom <= other.effectiveTo && period.effectiveTo >= other.effectiveFrom) {
          return `Overlaps with "${other.periodName || `Period ${i + 1}`}" (${other.effectiveFrom} to ${other.effectiveTo}). Periods must not overlap.`;
        }
      }
    }
    return null;
  };

  const getPeriodValidationErrors = (period, idx, periods) => {
    const errors = {
      periodName: "",
      discountValue: "",
      effectiveFrom: "",
      effectiveTo: "",
      overlap: "",
    };
    if (standardRate?.ratePeriod && standardRate.ratePeriod !== "HOURLY") {
      errors.periodName = "Discount schedules are only permitted for hourly rate cards.";
    }
    if (!period.periodName?.trim()) {
      errors.periodName = "Period name is required.";
    }
    const dv = Number(period.discountValue);
    if (period.discountValue === "" || period.discountValue === null || period.discountValue === undefined) {
      errors.discountValue = "Discount value is required.";
    } else if (Number.isNaN(dv) || dv <= 0) {
      errors.discountValue = "Discount value must be greater than 0.";
    } else if (period.discountType === "PERCENTAGE" && dv >= 100) {
      errors.discountValue = "Percentage discount must be less than 100%.";
    } else if ((period.discountType === "FIXED_AMOUNT" || period.discountType === "FIXED") && standardRate.rate && dv >= Number(standardRate.rate)) {
      errors.discountValue = `Fixed discount must be less than base rate (${formatCurrency(standardRate.rate, currency)}).`;
    }

    if (!period.effectiveFrom) {
      errors.effectiveFrom = "Start date is required.";
    } else if (projectStartDateOnly && period.effectiveFrom < projectStartDateOnly) {
      errors.effectiveFrom = `Cannot precede project start date (${projectStartDateOnly}).`;
    } else if (standardRate.effectiveFrom && period.effectiveFrom < standardRate.effectiveFrom) {
      errors.effectiveFrom = `Cannot precede rate card start date (${standardRate.effectiveFrom}).`;
    }

    if (!period.effectiveTo) {
      errors.effectiveTo = "End date is required.";
    } else if (period.effectiveFrom && period.effectiveTo < period.effectiveFrom) {
      errors.effectiveTo = "End date must be on or after start date.";
    } else if (projectEndDateOnly && period.effectiveTo > projectEndDateOnly) {
      errors.effectiveTo = `Cannot exceed project end date (${projectEndDateOnly}).`;
    } else if (standardRate.effectiveTo && period.effectiveTo > standardRate.effectiveTo) {
      errors.effectiveTo = `Cannot exceed rate card end date (${standardRate.effectiveTo}).`;
    }

    errors.overlap = getPeriodOverlapError(period, idx, periods) || "";
    return errors;
  };

  const addDiscountPeriod = () => {
    if (standardRate?.ratePeriod && standardRate.ratePeriod !== "HOURLY") {
      showStatusToast("Commercial discount schedules are currently supported only for hourly rate cards.", "warning");
      return;
    }
    if (!standardRate.rate || Number(standardRate.rate) <= 0) {
      showStatusToast("Please enter a valid standard base rate before adding discount periods.", "warning");
      return;
    }

    const existingPeriods = standardRate.discountPeriods || [];
    if (existingPeriods.length > 0) {
      for (let i = 0; i < existingPeriods.length; i++) {
        const p = existingPeriods[i];
        const pErrors = getPeriodValidationErrors(p, i, existingPeriods);
        const errorList = Object.values(pErrors).filter(Boolean);
        if (errorList.length > 0) {
          const key = getPeriodStableKey(p, i);
          setExpandedPeriodKeys((prev) => new Set([...prev, key]));
          showStatusToast(
            `Please complete "${p.periodName || `Period ${i + 1}`}" (${errorList[0]}) before adding another rate period.`,
            "warning",
          );
          return;
        }
      }
    }

    let defaultStart = "";
    let defaultEnd = "";
    if (existingPeriods.length === 0) {
      defaultStart = standardRate.effectiveFrom || projectStartDateOnly || "";
      defaultEnd = standardRate.effectiveTo || projectEndDateOnly || "";
    } else {
      const lastPeriod = existingPeriods[existingPeriods.length - 1];
      if (lastPeriod.effectiveTo) {
        const lastEndDate = new Date(lastPeriod.effectiveTo);
        if (!Number.isNaN(lastEndDate.getTime())) {
          const nextDay = new Date(lastEndDate);
          nextDay.setDate(nextDay.getDate() + 1);
          const nextDayStr = nextDay.toISOString().slice(0, 10);
          if (!projectEndDateOnly || nextDayStr <= projectEndDateOnly) {
            defaultStart = nextDayStr;
            defaultEnd = standardRate.effectiveTo || projectEndDateOnly || nextDayStr;
          }
        }
      }
      if (!defaultStart) {
        defaultStart = standardRate.effectiveFrom || projectStartDateOnly || "";
        defaultEnd = standardRate.effectiveTo || projectEndDateOnly || "";
      }
    }

    const nextIdx = existingPeriods.length + 1;
    const uid = `period-new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newPeriod = {
      _uid: uid,
      periodName: `Period ${nextIdx}`,
      discountType: "PERCENTAGE",
      discountValue: "",
      effectiveFrom: defaultStart,
      effectiveTo: defaultEnd,
      notes: "",
      includeInInvoice: true,
      discountAmount: null,
      netRate: null,
    };
    const nextPeriods = [...existingPeriods, newPeriod];
    setExpandedPeriodKeys((prev) => new Set([...prev, uid]));
    update({
      discountPeriods: nextPeriods,
      hasDiscount: true,
    });
  };

  const updateDiscountPeriod = (idx, patch) => {
    const nextPeriods = (standardRate.discountPeriods || []).map((p, i) =>
      i === idx ? { ...p, ...patch } : p
    );
    update({
      discountPeriods: nextPeriods,
      hasDiscount: nextPeriods.length > 0,
    });
  };

  const removeDiscountPeriod = async (idx) => {
    const p = (standardRate.discountPeriods || [])[idx];
    const key = getPeriodStableKey(p, idx);
    if (p?.discountId) {
      const confirmed = window.confirm(
        `Remove discount period "${p.periodName || `Period ${idx + 1}`}"? This cannot be undone.`
      );
      if (!confirmed) return;
      try {
        await deleteTmRateDiscount(p.discountId);
        showStatusToast("Discount period removed", "success");
      } catch (err) {
        showStatusToast(getApiErrorMessage(err, "Failed to remove discount period"), "error");
        return;
      }
    }
    setExpandedPeriodKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    const nextPeriods = (standardRate.discountPeriods || []).filter((_, i) => i !== idx);
    update({
      discountPeriods: nextPeriods,
      hasDiscount: nextPeriods.length > 0,
    });
  };

  useEffect(() => {
    if (value?._validateTrigger) {
      const periods = standardRate.discountPeriods || [];
    if (periods.length > 0 && standardRate.ratePeriod && standardRate.ratePeriod !== "HOURLY") {
      showStatusToast("Commercial discount schedules are only permitted for hourly rate cards. Remove discounts or change rate frequency to Hourly.", "error");
      return;
    }
      const invalidKeys = new Set();
      periods.forEach((p, i) => {
        const pErrors = getPeriodValidationErrors(p, i, periods);
        if (Object.values(pErrors).some(Boolean)) {
          invalidKeys.add(getPeriodStableKey(p, i));
        }
      });
      if (invalidKeys.size > 0) {
        setExpandedPeriodKeys((prev) => new Set([...prev, ...invalidKeys]));
      }
    }
  }, [value?._validateTrigger]);


  const standardDiscountedRate = standardRate.hasDiscount && standardRate.rate && standardRate.discountValue
    ? calculateDiscountedRate(standardRate.rate, standardRate.discountType, standardRate.discountValue)
    : standardRate.rate;

  // Effective From/To on Timesheet-based (Time & Material) rates must fall
  // within the project's own start/end date, same as Fixed Price/Recurring.
  const standardDateErrors = isOneTime
    ? { effectiveFrom: "", effectiveTo: "" }
    : getEffectiveDateErrors({
        effectiveFrom: standardRate.effectiveFrom,
        effectiveTo: standardRate.effectiveTo,
        projectStartDate: projectStartDateOnly,
        projectEndDate: projectEndDateOnly,
      });

  const standardDiscountDateErrors = standardRate.hasDiscount
    ? getDiscountDateErrors({
        discountStartDate: standardRate.discountStartDate,
        discountEndDate: standardRate.discountEndDate,
        effectiveFrom: standardRate.effectiveFrom,
        effectiveTo: standardRate.effectiveTo,
        projectStartDate: projectStartDateOnly,
        projectEndDate: projectEndDateOnly,
      })
    : { discountStartDate: "", discountEndDate: "" };

  const [rows, setRows] = useState(() =>
    (value.roles || []).map((r) => mapRateCard(r)),
  );
  const [loadingRows, setLoadingRows] = useState(false);
  const [expandedRoleKeys, setExpandedRoleKeys] = useState(() => {
    const initial = new Set();
    const list = value.roles || [];
    list.forEach((r, idx) => {
      initial.add(String(r._uid || (r.rateCardId ? `role-${r.rateCardId}` : `role-idx-${idx}`)));
    });
    return initial;
  });
  const [expandedRolePeriodKeys, setExpandedRolePeriodKeys] = useState(() => new Set());
  const [roleSearchTerm, setRoleSearchTerm] = useState("");
  // Tracks which pricing modes have already been hydrated from the server for this
  // billing configuration, so a later Save Draft (which assigns billingConfigurationId
  // for the first time) doesn't re-fetch and clobber rows the user is mid-editing.
  const loadedModesRef = useRef(new Set());

  const getRoleStableKey = (row, idx) =>
    String(row?._uid || (row?.rateCardId ? `role-${row.rateCardId}` : `role-idx-${idx}`));

  const getRolePeriodStableKey = (row, roleIdx, period, periodIdx) =>
    `${getRoleStableKey(row, roleIdx)}:${getPeriodStableKey(period, periodIdx)}`;

  const toggleExpandRole = (roleKey) => {
    setExpandedRoleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(roleKey)) next.delete(roleKey);
      else next.add(roleKey);
      return next;
    });
  };

  const isAllRolesExpanded =
    rows.length > 0 &&
    rows.every((r, idx) => expandedRoleKeys.has(getRoleStableKey(r, idx)));

  const toggleExpandCollapseAllRoles = () => {
    if (isAllRolesExpanded) {
      setExpandedRoleKeys(new Set());
    } else {
      const allKeys = new Set(rows.map((r, idx) => getRoleStableKey(r, idx)));
      setExpandedRoleKeys(allKeys);
    }
  };

  const toggleExpandRolePeriod = (compositeKey) => {
    setExpandedRolePeriodKeys((prev) => {
      const next = new Set(prev);
      if (next.has(compositeKey)) next.delete(compositeKey);
      else next.add(compositeKey);
      return next;
    });
  };

  const getRolePeriodOverlapError = (period, idx, periods) => {
    if (!period.effectiveFrom || !period.effectiveTo) return null;
    for (let i = 0; i < periods.length; i++) {
      if (i === idx) continue;
      const other = periods[i];
      if (other.effectiveFrom && other.effectiveTo) {
        if (period.effectiveFrom <= other.effectiveTo && period.effectiveTo >= other.effectiveFrom) {
          return `Overlaps with "${other.periodName || `Period ${i + 1}`}" (${other.effectiveFrom} to ${other.effectiveTo}). Periods must not overlap.`;
        }
      }
    }
    return null;
  };

  const getRolePeriodValidationErrors = (period, idx, periods, roleRow) => {
    const errors = {
      periodName: "",
      discountValue: "",
      effectiveFrom: "",
      effectiveTo: "",
      overlap: "",
    };
    if (!period.periodName?.trim()) {
      errors.periodName = "Period name is required.";
    }
    const dv = Number(period.discountValue);
    if (period.discountValue === "" || period.discountValue === null || period.discountValue === undefined) {
      errors.discountValue = "Discount value is required.";
    } else if (Number.isNaN(dv) || dv <= 0) {
      errors.discountValue = "Discount value must be greater than 0.";
    } else if (period.discountType === "PERCENTAGE" && dv >= 100) {
      errors.discountValue = "Percentage discount must be less than 100%.";
    } else if ((period.discountType === "FIXED_AMOUNT" || period.discountType === "FIXED") && roleRow?.rate && dv >= Number(roleRow.rate)) {
      errors.discountValue = `Fixed discount must be less than base rate (${formatCurrency(roleRow.rate, currency)}).`;
    }

    if (!period.effectiveFrom) {
      errors.effectiveFrom = "Start date is required.";
    } else if (projectStartDateOnly && period.effectiveFrom < projectStartDateOnly) {
      errors.effectiveFrom = `Cannot precede project start date (${projectStartDateOnly}).`;
    } else if (roleRow?.effectiveFrom && period.effectiveFrom < roleRow.effectiveFrom) {
      errors.effectiveFrom = `Cannot precede role start date (${roleRow.effectiveFrom}).`;
    }

    if (!period.effectiveTo) {
      errors.effectiveTo = "End date is required.";
    } else if (period.effectiveFrom && period.effectiveTo < period.effectiveFrom) {
      errors.effectiveTo = "End date must be on or after start date.";
    } else if (projectEndDateOnly && period.effectiveTo > projectEndDateOnly) {
      errors.effectiveTo = `Cannot exceed project end date (${projectEndDateOnly}).`;
    } else if (roleRow?.effectiveTo && period.effectiveTo > roleRow.effectiveTo) {
      errors.effectiveTo = `Cannot exceed role end date (${roleRow.effectiveTo}).`;
    }

    errors.overlap = getRolePeriodOverlapError(period, idx, periods) || "";
    return errors;
  };

  const getRoleValidationErrors = (row, index, allRows) => {
    const roleName = String(row.roleName || row.role || "").trim();
    let nameError = "";
    if (!roleName) {
      nameError = "Role name is required.";
    } else {
      const isDuplicate = allRows.some(
        (other, otherIdx) =>
          otherIdx !== index &&
          String(other.roleName || other.role || "").trim().toLowerCase() === roleName.toLowerCase(),
      );
      if (isDuplicate) {
        nameError = "Role name must be unique.";
      }
    }

    let rateError = "";
    const numRate = Number(row.rate);
    if (row.rate === "" || row.rate === null || row.rate === undefined) {
      rateError = "Base rate is required.";
    } else if (Number.isNaN(numRate) || numRate <= 0) {
      rateError = "Rate must be greater than 0.";
    }

    const dateErrors = isOneTime
      ? { effectiveFrom: "", effectiveTo: "" }
      : getEffectiveDateErrors({
          effectiveFrom: row.effectiveFrom,
          effectiveTo: row.effectiveTo,
          projectStartDate: projectStartDateOnly,
          projectEndDate: projectEndDateOnly,
        });

    return {
      roleName: nameError,
      rate: rateError,
      ...dateErrors,
    };
  };

  const syncParent = (nextRows) => {
    setRows(nextRows);
    onChange({
      ...value,
      roles: nextRows.map(
        ({
          _uid,
          role,
          roleName,
          rate,
          ratePeriod,
          effectiveFrom,
          effectiveTo,
          rateCardId,
          remarks,
          notes,
          hasDiscount,
          discountType,
          discountValue,
          discountedRate,
          discountStartDate,
          discountEndDate,
          includeInInvoice,
          includeBaseRateInInvoice,
          discountPeriods,
        }) => {
          const baseInc = includeBaseRateInInvoice !== undefined
            ? includeBaseRateInInvoice !== false
            : includeInInvoice !== false;
          const periods = Array.isArray(discountPeriods) ? discountPeriods : [];
          return {
            _uid,
            role: roleName || role,
            roleName: roleName || role,
            rate,
            ratePeriod: ratePeriod || "HOURLY",
            effectiveFrom: effectiveFrom || "",
            effectiveTo: effectiveTo || "",
            rateCardId: rateCardId || null,
            remarks: remarks || notes || "",
            hasDiscount: Boolean(hasDiscount || periods.length > 0),
            discountType: discountType ? mapApiDiscountTypeToUi(discountType) : "PERCENTAGE",
            discountValue: discountValue ?? "",
            discountedRate: discountedRate ?? "",
            discountStartDate: discountStartDate || "",
            discountEndDate: discountEndDate || "",
            includeInInvoice: baseInc,
            includeBaseRateInInvoice: baseInc,
            discountPeriods: periods,
          };
        },
      ),
    });
  };

  const handleRoleChange = (index, field, val) => {
    const updated = [...rows];
    const current = updated[index];
    const patch = { [field]: val };
    if (field === "role") patch.roleName = val;
    if (field === "roleName") patch.role = val;
    if (field === "includeBaseRateInInvoice") {
      patch.includeInInvoice = val;
    }
    updated[index] = {
      ...current,
      ...patch,
    };
    syncParent(updated);
  };

  useEffect(() => {
    if (value?._validateTrigger) {
      const invalidRoles = new Set();
      const invalidRolePeriods = new Set();
      rows.forEach((r, rIdx) => {
        const rKey = getRoleStableKey(r, rIdx);
        const rErrors = getRoleValidationErrors(r, rIdx, rows);
        if (Object.values(rErrors).some(Boolean)) {
          invalidRoles.add(rKey);
        }
        const rPeriods = Array.isArray(r.discountPeriods) ? r.discountPeriods : [];
        rPeriods.forEach((p, pIdx) => {
          const pErrors = getRolePeriodValidationErrors(p, pIdx, rPeriods, r);
          if (Object.values(pErrors).some(Boolean)) {
            invalidRoles.add(rKey);
            invalidRolePeriods.add(getRolePeriodStableKey(r, rIdx, p, pIdx));
          }
        });
      });
      if (invalidRoles.size > 0) {
        setExpandedRoleKeys((prev) => new Set([...prev, ...invalidRoles]));
      }
      if (invalidRolePeriods.size > 0) {
        setExpandedRolePeriodKeys((prev) => new Set([...prev, ...invalidRolePeriods]));
      }
    }
  }, [value?._validateTrigger]);

  const addRole = () => {
    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const rErrors = getRoleValidationErrors(r, i, rows);
        const rErrorList = Object.values(rErrors).filter(Boolean);
        if (rErrorList.length > 0) {
          const roleKey = getRoleStableKey(r, i);
          setExpandedRoleKeys((prev) => new Set([...prev, roleKey]));
          showStatusToast(
            `Please complete "${r.roleName || r.role || `Role #${i + 1}`}" (${rErrorList[0]}) before adding another role.`,
            "warning",
          );
          return;
        }

        const periods = Array.isArray(r.discountPeriods) ? r.discountPeriods : [];
        for (let pi = 0; pi < periods.length; pi++) {
          const p = periods[pi];
          const pErrors = getRolePeriodValidationErrors(p, pi, periods, r);
          const pErrorList = Object.values(pErrors).filter(Boolean);
          if (pErrorList.length > 0) {
            const roleKey = getRoleStableKey(r, i);
            const periodKey = getRolePeriodStableKey(r, i, p, pi);
            setExpandedRoleKeys((prev) => new Set([...prev, roleKey]));
            setExpandedRolePeriodKeys((prev) => new Set([...prev, periodKey]));
            showStatusToast(
              `Please fix discount period "${p.periodName || `#${pi + 1}`}" for "${r.roleName || r.role || `Role #${i + 1}`}" (${pErrorList[0]}).`,
              "warning",
            );
            return;
          }
        }
      }
    }

    const uid = `role-new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newRole = {
      ...EMPTY_RATE_CARD,
      _uid: uid,
      role: "",
      roleName: "",
      rate: "",
      ratePeriod: "HOURLY",
      effectiveFrom: "",
      effectiveTo: "",
      remarks: "",
      includeBaseRateInInvoice: true,
      includeInInvoice: true,
      discountPeriods: [],
      hasDiscount: false,
    };
    const updated = [...rows, newRole];
    syncParent(updated);
    // Collapse other roles and expand the newly created role to reduce screen clutter
    setExpandedRoleKeys(new Set([uid]));
  };

  const removeRole = async (index) => {
    const target = rows[index];
    if (!target?.rateCardId) {
      syncParent(rows.filter((_, i) => i !== index));
      return;
    }

    try {
      const confirmed = window.confirm(
        "Remove this rate card? This cannot be undone.",
      );
      if (!confirmed) return;
      const deletingRows = [...rows];
      deletingRows[index] = { ...deletingRows[index], deleting: true };
      setRows(deletingRows);

      await deleteTmRateCard(target.rateCardId);
      showStatusToast("Rate card removed", "success");
      syncParent(rows.filter((_, i) => i !== index));
    } catch (error) {
      showStatusToast(
        getApiErrorMessage(error, "Unable to remove rate card"),
        "error",
      );
      setRows((prev) =>
        prev.map((r, i) => (i === index ? { ...r, deleting: false } : r)),
      );
    }
  };

  const addRoleDiscountPeriod = (roleIndex) => {
    const row = rows[roleIndex];
    if (!row) return;

    if (row.ratePeriod && row.ratePeriod !== "HOURLY") {
      showStatusToast("Commercial discount schedules are currently supported only for hourly rate cards.", "warning");
      return;
    }

    if (!row.rate || Number(row.rate) <= 0) {
      showStatusToast(
        `Please enter a valid base rate for "${row.roleName || row.role || `Role #${roleIndex + 1}`}" before adding discount periods.`,
        "warning",
      );
      return;
    }

    const existingPeriods = Array.isArray(row.discountPeriods) ? row.discountPeriods : [];
    if (existingPeriods.length > 0) {
      for (let i = 0; i < existingPeriods.length; i++) {
        const p = existingPeriods[i];
        const pErrors = getRolePeriodValidationErrors(p, i, existingPeriods, row);
        const errorList = Object.values(pErrors).filter(Boolean);
        if (errorList.length > 0) {
          const roleKey = getRoleStableKey(row, roleIndex);
          const pKey = getRolePeriodStableKey(row, roleIndex, p, i);
          setExpandedRoleKeys((prev) => new Set([...prev, roleKey]));
          setExpandedRolePeriodKeys((prev) => new Set([...prev, pKey]));
          showStatusToast(
            `Please complete "${p.periodName || `Period ${i + 1}`}" (${errorList[0]}) before adding another discount period.`,
            "warning",
          );
          return;
        }
      }
    }

    let defaultStart = "";
    let defaultEnd = "";
    if (existingPeriods.length === 0) {
      defaultStart = row.effectiveFrom || projectStartDateOnly || "";
      defaultEnd = row.effectiveTo || projectEndDateOnly || "";
    } else {
      const lastPeriod = existingPeriods[existingPeriods.length - 1];
      if (lastPeriod.effectiveTo) {
        const lastEndDate = new Date(lastPeriod.effectiveTo);
        if (!Number.isNaN(lastEndDate.getTime())) {
          const nextDay = new Date(lastEndDate);
          nextDay.setDate(nextDay.getDate() + 1);
          const nextDayStr = nextDay.toISOString().slice(0, 10);
          if (!projectEndDateOnly || nextDayStr <= projectEndDateOnly) {
            defaultStart = nextDayStr;
            defaultEnd = row.effectiveTo || projectEndDateOnly || nextDayStr;
          }
        }
      }
      if (!defaultStart) {
        defaultStart = row.effectiveFrom || projectStartDateOnly || "";
        defaultEnd = row.effectiveTo || projectEndDateOnly || "";
      }
    }

    const nextIdx = existingPeriods.length + 1;
    const uid = `period-new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newPeriod = {
      _uid: uid,
      periodName: `Period ${nextIdx}`,
      discountType: "PERCENTAGE",
      discountValue: "",
      effectiveFrom: defaultStart,
      effectiveTo: defaultEnd,
      notes: "",
      includeInInvoice: true,
      discountAmount: null,
      netRate: null,
    };
    const nextPeriods = [...existingPeriods, newPeriod];
    const updated = [...rows];
    updated[roleIndex] = {
      ...updated[roleIndex],
      discountPeriods: nextPeriods,
      hasDiscount: true,
    };
    syncParent(updated);
    const roleKey = getRoleStableKey(row, roleIndex);
    const pKey = `${roleKey}:${uid}`;
    setExpandedRolePeriodKeys((prev) => new Set([...prev, pKey]));
  };

  const updateRoleDiscountPeriod = (roleIndex, periodIndex, patch) => {
    const updated = [...rows];
    const row = updated[roleIndex];
    if (!row) return;
    const nextPeriods = (row.discountPeriods || []).map((p, i) =>
      i === periodIndex ? { ...p, ...patch } : p
    );
    updated[roleIndex] = {
      ...row,
      discountPeriods: nextPeriods,
      hasDiscount: nextPeriods.length > 0,
    };
    syncParent(updated);
  };

  const removeRoleDiscountPeriod = async (roleIndex, periodIndex) => {
    const row = rows[roleIndex];
    if (!row) return;
    const p = (row.discountPeriods || [])[periodIndex];
    const roleKey = getRoleStableKey(row, roleIndex);
    const pKey = getRolePeriodStableKey(row, roleIndex, p, periodIndex);

    if (p?.discountId) {
      const confirmed = window.confirm(
        `Remove discount period "${p.periodName || `Period ${periodIndex + 1}`}"? This cannot be undone.`
      );
      if (!confirmed) return;
      try {
        await deleteTmRateDiscount(p.discountId);
        showStatusToast("Discount period removed", "success");
      } catch (err) {
        showStatusToast(getApiErrorMessage(err, "Failed to remove discount period"), "error");
        return;
      }
    }

    setExpandedRolePeriodKeys((prev) => {
      const next = new Set(prev);
      next.delete(pKey);
      return next;
    });

    const nextPeriods = (row.discountPeriods || []).filter((_, i) => i !== periodIndex);
    const updated = [...rows];
    updated[roleIndex] = {
      ...row,
      discountPeriods: nextPeriods,
      hasDiscount: nextPeriods.length > 0,
    };
    syncParent(updated);
  };

  // A One-Time frequency has no schedule, so any previously entered effective
  // dates are stale the moment the frequency switches to it — clear them from
  // state (not just the hidden UI) so a stale date never reaches the payload.
  useEffect(() => {
    if (!isOneTime) return;
    if (standardRate.effectiveFrom || standardRate.effectiveTo) {
      update({ effectiveFrom: "", effectiveTo: "" });
    }
    if (rows.some((row) => row.effectiveFrom || row.effectiveTo)) {
      syncParent(rows.map((row) => ({ ...row, effectiveFrom: "", effectiveTo: "" })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOneTime]);

  // If the project duration shrinks, a previously valid Effective From/To can
  // fall outside the new range — clear it (not just show the inline error)
  // rather than let a now-invalid date sit in state or reach the payload.
  useEffect(() => {
    if (isOneTime) return;
    const isOutOfRange = (date) =>
      Boolean(
        date &&
          ((projectStartDateOnly && date < projectStartDateOnly) ||
            (projectEndDateOnly && date > projectEndDateOnly)),
      );

    if (isOutOfRange(standardRate.effectiveFrom) || isOutOfRange(standardRate.effectiveTo)) {
      update({
        effectiveFrom: isOutOfRange(standardRate.effectiveFrom) ? "" : standardRate.effectiveFrom,
        effectiveTo: isOutOfRange(standardRate.effectiveTo) ? "" : standardRate.effectiveTo,
      });
    }
    if (rows.some((row) => isOutOfRange(row.effectiveFrom) || isOutOfRange(row.effectiveTo))) {
      syncParent(
        rows.map((row) => ({
          ...row,
          effectiveFrom: isOutOfRange(row.effectiveFrom) ? "" : row.effectiveFrom,
          effectiveTo: isOutOfRange(row.effectiveTo) ? "" : row.effectiveTo,
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOneTime, projectStartDateOnly, projectEndDateOnly]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!["STANDARD", "ROLE_BASED"].includes(billingMode)) return;
      if (!billingConfigurationId) return;
      if (loadedModesRef.current.has(billingMode)) return;
      loadedModesRef.current.add(billingMode);

      setLoadingRows(true);
      try {
        const cards = await getTmRateCardsByBillingConfiguration(
          billingConfigurationId,
        );
        if (!mounted) return;
        const mapped = (cards || []).map((card) => mapRateCard(card));

        if (billingMode === "STANDARD") {
          const commonRate = mapped.find((card) => !card.role) || mapped[0];
          if (commonRate) {
            let discountPeriods = commonRate.discountPeriods || [];
            if ((!discountPeriods || discountPeriods.length === 0) && commonRate.rateCardId) {
              try {
                const discounts = await getTmRateDiscounts(commonRate.rateCardId);
                if (Array.isArray(discounts) && discounts.length > 0) {
                  discountPeriods = discounts.map(normalizeTmRateDiscount);
                }
              } catch (e) {
                console.warn("Failed to load rate discounts:", e);
              }
            }
            update({
              ...mapRateCard(commonRate, false),
              discountPeriods,
            });
          }
          return;
        }

        const roleRates = mapped.filter((card) => card.role);
        const roleRatesWithDiscounts = await Promise.all(
          roleRates.map(async (roleCard) => {
            let discountPeriods = roleCard.discountPeriods || [];
            if ((!discountPeriods || discountPeriods.length === 0) && roleCard.rateCardId) {
              try {
                const discounts = await getTmRateDiscounts(roleCard.rateCardId);
                if (Array.isArray(discounts) && discounts.length > 0) {
                  discountPeriods = discounts.map(normalizeTmRateDiscount);
                }
              } catch (e) {
                console.warn(`Failed to load rate discounts for role ${roleCard.role}:`, e);
              }
            }
            return {
              ...roleCard,
              discountPeriods,
              hasDiscount: discountPeriods.length > 0 || roleCard.hasDiscount,
              includeBaseRateInInvoice: roleCard.includeBaseRateInInvoice !== undefined
                ? roleCard.includeBaseRateInInvoice !== false
                : roleCard.includeInInvoice !== false,
            };
          })
        );
        setRows((currentRows) => {
          const unsaved = (currentRows || []).filter((r) => !r.rateCardId && (r.role || r.rate));
          const merged = [...roleRatesWithDiscounts, ...unsaved];
          const result = merged.length > 0 ? merged : currentRows;
          syncParent(result);
          return result;
        });
      } catch (error) {
        showStatusToast(
          getApiErrorMessage(error, "Unable to load rate cards."),
          "error",
        );
      } finally {
        if (mounted) setLoadingRows(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [billingMode, billingConfigurationId]);

  const buildTmRateCardPayload = (row, billingConfigurationId) => {
    const periods = Array.isArray(row.discountPeriods) ? row.discountPeriods : [];
    if (periods.length > 0 && row.ratePeriod && row.ratePeriod !== "HOURLY") {
      showStatusToast("Commercial discount schedules are only permitted for hourly rate cards. Remove discounts or change rate frequency to Hourly.", "error");
      const rKey = getRoleStableKey(row, index);
      setExpandedRoleKeys((prev) => new Set([...prev, rKey]));
      return;
    }
    if (periods.length > 0 && row.ratePeriod && row.ratePeriod !== "HOURLY") {
      showStatusToast("Commercial discount schedules are only permitted for hourly rate cards. Remove discounts or change rate frequency to Hourly.", "error");
      const rKey = getRoleStableKey(row, index);
      setExpandedRoleKeys((prev) => new Set([...prev, rKey]));
      return;
    }
    const hasDiscount = Boolean(
      periods.length > 0 ||
      row.hasDiscount ||
      (row.discountType && row.discountType !== "NONE" && Number(row.discountValue) > 0)
    );
    const firstPeriod = periods[0] || {};
    const discountType = hasDiscount
      ? mapApiDiscountTypeToUi(firstPeriod.discountType || row.discountType || "PERCENTAGE")
      : null;
    const discountValue = hasDiscount
      ? (firstPeriod.discountValue !== undefined && firstPeriod.discountValue !== null && firstPeriod.discountValue !== ""
          ? Number(firstPeriod.discountValue)
          : (row.discountValue !== "" && row.discountValue !== null && row.discountValue !== undefined ? Number(row.discountValue) : null))
      : null;
    const numRate = Number(row.rate);
    const discountedRate = hasDiscount && numRate > 0 && discountValue !== null
      ? calculateDiscountedRate(numRate, discountType, discountValue)
      : null;

    const includeBase = row.includeBaseRateInInvoice !== undefined
      ? row.includeBaseRateInInvoice !== false
      : row.includeInInvoice !== false;

    const payload = {
      rateCardId: row.rateCardId || null,
      billingConfigurationId,
      roleName:
        billingMode === "ROLE_BASED"
          ? String(row.roleName || row.role || "").trim()
          : null,
      rate: row.rate || "",
      ratePeriod: row.ratePeriod || "HOURLY",
      effectiveFrom: row.effectiveFrom || "",
      effectiveTo: row.effectiveTo || "",
      remarks: row.remarks || row.notes || "",
      hasDiscount,
      discountType,
      discountValue,
      discountedRate,
      discountStartDate: hasDiscount ? (firstPeriod.effectiveFrom || row.discountStartDate || "") : null,
      discountEndDate: hasDiscount ? (firstPeriod.effectiveTo || row.discountEndDate || "") : null,
      includeInInvoice: includeBase,
      includeBaseRateInInvoice: includeBase,
      discountPeriods: periods,
    };
    return payload;
  };

  const saveStandardRate = async () => {
    if (!currency || !isValidCurrency(currency)) {
      showStatusToast(
        "Missing or unsupported project billing currency. Please configure a valid currency.",
        "error",
      );
      return;
    }

    if (!standardRate.rate || Number(standardRate.rate) <= 0) {
      showStatusToast("Please enter a valid standard base rate greater than 0.", "error");
      return;
    }

    if (!isOneTime && hasEffectiveDateErrors(standardDateErrors)) {
      showStatusToast("Please fix the highlighted Effective From/To errors before saving.", "error");
      return;
    }

    const periods = standardRate.discountPeriods || [];
    const invalidPeriodKeys = new Set();
    periods.forEach((p, i) => {
      const pErrors = getPeriodValidationErrors(p, i, periods);
      if (Object.values(pErrors).some(Boolean)) {
        invalidPeriodKeys.add(getPeriodStableKey(p, i));
      }
    });
    if (invalidPeriodKeys.size > 0) {
      setExpandedPeriodKeys((prev) => new Set([...prev, ...invalidPeriodKeys]));
    }

    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      const pName = p.periodName?.trim();
      if (!pName) {
        showStatusToast(`Period name is required for period #${i + 1}.`, "error");
        return;
      }
      const dv = Number(p.discountValue);
      if (p.discountValue === "" || p.discountValue === null || Number.isNaN(dv) || dv <= 0) {
        showStatusToast(`Please enter a valid positive discount value for "${pName}".`, "error");
        return;
      }
      if (p.discountType === "PERCENTAGE" && dv >= 100) {
        showStatusToast(`Discount percentage must be less than 100% for "${pName}".`, "error");
        return;
      }
      if ((p.discountType === "FIXED_AMOUNT" || p.discountType === "FIXED") && dv >= Number(standardRate.rate)) {
        showStatusToast(`Fixed discount must be less than base rate for "${pName}".`, "error");
        return;
      }
      if (!p.effectiveFrom || !p.effectiveTo) {
        showStatusToast(`Start and End dates are required for "${pName}".`, "error");
        return;
      }
      if (p.effectiveFrom > p.effectiveTo) {
        showStatusToast(`Start date cannot be after end date for "${pName}".`, "error");
        return;
      }
      if (projectStartDateOnly && p.effectiveFrom < projectStartDateOnly) {
        showStatusToast(`Period "${pName}" start date cannot precede project start date (${projectStartDateOnly}).`, "error");
        return;
      }
      if (projectEndDateOnly && p.effectiveTo > projectEndDateOnly) {
        showStatusToast(`Period "${pName}" end date cannot exceed project end date (${projectEndDateOnly}).`, "error");
        return;
      }
      if (standardRate.effectiveFrom && p.effectiveFrom < standardRate.effectiveFrom) {
        showStatusToast(`Period "${pName}" start date cannot precede standard rate effective from date.`, "error");
        return;
      }
      if (standardRate.effectiveTo && p.effectiveTo > standardRate.effectiveTo) {
        showStatusToast(`Period "${pName}" end date cannot exceed standard rate effective to date.`, "error");
        return;
      }
    }

    for (let i = 0; i < periods.length; i++) {
      for (let j = i + 1; j < periods.length; j++) {
        const a = periods[i];
        const b = periods[j];
        if (a.effectiveFrom && a.effectiveTo && b.effectiveFrom && b.effectiveTo) {
          if (a.effectiveFrom <= b.effectiveTo && a.effectiveTo >= b.effectiveFrom) {
            showStatusToast(`Discount periods "${a.periodName || `#${i + 1}`}" and "${b.periodName || `#${j + 1}`}" overlap. Periods must not overlap.`, "error");
            return;
          }
        }
      }
    }

    update({ ...standardRate, saving: true });

    let resolvedConfigId = billingConfigurationId;
    try {
      if (!resolvedConfigId) {
        resolvedConfigId = await ensureBillingConfigurationId?.(
          billingConfigurationPayload,
        );
      }
      if (!resolvedConfigId) {
        showStatusToast(
          "Unable to save rate card: billing configuration id is missing.",
          "error",
        );
        update({ ...standardRate, saving: false });
        return;
      }

      const payload = buildTmRateCardPayload(standardRate, resolvedConfigId);
      let saved = null;
      if (standardRate.rateCardId) {
        saved = await updateTmRateCard(standardRate.rateCardId, payload);
      } else {
        saved = await createTmRateCard(resolvedConfigId, payload);
      }
      const targetRateCardId = saved?.rateCardId || saved?.id || standardRate.rateCardId;

      const mappedSaved = mapRateCard(saved || {}, false);
      const intermediateRate = {
        ...standardRate,
        ...mappedSaved,
        rateCardId: targetRateCardId,
        id: targetRateCardId,
        isSaved: Boolean(targetRateCardId),
        effectiveFrom: mappedSaved.effectiveFrom || standardRate.effectiveFrom,
        effectiveTo: mappedSaved.effectiveTo || standardRate.effectiveTo,
        remarks: mappedSaved.remarks || standardRate.remarks,
        includeBaseRateInInvoice: standardRate.includeBaseRateInInvoice !== undefined ? standardRate.includeBaseRateInInvoice !== false : standardRate.includeInInvoice !== false,
        includeInInvoice: standardRate.includeBaseRateInInvoice !== undefined ? standardRate.includeBaseRateInInvoice !== false : standardRate.includeInInvoice !== false,
      };

      let syncedPeriods = periods;
      if (targetRateCardId && periods.length > 0) {
        try {
          syncedPeriods = await syncStandardRateDiscounts(
            targetRateCardId,
            periods,
            currency,
            { roleName: "Standard Rate" },
          );
        } catch (syncErr) {
          const successfullySaved = syncErr.savedPeriods || [];
          const mergedPeriods = periods.map((p, pIdx) => {
            if (pIdx < successfullySaved.length) {
              return { ...p, ...successfullySaved[pIdx] };
            }
            return p;
          });
          update({
            ...intermediateRate,
            discountPeriods: mergedPeriods,
            saving: false,
            isSaved: false,
          });
          const errorDetail = getApiErrorMessage(syncErr.cause || syncErr, "Discount period save failed.");
          showStatusToast(
            `Standard Rate: Rate card saved, but discount period "${syncErr.periodName || 'item'}" failed (${errorDetail}). Please retry.`,
            "error",
          );
          return;
        }
      }

      update({
        ...intermediateRate,
        discountPeriods: syncedPeriods,
        saving: false,
        isSaved: true,
      });
      showStatusToast("Rate card and rate schedule saved", "success");
    } catch (error) {
      showStatusToast(
        getApiErrorMessage(error, "Unable to save rate card."),
        "error",
      );
      update({ ...standardRate, saving: false });
    }
  };

  const saveRow = async (index) => {
    const row = rows[index];
    if (!row) return;

    const roleName = String(row.roleName || row.role || "").trim();
    if (!roleName) {
      showStatusToast("Role name is required for role-based rate cards.", "error");
      const rKey = getRoleStableKey(row, index);
      setExpandedRoleKeys((prev) => new Set([...prev, rKey]));
      return;
    }
    const duplicateRole = rows.some(
      (item, itemIndex) =>
        itemIndex !== index &&
        String(item.roleName || item.role || "").trim().toLowerCase() === roleName.toLowerCase(),
    );
    if (duplicateRole) {
      showStatusToast("Role names must be unique for role-based rate cards.", "error");
      const rKey = getRoleStableKey(row, index);
      setExpandedRoleKeys((prev) => new Set([...prev, rKey]));
      return;
    }
    if (!row.rate || Number(row.rate) <= 0) {
      showStatusToast("Please enter a valid base rate greater than 0.", "error");
      const rKey = getRoleStableKey(row, index);
      setExpandedRoleKeys((prev) => new Set([...prev, rKey]));
      return;
    }
    if (
      !isOneTime &&
      hasEffectiveDateErrors(
        getEffectiveDateErrors({
          effectiveFrom: row.effectiveFrom,
          effectiveTo: row.effectiveTo,
          projectStartDate: projectStartDateOnly,
          projectEndDate: projectEndDateOnly,
        }),
      )
    ) {
      showStatusToast("Please fix the highlighted Effective From/To errors before saving.", "error");
      const rKey = getRoleStableKey(row, index);
      setExpandedRoleKeys((prev) => new Set([...prev, rKey]));
      return;
    }

    const periods = Array.isArray(row.discountPeriods) ? row.discountPeriods : [];
    const invalidPeriodKeys = new Set();
    periods.forEach((p, i) => {
      const pErrors = getRolePeriodValidationErrors(p, i, periods, row);
      if (Object.values(pErrors).some(Boolean)) {
        invalidPeriodKeys.add(getRolePeriodStableKey(row, index, p, i));
      }
    });
    if (invalidPeriodKeys.size > 0) {
      const rKey = getRoleStableKey(row, index);
      setExpandedRoleKeys((prev) => new Set([...prev, rKey]));
      setExpandedRolePeriodKeys((prev) => new Set([...prev, ...invalidPeriodKeys]));
    }

    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      const pName = p.periodName?.trim();
      if (!pName) {
        showStatusToast(`Period name is required for period #${i + 1}.`, "error");
        return;
      }
      const dv = Number(p.discountValue);
      if (p.discountValue === "" || p.discountValue === null || Number.isNaN(dv) || dv <= 0) {
        showStatusToast(`Please enter a valid positive discount value for "${pName}".`, "error");
        return;
      }
      if (p.discountType === "PERCENTAGE" && dv >= 100) {
        showStatusToast(`Discount percentage must be less than 100% for "${pName}".`, "error");
        return;
      }
      if ((p.discountType === "FIXED_AMOUNT" || p.discountType === "FIXED") && dv >= Number(row.rate)) {
        showStatusToast(`Fixed discount must be less than base rate for "${pName}".`, "error");
        return;
      }
      if (!p.effectiveFrom || !p.effectiveTo) {
        showStatusToast(`Start and End dates are required for "${pName}".`, "error");
        return;
      }
      if (p.effectiveFrom > p.effectiveTo) {
        showStatusToast(`Start date cannot be after end date for "${pName}".`, "error");
        return;
      }
      if (projectStartDateOnly && p.effectiveFrom < projectStartDateOnly) {
        showStatusToast(`Period "${pName}" start date cannot precede project start date (${projectStartDateOnly}).`, "error");
        return;
      }
      if (projectEndDateOnly && p.effectiveTo > projectEndDateOnly) {
        showStatusToast(`Period "${pName}" end date cannot exceed project end date (${projectEndDateOnly}).`, "error");
        return;
      }
      if (row.effectiveFrom && p.effectiveFrom < row.effectiveFrom) {
        showStatusToast(`Period "${pName}" start date cannot precede role effective from date (${row.effectiveFrom}).`, "error");
        return;
      }
      if (row.effectiveTo && p.effectiveTo > row.effectiveTo) {
        showStatusToast(`Period "${pName}" end date cannot exceed role effective to date (${row.effectiveTo}).`, "error");
        return;
      }
    }

    for (let i = 0; i < periods.length; i++) {
      for (let j = i + 1; j < periods.length; j++) {
        const a = periods[i];
        const b = periods[j];
        if (a.effectiveFrom && a.effectiveTo && b.effectiveFrom && b.effectiveTo) {
          if (a.effectiveFrom <= b.effectiveTo && a.effectiveTo >= b.effectiveFrom) {
            showStatusToast(`Discount periods "${a.periodName || `#${i + 1}`}" and "${b.periodName || `#${j + 1}`}" overlap. Periods must not overlap.`, "error");
            return;
          }
        }
      }
    }

    const updating = [...rows];
    updating[index] = { ...updating[index], saving: true };
    setRows(updating);

    try {
      // The draft is created before Role-Based pricing is chosen, so always re-push the
      // wizard selection; otherwise the backend rejects a role card against Standard pricing.
      let resolvedConfigId = billingConfigurationId;
      const syncedConfigId = await ensureBillingConfigurationId?.(
        billingConfigurationPayload,
      );
      if (syncedConfigId) resolvedConfigId = syncedConfigId;
      if (!resolvedConfigId) {
        showStatusToast(
          "Unable to save rate card: billing configuration id is missing.",
          "error",
        );
        setRows((prev) =>
          prev.map((r, i) => (i === index ? { ...r, saving: false } : r)),
        );
        return;
      }

      const payload = buildTmRateCardPayload(
        { ...row, roleName },
        resolvedConfigId,
      );
      let saved = null;
      if (row.rateCardId) {
        saved = await updateTmRateCard(row.rateCardId, payload);
      } else {
        saved = await createTmRateCard(resolvedConfigId, payload);
      }
      const targetRateCardId = saved?.rateCardId || saved?.id || row.rateCardId;

      const mappedSaved = mapRateCard(saved || {}, true);
      const intermediateRow = {
        ...row,
        ...mappedSaved,
        role: saved?.roleName || saved?.role || saved?.name || roleName,
        roleName,
        rate: saved?.rate !== undefined && saved?.rate !== null && saved?.rate !== "" ? saved.rate : row.rate,
        ratePeriod: saved?.ratePeriod || row.ratePeriod || "HOURLY",
        effectiveFrom: mappedSaved.effectiveFrom || row.effectiveFrom,
        effectiveTo: mappedSaved.effectiveTo || row.effectiveTo,
        remarks: mappedSaved.remarks || row.remarks,
        includeBaseRateInInvoice: row.includeBaseRateInInvoice !== undefined ? row.includeBaseRateInInvoice !== false : row.includeInInvoice !== false,
        includeInInvoice: row.includeBaseRateInInvoice !== undefined ? row.includeBaseRateInInvoice !== false : row.includeInInvoice !== false,
        rateCardId: targetRateCardId,
        id: targetRateCardId,
        isSaved: Boolean(targetRateCardId),
      };

      let syncedPeriods = periods;
      if (targetRateCardId && periods.length > 0) {
        try {
          syncedPeriods = await syncStandardRateDiscounts(
            targetRateCardId,
            periods,
            currency,
            { roleName },
          );
        } catch (syncErr) {
          const successfullySaved = syncErr.savedPeriods || [];
          const mergedPeriods = periods.map((p, pIdx) => {
            if (pIdx < successfullySaved.length) {
              return { ...p, ...successfullySaved[pIdx] };
            }
            return p;
          });

          const partialRow = {
            ...intermediateRow,
            discountPeriods: mergedPeriods,
            saving: false,
            isSaved: false,
          };
          const updatedRows = [...rows];
          updatedRows[index] = partialRow;
          setRows(updatedRows);
          syncParent(updatedRows);

          const errorDetail = getApiErrorMessage(syncErr.cause || syncErr, "Discount period save failed.");
          showStatusToast(
            `Role "${roleName}": Rate card saved, but discount period "${syncErr.periodName || 'item'}" failed (${errorDetail}). Please retry.`,
            "error",
          );
          return;
        }
      }

      const mapped = {
        ...intermediateRow,
        discountPeriods: syncedPeriods,
        saving: false,
        isSaved: true,
      };

      const newRows = [...rows];
      newRows[index] = mapped;
      setRows(newRows);
      syncParent(newRows);
      showStatusToast(`Role rate card and schedule saved for "${roleName}"`, "success");
    } catch (error) {
      showStatusToast(
        getApiErrorMessage(error, "Unable to save rate card."),
        "error",
      );
      setRows((prev) =>
        prev.map((r, i) => (i === index ? { ...r, saving: false } : r)),
      );
    }
  };

  const filteredRows = useMemo(() => {
    const list = rows.map((r, i) => ({ ...r, _originalIndex: i }));
    if (!roleSearchTerm.trim()) return list;
    const term = roleSearchTerm.trim().toLowerCase();
    return list.filter((r) =>
      String(r.roleName || r.role || "").toLowerCase().includes(term)
    );
  }, [rows, roleSearchTerm]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 p-4">
        {billingMode === "STANDARD" && (
          <div className="space-y-5">
            {!isCurrencyValid && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Missing or unsupported project billing currency ({currency || "Not Specified"}). Standard rate schedule requires a valid ISO 4217 currency code.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput
                label={`Rate (${currency}) *`}
                name="rate"
                type="number"
                value={standardRate.rate}
                onChange={(event) => update({ rate: event.target.value })}
                placeholder={`e.g. 1800 (${currency})`}
                disabled={isExisting}
              />
              <FormSelect
                anchorOptions
                label="Rate Period *"
                name="ratePeriod"
                value={standardRate.ratePeriod}
                onChange={(event) => update({ ratePeriod: event.target.value })}
                options={RATE_PERIOD_OPTIONS}
              />
              {!isOneTime && (
                <>
                  <FormDatePicker
                    label="Effective From"
                    name="effectiveFrom"
                    value={standardRate.effectiveFrom}
                    onChange={(event) =>
                      update({ effectiveFrom: event.target.value })
                    }
                    min={projectStartDateOnly || undefined}
                    max={projectEndDateOnly || undefined}
                    error={standardDateErrors.effectiveFrom}
                  />
                  <FormDatePicker
                    label="Effective To"
                    name="effectiveTo"
                    value={standardRate.effectiveTo}
                    onChange={(event) => update({ effectiveTo: event.target.value })}
                    min={standardRate.effectiveFrom || projectStartDateOnly || undefined}
                    max={projectEndDateOnly || undefined}
                    error={standardDateErrors.effectiveTo}
                  />
                </>
              )}
            </div>

            {/* Standard Rate Schedule Section */}
            <div className="space-y-4 pt-3 border-t border-slate-200">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Standard Rate Schedule</h4>
                  <p className="text-xs text-slate-500">
                    Configure repeatable discount periods, invoice inclusion, and live net rates for this standard rate card.
                  </p>
                </div>
                {!isExisting && (
                  <Button
                    type="button"
                    variant="outline"
                    size="small"
                    onClick={addDiscountPeriod}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Rate Period
                  </Button>
                )}
              </div>

              {(standardRate.discountPeriods || []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center space-y-2 bg-slate-50/50">
                  <p className="text-sm text-slate-600">No discount periods configured for this rate card.</p>
                  <p className="text-xs text-slate-400">
                    The standard base rate of <span className="font-semibold text-slate-700">{formatCurrency(standardRate.rate || 0, currency)} {getRatePeriodSuffix(standardRate.ratePeriod)}</span> will apply throughout the project.
                  </p>
                  {!isExisting && (
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="small"
                        onClick={addDiscountPeriod}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Rate Period
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {standardRate.discountPeriods.map((period, idx) => {
                    const key = getPeriodStableKey(period, idx);
                    const isExpanded = expandedPeriodKeys.has(key);
                    const periodErrors = getPeriodValidationErrors(
                      period,
                      idx,
                      standardRate.discountPeriods,
                    );
                    const errorList = Object.values(periodErrors).filter(Boolean);
                    const hasErrors = errorList.length > 0;
                    const preview = calculateRateDiscountPreview({
                      baseRate: standardRate.rate,
                      discountType: period.discountType,
                      discountValue: period.discountValue,
                      ratePeriod: standardRate.ratePeriod,
                    });

                    return (
                      <div
                        key={key}
                        data-testid={`discount-period-card-${idx}`}
                        className={`rounded-xl border transition-all ${
                          hasErrors
                            ? "border-red-300 bg-red-50/20"
                            : isExpanded
                            ? "border-indigo-200 bg-white shadow-sm"
                            : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {/* Collapsed Card Summary / Header Bar */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleExpandPeriod(key)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleExpandPeriod(key);
                            }
                          }}
                          className="flex flex-col gap-2 p-3 sm:p-4 cursor-pointer select-none transition-colors"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                                {idx + 1}
                              </span>
                              <h5 className="text-sm font-semibold text-slate-900">
                                {period.periodName || `Discount Period ${idx + 1}`}
                              </h5>

                              {/* Include in Invoice Status */}
                              {period.includeInInvoice !== false ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                  Included in Invoice
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                  Excluded from Invoice
                                </span>
                              )}

                              {/* Validation Status */}
                              {hasErrors && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                                  <AlertCircle className="h-3 w-3 text-red-600 shrink-0" />
                                  <span>{errorList[0]}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {!isExisting && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeDiscountPeriod(idx);
                                  }}
                                  className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                  title="Remove discount period"
                                  aria-label={`Remove ${period.periodName || `Period ${idx + 1}`}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandPeriod(key);
                                }}
                                className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                title={isExpanded ? "Collapse period" : "Expand period"}
                                aria-expanded={isExpanded}
                                aria-label={isExpanded ? `Collapse ${period.periodName || `Period ${idx + 1}`}` : `Expand ${period.periodName || `Period ${idx + 1}`}`}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Compact Summary details */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                            <div>
                              <span className="text-slate-400">Dates: </span>
                              <span className="font-medium text-slate-700">
                                {period.effectiveFrom && period.effectiveTo
                                  ? `${period.effectiveFrom} to ${period.effectiveTo}`
                                  : (period.effectiveFrom || period.effectiveTo || "Dates not configured")}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">Discount: </span>
                              <span className="font-semibold text-indigo-700">
                                {period.discountType === "PERCENTAGE"
                                  ? `${period.discountValue !== "" && period.discountValue !== null && period.discountValue !== undefined ? period.discountValue : 0}% (${period.discountType})`
                                  : `${formatCurrency(period.discountValue || 0, currency)} (${period.discountType})`}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">Net Rate: </span>
                              <span className="font-bold text-slate-900">
                                {preview.isValid && preview.netRate !== null
                                  ? `${formatCurrency(preview.netRate, currency)} ${getRatePeriodSuffix(standardRate.ratePeriod)}`
                                  : "—"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Card Content */}
                        {isExpanded && (
                          <div className="border-t border-slate-200/80 p-4 space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <FormInput
                                label="Period Name *"
                                name={`periodName-${idx}`}
                                value={period.periodName ?? ""}
                                onChange={(e) => updateDiscountPeriod(idx, { periodName: e.target.value })}
                                placeholder="e.g. Q1 Introductory Client Discount"
                                error={periodErrors.periodName}
                                disabled={isExisting}
                              />
                              <FormSelect
                                anchorOptions
                                label="Discount Type *"
                                name={`discountType-${idx}`}
                                value={period.discountType || "PERCENTAGE"}
                                onChange={(e) => updateDiscountPeriod(idx, { discountType: e.target.value })}
                                options={DISCOUNT_TYPE_OPTIONS}
                                disabled={isExisting}
                              />
                              <FormInput
                                label={
                                  period.discountType === "PERCENTAGE"
                                    ? "Discount Percentage (%) *"
                                    : `Discount Amount (${currency}) *`
                                }
                                name={`discountValue-${idx}`}
                                type="number"
                                value={period.discountValue !== undefined && period.discountValue !== null ? period.discountValue : ""}
                                onChange={(e) => updateDiscountPeriod(idx, { discountValue: e.target.value })}
                                placeholder={
                                  period.discountType === "PERCENTAGE"
                                    ? "e.g. 50"
                                    : `e.g. 200 (${currency})`
                                }
                                error={periodErrors.discountValue}
                                disabled={isExisting}
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <FormDatePicker
                                  label="Effective Start Date *"
                                  name={`effectiveFrom-${idx}`}
                                  value={period.effectiveFrom || ""}
                                  onChange={(e) => updateDiscountPeriod(idx, { effectiveFrom: e.target.value })}
                                  min={standardRate.effectiveFrom || projectStartDateOnly || undefined}
                                  max={standardRate.effectiveTo || projectEndDateOnly || undefined}
                                  error={periodErrors.effectiveFrom}
                                  disabled={isExisting}
                                />
                                <FormDatePicker
                                  label="Effective End Date *"
                                  name={`effectiveTo-${idx}`}
                                  value={period.effectiveTo || ""}
                                  onChange={(e) => updateDiscountPeriod(idx, { effectiveTo: e.target.value })}
                                  min={period.effectiveFrom || standardRate.effectiveFrom || projectStartDateOnly || undefined}
                                  max={standardRate.effectiveTo || projectEndDateOnly || undefined}
                                  error={periodErrors.effectiveTo}
                                  disabled={isExisting}
                                />
                              </div>
                            </div>

                            {periodErrors.overlap && (
                              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700">
                                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                                <span>{periodErrors.overlap}</span>
                              </div>
                            )}

                            {/* Live Net-Rate Preview for this period */}
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-indigo-50/70 p-3.5">
                              <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                                  Live Net-Rate Preview
                                </span>
                                {preview.isValid ? (
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
                                    <span>
                                      Base: <span className="line-through text-slate-500">{formatCurrency(preview.baseRate, currency)}</span>
                                    </span>
                                    <span>→</span>
                                    <span>
                                      Discount:{" "}
                                      <span className="font-semibold text-indigo-700">
                                        {period.discountType === "PERCENTAGE"
                                          ? `${period.discountValue}% (${formatCurrency(preview.discountAmount, currency)} off)`
                                          : `-${formatCurrency(preview.discountAmount, currency)} off`}
                                      </span>
                                    </span>
                                    <span>→</span>
                                    <span className="rounded bg-white px-2 py-0.5 text-base font-bold text-indigo-900 shadow-sm ring-1 ring-indigo-200">
                                      {formatCurrency(preview.netRate, currency)} {getRatePeriodSuffix(standardRate.ratePeriod)}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="mt-1 text-xs text-slate-500 italic">
                                    {preview.error || "Enter valid base rate and discount to calculate live net rate."}
                                  </div>
                                )}
                              </div>
                              {period.effectiveFrom && period.effectiveTo && (
                                <div className="text-right text-xs font-medium text-indigo-700">
                                  Schedule: {period.effectiveFrom} to {period.effectiveTo}
                                </div>
                              )}
                            </div>

                            {/* Commercial Agreement / Notes */}
                            <div>
                              <FormTextArea
                                label="Commercial Agreement / Discount Notes"
                                name={`notes-${idx}`}
                                value={period.notes || ""}
                                onChange={(e) => updateDiscountPeriod(idx, { notes: e.target.value })}
                                placeholder="e.g. Introductory client discount agreed per MSA schedule A..."
                                rows={2}
                                disabled={isExisting}
                              />
                            </div>

                            {/* Include in Invoice Checkbox */}
                            <div className="flex items-start gap-2.5 pt-1">
                              <input
                                id={`period-include-invoice-${idx}`}
                                type="checkbox"
                                checked={period.includeInInvoice !== false}
                                onChange={(e) => updateDiscountPeriod(idx, { includeInInvoice: e.target.checked })}
                                disabled={isExisting}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0A0082] focus:ring-[#0A0082]"
                              />
                              <label htmlFor={`period-include-invoice-${idx}`} className="cursor-pointer select-none">
                                <span className="text-xs font-semibold text-slate-900">Include in Invoice</span>
                                <span className="block text-[11px] text-slate-500">
                                  When enabled, billable work covered by this discount period is included in customer invoice generation at the discounted rate.
                                </span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Automatic Base-Rate Fallback Notice */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600 flex items-start gap-2">
                <div className="mt-1 h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                <span>
                  <strong className="text-slate-800">Automatic Base-Rate Fallback:</strong> Outside configured discount periods, billing falls back automatically to the standard base rate of{" "}
                  <strong className="text-slate-900">
                    {formatCurrency(standardRate.rate || 0, currency)} {getRatePeriodSuffix(standardRate.ratePeriod)}
                  </strong>.
                </span>
              </div>
            </div>

            {/* Overall Rate Card Invoice Inclusion */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <input
                id="standard-include-invoice"
                type="checkbox"
                checked={standardRate.includeInInvoice !== false}
                onChange={(e) => update({ includeInInvoice: e.target.checked, includeBaseRateInInvoice: e.target.checked })}
                disabled={isExisting}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0A0082] focus:ring-[#0A0082]"
              />
              <label htmlFor="standard-include-invoice" className="cursor-pointer select-none">
                <span className="text-sm font-semibold text-slate-900">Include Base Rate in Invoice</span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  When enabled, billable work outside active discount periods is included in customer invoice generation at the standard base rate.
                </span>
              </label>
            </div>

            {!isExisting && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="small"
                  onClick={saveStandardRate}
                  loading={Boolean(standardRate.saving)}
                  loadingText="Saving..."
                >
                  <Check className="h-4 w-4" /> Save Rate Card
                </Button>
              </div>
            )}
          </div>
        )}

        {billingMode === "ROLE_BASED" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Role-Based Rates
                </h4>
                <p className="text-xs text-slate-500">
                  Maintain independent base rates, repeatable discount schedules, and invoice inclusion for each role.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {rows.length > 0 && (
                  <div className="relative w-48 sm:w-60">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={roleSearchTerm}
                      onChange={(e) => setRoleSearchTerm(e.target.value)}
                      placeholder="Search roles..."
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleExpandCollapseAllRoles}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    title={isAllRolesExpanded ? "Collapse all role cards" : "Expand all role cards"}
                  >
                    {isAllRolesExpanded ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                        <span>Collapse All</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        <span>Expand All</span>
                      </>
                    )}
                  </button>
                )}
                {!isExisting && (
                  <Button variant="outline" size="small" onClick={addRole}>
                    <Plus className="h-3.5 w-3.5" /> Add Role
                  </Button>
                )}
              </div>
            </div>

            {loadingRows ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : null}

            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center space-y-2 bg-slate-50/50">
                <p className="text-sm text-slate-600">No roles configured for this billing setup.</p>
                <p className="text-xs text-slate-400">
                  Add roles to define specific base rates and independent discount schedules per role.
                </p>
                {!isExisting && (
                  <div className="pt-2">
                    <Button variant="outline" size="small" onClick={addRole}>
                      <Plus className="h-3.5 w-3.5" /> Add Role
                    </Button>
                  </div>
                )}
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                No roles matching "{roleSearchTerm}".
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRows.map((item) => {
                  const index = item._originalIndex;
                  const roleKey = getRoleStableKey(item, index);
                  const isExpanded = expandedRoleKeys.has(roleKey);
                  const roleErrors = getRoleValidationErrors(item, index, rows);
                  const roleErrorList = Object.values(roleErrors).filter(Boolean);
                  const hasRoleErrors = roleErrorList.length > 0;
                  const discountPeriods = Array.isArray(item.discountPeriods) ? item.discountPeriods : [];
                  const isBaseIncluded = item.includeBaseRateInInvoice !== undefined
                    ? item.includeBaseRateInInvoice !== false
                    : item.includeInInvoice !== false;

                  return (
                    <div
                      key={roleKey}
                      data-testid={`role-card-${index}`}
                      className={`rounded-xl border transition-all ${
                        hasRoleErrors
                          ? "border-red-300 bg-red-50/20"
                          : isExpanded
                          ? "border-indigo-200 bg-white shadow-sm"
                          : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {/* Collapsed Role Summary / Header Bar */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleExpandRole(roleKey)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleExpandRole(roleKey);
                          }
                        }}
                        className="flex flex-col gap-2 p-3 sm:p-4 cursor-pointer select-none transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                              {index + 1}
                            </span>
                            <h5 className="text-sm font-semibold text-slate-900">
                              {item.roleName || item.role || `Role #${index + 1}`}
                            </h5>

                            {/* Base Rate Badge */}
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">
                              {formatCurrency(item.rate || 0, currency)} {getRatePeriodSuffix(item.ratePeriod)}
                            </span>

                            {/* Discount Periods Count Badge */}
                            {discountPeriods.length > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
                                <Tag className="h-3 w-3" />
                                {discountPeriods.length} {discountPeriods.length === 1 ? "Discount Period" : "Discount Periods"}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No discounts</span>
                            )}

                            {/* Base Rate Inclusion Badge */}
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                isBaseIncluded
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                                  : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200"
                              }`}
                            >
                              Base: {isBaseIncluded ? "Included" : "Excluded"}
                            </span>

                            {/* Validation Errors Badge */}
                            {hasRoleErrors && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                                <AlertCircle className="h-3 w-3 text-red-600 shrink-0" />
                                <span>{roleErrorList[0]}</span>
                              </span>
                            )}
                          </div>

                          {/* Action Buttons & Expand/Collapse Chevron on Right */}
                          <div className="flex items-center gap-1 shrink-0">
                            {!isExisting && (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveRow(index);
                                  }}
                                  disabled={item.saving || item.deleting}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  title="Save role rate card"
                                >
                                  {item.saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeRole(index);
                                  }}
                                  disabled={item.saving || item.deleting}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  title="Remove role"
                                >
                                  {item.deleting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandRole(roleKey);
                              }}
                              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                              title={isExpanded ? "Collapse role" : "Expand role"}
                              aria-expanded={isExpanded}
                              aria-label={isExpanded ? `Collapse ${item.roleName || `Role ${index + 1}`}` : `Expand ${item.roleName || `Role ${index + 1}`}`}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Compact details line when collapsed */}
                        {!isExpanded && (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5 pl-8">
                            {!isOneTime && (item.effectiveFrom || item.effectiveTo) && (
                              <span>
                                <strong className="text-slate-600">Validity:</strong> {item.effectiveFrom || "Start"} to {item.effectiveTo || "End"}
                              </span>
                            )}
                            {item.remarks && (
                              <span className="truncate max-w-xs text-slate-400" title={item.remarks}>
                                <strong className="text-slate-600">Notes:</strong> {item.remarks}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Expanded Role Content */}
                      {isExpanded && (
                        <div className="border-t border-slate-200/80 p-4 space-y-6">
                          {/* Role Base Rate Configuration */}
                          <div className="space-y-4">
                            <h6 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                              Base Commercial Terms
                            </h6>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              <FormInput
                                label="Role Name *"
                                value={item.roleName || item.role || ""}
                                onChange={(e) => handleRoleChange(index, "roleName", e.target.value)}
                                placeholder="e.g. Senior Developer"
                                error={roleErrors.roleName}
                                disabled={isExisting}
                              />
                              <FormInput
                                label={`Base Rate (${currency}) *`}
                                type="number"
                                value={item.rate}
                                onChange={(e) => handleRoleChange(index, "rate", e.target.value)}
                                placeholder="e.g. 1500"
                                error={roleErrors.rate}
                                disabled={isExisting}
                              />
                              <FormSelect
                                label="Rate Period *"
                                value={item.ratePeriod || "HOURLY"}
                                onChange={(e) => handleRoleChange(index, "ratePeriod", e.target.value)}
                                options={RATE_PERIOD_OPTIONS}
                                anchorOptions
                                disabled={isExisting}
                              />
                              {!isOneTime && (
                                <>
                                  <FormDatePicker
                                    label="Effective From"
                                    value={item.effectiveFrom}
                                    onChange={(e) => handleRoleChange(index, "effectiveFrom", e.target.value)}
                                    min={projectStartDateOnly || undefined}
                                    max={projectEndDateOnly || undefined}
                                    error={roleErrors.effectiveFrom}
                                    disabled={isExisting}
                                  />
                                  <FormDatePicker
                                    label="Effective To"
                                    value={item.effectiveTo}
                                    onChange={(e) => handleRoleChange(index, "effectiveTo", e.target.value)}
                                    min={item.effectiveFrom || projectStartDateOnly || undefined}
                                    max={projectEndDateOnly || undefined}
                                    error={roleErrors.effectiveTo}
                                    disabled={isExisting}
                                  />
                                </>
                              )}
                              <div className={isOneTime ? "sm:col-span-2 lg:col-span-3" : "sm:col-span-2 lg:col-span-1"}>
                                <FormInput
                                  label="Commercial Remarks"
                                  value={item.remarks || ""}
                                  onChange={(e) => handleRoleChange(index, "remarks", e.target.value)}
                                  placeholder="Commercial notes for this role..."
                                  disabled={isExisting}
                                />
                              </div>
                            </div>

                            {/* Base-Rate Inclusion Checkbox */}
                            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                              <input
                                id={`role-include-base-${index}`}
                                type="checkbox"
                                checked={isBaseIncluded}
                                onChange={(e) =>
                                  handleRoleChange(index, "includeBaseRateInInvoice", e.target.checked)
                                }
                                disabled={isExisting}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0A0082] focus:ring-[#0A0082]"
                              />
                              <label htmlFor={`role-include-base-${index}`} className="cursor-pointer select-none">
                                <span className="text-xs font-semibold text-slate-900">
                                  Include Base Rate in Invoice
                                </span>
                                <span className="block text-[11px] text-slate-500">
                                  When enabled, billable work performed outside active discount periods is included in invoice generation at this role's base rate.
                                </span>
                              </label>
                            </div>
                          </div>

                          {/* Role Repeatable Discount Schedule */}
                          <div className="space-y-4 pt-4 border-t border-slate-200">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <h6 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                                  Discount Schedule for {item.roleName || item.role || `Role #${index + 1}`}
                                </h6>
                                <p className="text-xs text-slate-500">
                                  Configure repeatable discount periods with independent invoice inclusion and live net rates.
                                </p>
                              </div>
                              {!isExisting && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="small"
                                  onClick={() => addRoleDiscountPeriod(index)}
                                >
                                  <Plus className="h-3.5 w-3.5" /> Add Rate Period
                                </Button>
                              )}
                            </div>

                            {discountPeriods.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center space-y-2 bg-slate-50/50">
                                <p className="text-sm text-slate-600">No discount periods configured for this role.</p>
                                <p className="text-xs text-slate-400">
                                  The base rate of <span className="font-semibold text-slate-700">{formatCurrency(item.rate || 0, currency)} {getRatePeriodSuffix(item.ratePeriod)}</span> will apply throughout the project.
                                </p>
                                {!isExisting && (
                                  <div className="pt-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="small"
                                      onClick={() => addRoleDiscountPeriod(index)}
                                    >
                                      <Plus className="h-3.5 w-3.5" /> Add Rate Period
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {discountPeriods.map((period, pIdx) => {
                                  const pKey = getRolePeriodStableKey(item, index, period, pIdx);
                                  const isPeriodExpanded = expandedRolePeriodKeys.has(pKey);
                                  const periodErrors = getRolePeriodValidationErrors(
                                    period,
                                    pIdx,
                                    discountPeriods,
                                    item,
                                  );
                                  const pErrorList = Object.values(periodErrors).filter(Boolean);
                                  const hasErrors = pErrorList.length > 0;
                                  const preview = calculateRateDiscountPreview({
                                    baseRate: item.rate,
                                    discountType: period.discountType,
                                    discountValue: period.discountValue,
                                    ratePeriod: item.ratePeriod,
                                  });

                                  return (
                                    <div
                                      key={pKey}
                                      data-testid={`role-discount-period-${index}-${pIdx}`}
                                      className={`rounded-xl border transition-all ${
                                        hasErrors
                                          ? "border-red-300 bg-red-50/20"
                                          : isPeriodExpanded
                                          ? "border-indigo-200 bg-white shadow-sm"
                                          : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50"
                                      }`}
                                    >
                                      {/* Collapsible Period Header */}
                                      <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => toggleExpandRolePeriod(pKey)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            toggleExpandRolePeriod(pKey);
                                          }
                                        }}
                                        className="flex flex-col gap-2 p-3 sm:p-4 cursor-pointer select-none transition-colors"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                                              {pIdx + 1}
                                            </span>
                                            <h6 className="text-sm font-semibold text-slate-900">
                                              {period.periodName || `Discount Period ${pIdx + 1}`}
                                            </h6>

                                            {/* Include in Invoice Status */}
                                            {period.includeInInvoice !== false ? (
                                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                                Included in Invoice
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                                Excluded from Invoice
                                              </span>
                                            )}

                                            {/* Validation Status */}
                                            {hasErrors && (
                                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                                                <AlertCircle className="h-3 w-3 text-red-600 shrink-0" />
                                                <span>{pErrorList[0]}</span>
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-1.5 shrink-0">
                                            {!isExisting && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  removeRoleDiscountPeriod(index, pIdx);
                                                }}
                                                className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                                title="Remove discount period"
                                                aria-label={`Remove ${period.periodName || `Period ${pIdx + 1}`}`}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </button>
                                            )}
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleExpandRolePeriod(pKey);
                                              }}
                                              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                              title={isPeriodExpanded ? "Collapse period" : "Expand period"}
                                              aria-expanded={isPeriodExpanded}
                                            >
                                              {isPeriodExpanded ? (
                                                <ChevronUp className="h-4 w-4" />
                                              ) : (
                                                <ChevronDown className="h-4 w-4" />
                                              )}
                                            </button>
                                          </div>
                                        </div>

                                        {/* Compact Summary details */}
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                                          <div>
                                            <span className="text-slate-400">Dates: </span>
                                            <span className="font-medium text-slate-700">
                                              {period.effectiveFrom && period.effectiveTo
                                                ? `${period.effectiveFrom} to ${period.effectiveTo}`
                                                : (period.effectiveFrom || period.effectiveTo || "Dates not configured")}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-slate-400">Discount: </span>
                                            <span className="font-semibold text-indigo-700">
                                              {period.discountType === "PERCENTAGE"
                                                ? `${period.discountValue !== "" && period.discountValue !== null && period.discountValue !== undefined ? period.discountValue : 0}% (${period.discountType})`
                                                : `${formatCurrency(period.discountValue || 0, currency)} (${period.discountType})`}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-slate-400">Net Rate: </span>
                                            <span className="font-bold text-slate-900">
                                              {preview.isValid && preview.netRate !== null
                                                ? `${formatCurrency(preview.netRate, currency)} ${getRatePeriodSuffix(item.ratePeriod)}`
                                                : "—"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Expanded Card Content */}
                                      {isPeriodExpanded && (
                                        <div className="border-t border-slate-200/80 p-4 space-y-4">
                                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <FormInput
                                              label="Period Name *"
                                              value={period.periodName ?? ""}
                                              onChange={(e) => updateRoleDiscountPeriod(index, pIdx, { periodName: e.target.value })}
                                              placeholder="e.g. Q1 Introductory Rate"
                                              error={periodErrors.periodName}
                                              disabled={isExisting}
                                            />
                                            <FormSelect
                                              anchorOptions
                                              label="Discount Type *"
                                              value={period.discountType || "PERCENTAGE"}
                                              onChange={(e) => updateRoleDiscountPeriod(index, pIdx, { discountType: e.target.value })}
                                              options={DISCOUNT_TYPE_OPTIONS}
                                              disabled={isExisting}
                                            />
                                            <FormInput
                                              label={
                                                period.discountType === "PERCENTAGE"
                                                  ? "Discount Percentage (%) *"
                                                  : `Discount Amount (${currency}) *`
                                              }
                                              type="number"
                                              value={period.discountValue !== undefined && period.discountValue !== null ? period.discountValue : ""}
                                              onChange={(e) => updateRoleDiscountPeriod(index, pIdx, { discountValue: e.target.value })}
                                              placeholder={
                                                period.discountType === "PERCENTAGE"
                                                  ? "e.g. 20"
                                                  : `e.g. 100 (${currency})`
                                              }
                                              error={periodErrors.discountValue}
                                              disabled={isExisting}
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                              <FormDatePicker
                                                label="Effective Start Date *"
                                                value={period.effectiveFrom || ""}
                                                onChange={(e) => updateRoleDiscountPeriod(index, pIdx, { effectiveFrom: e.target.value })}
                                                min={item.effectiveFrom || projectStartDateOnly || undefined}
                                                max={item.effectiveTo || projectEndDateOnly || undefined}
                                                error={periodErrors.effectiveFrom}
                                                disabled={isExisting}
                                              />
                                              <FormDatePicker
                                                label="Effective End Date *"
                                                value={period.effectiveTo || ""}
                                                onChange={(e) => updateRoleDiscountPeriod(index, pIdx, { effectiveTo: e.target.value })}
                                                min={period.effectiveFrom || item.effectiveFrom || projectStartDateOnly || undefined}
                                                max={item.effectiveTo || projectEndDateOnly || undefined}
                                                error={periodErrors.effectiveTo}
                                                disabled={isExisting}
                                              />
                                            </div>
                                          </div>

                                          {periodErrors.overlap && (
                                            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700">
                                              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                                              <span>{periodErrors.overlap}</span>
                                            </div>
                                          )}

                                          {/* Live Net-Rate Preview for this period */}
                                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-indigo-50/70 p-3.5">
                                            <div>
                                              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                                                Live Net-Rate Preview
                                              </span>
                                              {preview.isValid ? (
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
                                                  <span>
                                                    Base: <span className="line-through text-slate-500">{formatCurrency(preview.baseRate, currency)}</span>
                                                  </span>
                                                  <span>→</span>
                                                  <span>
                                                    Discount:{" "}
                                                    <span className="font-semibold text-indigo-700">
                                                      {period.discountType === "PERCENTAGE"
                                                        ? `${period.discountValue}% (${formatCurrency(preview.discountAmount, currency)} off)`
                                                        : `-${formatCurrency(preview.discountAmount, currency)} off`}
                                                    </span>
                                                  </span>
                                                  <span>→</span>
                                                  <span className="rounded bg-white px-2 py-0.5 text-base font-bold text-indigo-900 shadow-sm ring-1 ring-indigo-200">
                                                    {formatCurrency(preview.netRate, currency)} {getRatePeriodSuffix(item.ratePeriod)}
                                                  </span>
                                                </div>
                                              ) : (
                                                <div className="mt-1 text-xs text-slate-500 italic">
                                                  {preview.error || "Enter valid base rate and discount to calculate live net rate."}
                                                </div>
                                              )}
                                            </div>
                                            {period.effectiveFrom && period.effectiveTo && (
                                              <div className="text-right text-xs font-medium text-indigo-700">
                                                Schedule: {period.effectiveFrom} to {period.effectiveTo}
                                              </div>
                                            )}
                                          </div>

                                          {/* Commercial Notes */}
                                          <div>
                                            <FormTextArea
                                              label="Commercial Agreement / Discount Notes"
                                              value={period.notes || ""}
                                              onChange={(e) => updateRoleDiscountPeriod(index, pIdx, { notes: e.target.value })}
                                              placeholder="e.g. Agreed discount per project proposal..."
                                              rows={2}
                                              disabled={isExisting}
                                            />
                                          </div>

                                          {/* Include in Invoice Checkbox */}
                                          <div className="flex items-start gap-2.5 pt-1">
                                            <input
                                              id={`role-period-include-invoice-${index}-${pIdx}`}
                                              type="checkbox"
                                              checked={period.includeInInvoice !== false}
                                              onChange={(e) => updateRoleDiscountPeriod(index, pIdx, { includeInInvoice: e.target.checked })}
                                              disabled={isExisting}
                                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0A0082] focus:ring-[#0A0082]"
                                            />
                                            <label htmlFor={`role-period-include-invoice-${index}-${pIdx}`} className="cursor-pointer select-none">
                                              <span className="text-xs font-semibold text-slate-900">Include in Invoice</span>
                                              <span className="block text-[11px] text-slate-500">
                                                When enabled, billable work covered by this discount period is included in customer invoice generation at the discounted rate.
                                              </span>
                                            </label>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Automatic Base-Rate Fallback Notice */}
                            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600 flex items-start gap-2">
                              <div className="mt-1 h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                              <span>
                                <strong className="text-slate-800">Automatic Base-Rate Fallback:</strong> Outside configured discount periods, billing falls back automatically to this role's base rate of{" "}
                                <strong className="text-slate-900">
                                  {formatCurrency(item.rate || 0, currency)} {getRatePeriodSuffix(item.ratePeriod)}
                                </strong>.
                              </span>
                            </div>
                          </div>

                          {/* Save Role Card Button & Collapse Action */}
                          {!isExisting && (
                            <div className="pt-2 flex items-center justify-between border-t border-slate-100 mt-2">
                              <button
                                type="button"
                                onClick={() => toggleExpandRole(roleKey)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                              >
                                <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                                <span>Collapse Role Card</span>
                              </button>
                              <Button
                                variant="outline"
                                size="small"
                                onClick={() => saveRow(index)}
                                loading={Boolean(item.saving)}
                                loadingText="Saving role..."
                              >
                                <Check className="h-4 w-4" /> Save Role & Schedule
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ContractValueSourceBadge({ source }) {
  if (source === "MANUAL") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
        Manually adjusted
      </span>
    );
  }
  if (source === "PMS") {
    return (
      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
        Imported from PMS Project Budget
      </span>
    );
  }
  return null;
}

function EnterpriseBudgetSourceSelector({
  value,
  onChange,
  projectBudget,
  currency,
  sourceLabel = "Contract Value Source:",
  manualLabel = "Manual Input",
}) {
  const isPms = value === "PMS" || value === "PMS_BUDGET";

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3.5 py-2">
      <span className="text-xs font-semibold text-slate-700">{sourceLabel}</span>
      <div className="flex items-center gap-1 rounded-lg bg-slate-200/60 p-0.5">
        <button
          type="button"
          onClick={() => onChange("PMS")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
            isPms
              ? "bg-white text-[#0A0082] shadow-sm font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Landmark className="h-3.5 w-3.5" />
          <span>Project Budget {projectBudget ? `(${formatCurrency(projectBudget, currency)})` : ""}</span>
        </button>

        <button
          type="button"
          onClick={() => onChange("MANUAL")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
            !isPms
              ? "bg-white text-[#0A0082] shadow-sm font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
          <span>{manualLabel}</span>
        </button>
      </div>
    </div>
  );
}

// Shows the raw editable number while focused (so typing isn't disrupted by
// commas being inserted under the cursor) and the Indian-grouped, 2-decimal
// display once the field blurs. The underlying value passed to onChange is
// always the plain numeric string — only the on-screen text is formatted.
function IndianAmountInput({ value, onChange, ...rest }) {
  const [isFocused, setIsFocused] = useState(false);
  const raw = value ?? "";
  const displayValue = isFocused ? raw : formatIndianNumber(raw) || raw;

  return (
    <FormInput
      {...rest}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onFocus={(event) => {
        setIsFocused(true);
        rest.onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);
        rest.onBlur?.(event);
      }}
      onChange={(event) => {
        const cleaned = event.target.value.replace(/[^0-9.]/g, "");
        const dotIndex = cleaned.indexOf(".");
        const sanitized =
          dotIndex === -1
            ? cleaned
            : cleaned.slice(0, dotIndex + 1) + cleaned.slice(dotIndex + 1).replace(/\./g, "");
        onChange(sanitized);
      }}
    />
  );
}

// Fixed Price billing must be driven by the actual client-agreed commercial value,
// which can legitimately differ from the PMS Project Budget in either direction —
// so Contract Value only seeds from the budget once and is freely editable after.
function FixedPriceForm({
  value = {},
  onChange,
  currency,
  projectBudget,
  billingFrequency,
  billingFrequencyId,
  billingFrequencyLabel,
  billingFrequencyOption,
  billingConfigurationId,
  ensureBillingConfigurationId,
  projectStartDate,
  projectEndDate,
}) {
  const update = (patch) => onChange({ ...value, ...patch });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [schedulePreview, setSchedulePreview] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const fetchedRef = useRef(false);
  const isOneTime = isOneTimeFrequency(billingFrequency);

  // Fetches backend-calculated schedule preview for Fixed Price via
  // POST /api/billing-configurations/preview-schedule.
  const loadSchedulePreview = async (overrideValues) => {
    const current = overrideValues || value;
    const freqId =
      billingFrequencyId ||
      billingFrequencyOption?.billingFrequencyId ||
      billingFrequencyOption?.id;
    const rawContractValue = current.totalContractValue ?? current.contractValue;
    const contractValueNum = Number(rawContractValue);
    const effFrom =
      toDateOnly(current.effectiveFrom) || (isOneTime ? toDateOnly(projectStartDate) : "") || "";
    const effTo =
      toDateOnly(current.effectiveTo) || (isOneTime ? toDateOnly(projectEndDate) : "") || "";

    if (!freqId || !contractValueNum || (!isOneTime && (!effFrom || !effTo))) {
      return;
    }

    setLoadingSchedule(true);
    setScheduleError("");
    try {
      const periods = await previewBillingSchedule({
        billingType: "FIXED_PRICE",
        billingFrequencyId: freqId,
        effectiveFrom: effFrom,
        effectiveTo: effTo,
        contractValue: contractValueNum,
      });
      setSchedulePreview(periods);
    } catch (error) {
      const errorMsg = getApiErrorMessage(error, "Unable to generate billing schedule preview.");
      setScheduleError(errorMsg);
      setSchedulePreview([]);
    } finally {
      setLoadingSchedule(false);
    }
  };

  // [6] billingConfigurationId received by FixedPriceForm.
  useEffect(() => {
    console.log("[FixedPriceForm] billingConfigurationId prop:", billingConfigurationId);
  }, [billingConfigurationId]);

  useEffect(() => {
    if (value.totalContractValue || value.contractValueSource) return;
    if (projectBudget === "" || projectBudget === null || projectBudget === undefined) return;
    update({ totalContractValue: projectBudget, contractValueSource: "PMS" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectBudget]);

  // A One-Time frequency is a single lump sum with no schedule — any previously
  // entered effective dates are stale the moment the frequency switches to it,
  // so clear them from state (not just the hidden UI) rather than leaving a
  // stale date that could still reach the payload.
  useEffect(() => {
    if (!isOneTime) return;
    if (value.effectiveFrom || value.effectiveTo) {
      update({ effectiveFrom: "", effectiveTo: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOneTime]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!billingConfigurationId) return;
      if (fetchedRef.current) return;
      fetchedRef.current = true;

      setLoadingConfig(true);
      try {
        const record = await getFixedPriceByBillingConfiguration(billingConfigurationId);
        if (!mounted || !record) return;
        const loadedRecord = {
          fixedPriceConfigurationId: record.fixedPriceConfigurationId || record.id || null,
          totalContractValue:
            record.totalContractValue ?? record.contractValue ?? value.totalContractValue ?? "",
          contractValueSource: value.contractValueSource || "MANUAL",
          pmsProjectBudget: record.pmsProjectBudget ?? "",
          // retentionPercentage is the canonical backend field name — check it first.
          retentionPercent: record.retentionPercentage ?? record.retentionPercent ?? "",
          advanceReceived: record.advanceReceived ?? "",
          effectiveFrom: record.effectiveFrom || "",
          effectiveTo: record.effectiveTo || "",
          remarks: record.remarks || "",
          retentionAmount: record.retentionAmount ?? "",
          billableAmount: record.billableAmount ?? "",
          // remainingReceivable is the canonical backend field name — check it first.
          remainingAmount: record.remainingReceivable ?? record.remainingAmount ?? "",
        };
        update(loadedRecord);
        if (loadedRecord.totalContractValue) {
          loadSchedulePreview(loadedRecord);
        }
      } catch (error) {
        showStatusToast(
          getApiErrorMessage(error, "Unable to load fixed price configuration."),
          "error",
        );
      } finally {
        if (mounted) setLoadingConfig(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingConfigurationId]);

  const contractValueSource =
    value.contractValueSource || (value.totalContractValue === projectBudget ? "PMS" : "MANUAL");
  const isPmsSource = contractValueSource === "PMS";
  const contractValue = Number(value.totalContractValue) || 0;
  const retentionPercentNum = Number(value.retentionPercent);
  const hasRetention =
    value.retentionPercent !== "" &&
    value.retentionPercent !== null &&
    value.retentionPercent !== undefined &&
    !Number.isNaN(retentionPercentNum) &&
    retentionPercentNum > 0;
  const retentionAmount = hasRetention ? contractValue * (retentionPercentNum / 100) : 0;
  const billableAmount = contractValue - retentionAmount;

  const advanceReceivedNum = Number(value.advanceReceived);
  const hasAdvance =
    value.advanceReceived !== "" &&
    value.advanceReceived !== null &&
    value.advanceReceived !== undefined &&
    !Number.isNaN(advanceReceivedNum) &&
    advanceReceivedNum > 0;
  const remainingReceivable = billableAmount - (hasAdvance ? advanceReceivedNum : 0);

  const retentionError =
    value.retentionPercent !== "" && value.retentionPercent !== null && value.retentionPercent !== undefined
      ? Number.isNaN(retentionPercentNum) || retentionPercentNum < 0 || retentionPercentNum > 100
        ? "Retention must be between 0% and 100%."
        : ""
      : "";
  const advanceError =
    value.advanceReceived !== "" && value.advanceReceived !== null && value.advanceReceived !== undefined
      ? Number.isNaN(advanceReceivedNum) || advanceReceivedNum < 0
        ? "Advance Received cannot be negative."
        : advanceReceivedNum > billableAmount
        ? "Advance Received cannot exceed the Billable Amount."
        : ""
      : "";

  const dateErrors = isOneTime
    ? { effectiveFrom: "", effectiveTo: "" }
    : getEffectiveDateErrors({
        effectiveFrom: value.effectiveFrom,
        effectiveTo: value.effectiveTo,
        projectStartDate,
        projectEndDate,
      });

  // The backend requires a different field depending on contractValueSource: PMS
  // Budget sends the project budget as pmsProjectBudget (from the Billing
  // Configuration state, never blank/null) AND still needs contractValue populated
  // with that same budget — the backend's retention/billable/remaining calculations
  // read contractValue regardless of source, so it can never be left null there.
  // Manual sends only the user-entered amount as contractValue (not
  // "totalContractValue" — that's only the wizard's internal form field name).
  const buildFixedPricePayload = () => {
    const apiContractValueSource = toApiContractValueSource(value.contractValueSource);
    const sharedFields = {
      contractValueSource: apiContractValueSource,
      // Backend field is "retentionPercentage" (RetentionPercentDto) — "retentionPercent"
      // is only the internal form/state field name, kept as-is to avoid churning every
      // read/validation/calc site below that already references value.retentionPercent.
      retentionPercentage:
        value.retentionPercent === "" || value.retentionPercent === null || value.retentionPercent === undefined
          ? null
          : Number(value.retentionPercent),
      advanceReceived:
        value.advanceReceived === "" || value.advanceReceived === null || value.advanceReceived === undefined
          ? null
          : Number(value.advanceReceived),
      // One-Time is a single lump sum with no schedule — never send a stale
      // effective date range for it, even if one was entered under a previous
      // (recurring) frequency selection.
      effectiveFrom: isOneTime ? "" : value.effectiveFrom || "",
      effectiveTo: isOneTime ? "" : value.effectiveTo || "",
      remarks: value.remarks || "",
    };

    if (apiContractValueSource === "PMS_BUDGET") {
      const pmsProjectBudget = Number(projectBudget);
      return { ...sharedFields, pmsProjectBudget, contractValue: pmsProjectBudget };
    }

    return { ...sharedFields, contractValue: Number(value.totalContractValue) };
  };

  const saveFixedPriceConfig = async () => {
    if (!value.totalContractValue) {
      showStatusToast("Contract Value is required before saving.", "error");
      return;
    }
    if (retentionError || advanceError || (!isOneTime && hasEffectiveDateErrors(dateErrors))) {
      showStatusToast("Please fix the highlighted errors before saving.", "error");
      return;
    }

    const apiContractValueSource = toApiContractValueSource(value.contractValueSource);
    const pmsProjectBudgetIsBlank =
      projectBudget === "" || projectBudget === null || projectBudget === undefined || Number.isNaN(Number(projectBudget));
    if (apiContractValueSource === "PMS_BUDGET" && pmsProjectBudgetIsBlank) {
      showStatusToast("Project budget is required before saving a PMS Budget contract value.", "error");
      return;
    }

    if (!billingConfigurationId) {
      showStatusToast(
        "Unable to save fixed price configuration: billing configuration id is missing. Please reload and try again.",
        "error",
      );
      return;
    }

    setSaving(true);
    try {
      // The parent billing configuration's draft may have been created before
      // Billing Frequency was selected (it's auto-created as soon as Billing
      // Type is known), so it can still be missing billingFrequencyId here.
      // Re-sync the parent with the current selection first — the Fixed
      // Price API requires billingFrequencyId to already be set on it.
      let resolvedConfigId = billingConfigurationId;
      if (ensureBillingConfigurationId) {
        const syncedId = await ensureBillingConfigurationId();
        if (syncedId) resolvedConfigId = syncedId;
      }

      const payload = buildFixedPricePayload();
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log("[FixedPriceForm] Fixed Price API payload:", payload);
      }

      // value.fixedPriceConfigurationId can still be unset here if the wizard's own
      // load effect (above) hasn't resolved yet — re-check the backend directly so a
      // record that already exists is updated, never re-created as a duplicate.
      let existingId = value.fixedPriceConfigurationId;
      if (!existingId && resolvedConfigId) {
        const existingRecord = await getFixedPriceByBillingConfiguration(resolvedConfigId);
        existingId = existingRecord?.fixedPriceConfigurationId || existingRecord?.id || null;
      }

      const saved = existingId
        ? await updateFixedPriceConfiguration(existingId, payload)
        : await createFixedPriceConfiguration(resolvedConfigId, payload);

      update({
        fixedPriceConfigurationId:
          saved?.fixedPriceConfigurationId || saved?.id || value.fixedPriceConfigurationId || null,
        // Reconcile with the backend's canonical retentionPercentage so the field
        // reflects exactly what was persisted (falls back to what was just typed
        // if the response happens not to echo it back).
        retentionPercent: saved?.retentionPercentage ?? saved?.retentionPercent ?? value.retentionPercent ?? "",
        retentionAmount: saved?.retentionAmount ?? value.retentionAmount ?? "",
        billableAmount: saved?.billableAmount ?? value.billableAmount ?? "",
        // Backend field is "remainingReceivable", not "remainingAmount" — without this
        // fallback the freshly-saved value was dropped and the summary kept showing
        // the stale pre-save number (or blank on first create).
        remainingAmount: saved?.remainingReceivable ?? saved?.remainingAmount ?? value.remainingAmount ?? "",
      });
      showStatusToast("Fixed price configuration saved", "success");
      await loadSchedulePreview();
    } catch (error) {
      showStatusToast(
        getApiErrorMessage(error, "Unable to save fixed price configuration."),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const requestRemoveFixedPriceConfig = () => {
    if (!value.fixedPriceConfigurationId) {
      update({
        totalContractValue: "",
        contractValueSource: "",
        pmsProjectBudget: "",
        retentionPercent: "",
        advanceReceived: "",
        effectiveFrom: "",
        effectiveTo: "",
        remarks: "",
      });
      setSchedulePreview([]);
      setScheduleError("");
      return;
    }
    setConfirmingDelete(true);
  };

  const removeFixedPriceConfig = async () => {
    const fixedPriceConfigurationId = value.fixedPriceConfigurationId;
    if (!fixedPriceConfigurationId) {
      setConfirmingDelete(false);
      return;
    }

    setDeleting(true);
    try {
      await deleteFixedPriceConfiguration(fixedPriceConfigurationId);
      update({
        fixedPriceConfigurationId: null,
        totalContractValue: "",
        contractValueSource: "",
        pmsProjectBudget: "",
        retentionPercent: "",
        advanceReceived: "",
        effectiveFrom: "",
        effectiveTo: "",
        remarks: "",
        retentionAmount: "",
        billableAmount: "",
        remainingAmount: "",
      });
      setSchedulePreview([]);
      setScheduleError("");
      showStatusToast("Rate deleted successfully.", "success");
      setConfirmingDelete(false);
    } catch (error) {
      showStatusToast(
        getApiErrorMessage(error, "Unable to delete rate."),
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className={Fonts.heading4}>Fixed Price Billing Configuration</h2>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <EnterpriseBudgetSourceSelector
          value={contractValueSource}
          onChange={(nextSource) => {
            if (nextSource === "PMS") {
              update({
                contractValueSource: "PMS",
                totalContractValue: projectBudget || "",
                pmsProjectBudget: projectBudget || "",
              });
            } else {
              update({ contractValueSource: "MANUAL" });
            }
          }}
          projectBudget={projectBudget}
          currency={currency}
          sourceLabel="Budget Source:"
          manualLabel="Manual Budget"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            {isPmsSource ? (
              <>
                <label className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
                  Contract Value <span className="text-red-500">*</span>
                  <ContractValueSourceBadge source="PMS" />
                </label>
                <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900">
                  {value.totalContractValue || value.totalContractValue === 0
                    ? formatCurrency(value.totalContractValue, currency)
                    : "Not available"}
                </div>
              </>
            ) : (
              <IndianAmountInput
                label={
                  <span className="flex flex-wrap items-center gap-2">
                    Contract Value <span className="text-red-500">*</span>
                    <ContractValueSourceBadge source={contractValueSource} />
                  </span>
                }
                name="totalContractValue"
                value={value.totalContractValue || ""}
                onChange={(nextValue) =>
                  update({ totalContractValue: nextValue, contractValueSource: "MANUAL" })
                }
                placeholder={`e.g. 120000 (${currency})`}
              />
            )}
          </div>
          <FormInput
            label="Retention % (optional)"
            name="retentionPercent"
            type="number"
            min="0"
            max="100"
            value={value.retentionPercent || ""}
            onChange={(event) => update({ retentionPercent: event.target.value })}
            placeholder="e.g. 10"
            error={retentionError}
          />
          <FormInput
            label="Advance Received"
            name="advanceReceived"
            type="number"
            min="0"
            value={value.advanceReceived || ""}
            onChange={(event) => update({ advanceReceived: event.target.value })}
            placeholder="e.g. 20000"
            error={advanceError}
          />
          {!isOneTime && (
            <>
              <FormDatePicker
                label="Effective From"
                name="fixedPriceEffectiveFrom"
                value={value.effectiveFrom || ""}
                onChange={(event) => update({ effectiveFrom: event.target.value })}
                min={projectStartDate || undefined}
                max={projectEndDate || undefined}
                error={dateErrors.effectiveFrom}
              />
              <FormDatePicker
                label="Effective To"
                name="fixedPriceEffectiveTo"
                value={value.effectiveTo || ""}
                onChange={(event) => update({ effectiveTo: event.target.value })}
                min={projectStartDate || undefined}
                max={projectEndDate || undefined}
                error={dateErrors.effectiveTo}
              />
            </>
          )}
          <div className="md:col-span-3">
            <FormTextArea
              label="Remarks"
              name="fixedPriceRemarks"
              value={value.remarks || ""}
              onChange={(event) => update({ remarks: event.target.value })}
              placeholder="Any additional notes about this fixed price arrangement"
              rows={3}
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-4 py-3">
          <div className="flex items-center justify-between py-1 text-sm">
            <span className="text-slate-500">Contract Value</span>
            <span className="font-semibold text-slate-900">{formatCurrency(contractValue, currency)}</span>
          </div>
          {hasRetention && (
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-slate-500">Retention ({retentionPercentNum}%)</span>
              <span className="font-semibold text-slate-900">-{formatCurrency(retentionAmount, currency)}</span>
            </div>
          )}
          <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2 text-sm">
            <span className="font-semibold text-slate-700">Billable Amount</span>
            <span className="font-bold text-[#0A0082]">{formatCurrency(billableAmount, currency)}</span>
          </div>
          {hasAdvance && (
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-slate-500">Advance Received</span>
              <span className="font-semibold text-slate-900">-{formatCurrency(advanceReceivedNum, currency)}</span>
            </div>
          )}
          <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2 text-sm">
            <span className="font-semibold text-slate-700">Remaining Receivable</span>
            <span className="font-bold text-[#0A0082]">{formatCurrency(remainingReceivable, currency)}</span>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          {isOneTime
            ? "One-Time billing: the Remaining Receivable will be raised as a single billing event."
            : `Remaining Receivable will be scheduled across ${
                billingFrequencyLabel && billingFrequencyLabel !== "—" ? billingFrequencyLabel : "the selected"
              } billing cycles based on the project duration.`}
        </p>

        {loadingConfig ? (
          <p className="text-sm text-slate-500">Loading saved fixed price configuration…</p>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="small"
              onClick={saveFixedPriceConfig}
              loading={saving}
              loadingText="Saving..."
            >
              <Check className="h-4 w-4" />
              {value.fixedPriceConfigurationId ? "Update Fixed Price Details" : "Save Fixed Price Details"}
            </Button>
            {value.fixedPriceConfigurationId && (
              <Button
                variant="ghost"
                size="small"
                onClick={requestRemoveFixedPriceConfig}
                loading={deleting}
                loadingText="Removing..."
              >
                <Trash2 className="h-4 w-4 text-red-500" /> Remove
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Billing Schedule (Preview)</h3>
          <span className="text-xs text-slate-400">Generated by the system — not editable.</span>
        </div>

        {loadingSchedule ? (
          <p className="text-sm text-slate-500">Loading billing schedule…</p>
        ) : scheduleError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
            {scheduleError}
          </p>
        ) : schedulePreview.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-500">
            No billing schedule has been generated yet.
          </p>
        ) : (
          <div className="max-h-96 w-full overflow-y-auto overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full table-fixed divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-1/5 px-3 py-2.5 text-left align-middle font-semibold text-slate-600">Period</th>
                  <th className="w-1/5 px-3 py-2.5 text-left align-middle font-semibold text-slate-600">From</th>
                  <th className="w-1/5 px-3 py-2.5 text-left align-middle font-semibold text-slate-600">To</th>
                  <th className="w-1/5 px-3 py-2.5 text-left align-middle font-semibold text-slate-600">Amount</th>
                  <th className="w-1/5 px-3 py-2.5 text-left align-middle font-semibold text-slate-600">Partial Period</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedulePreview.map((period, index) => (
                  <tr key={period.periodNumber ?? index}>
                    <td className="px-3 py-2.5 text-left align-middle text-slate-700">
                      Period {period.periodNumber ?? index + 1}
                    </td>
                    <td className="px-3 py-2.5 text-left align-middle text-slate-700">
                      {formatDisplayDate(period.periodStartDate)}
                    </td>
                    <td className="px-3 py-2.5 text-left align-middle text-slate-700">
                      {formatDisplayDate(period.periodEndDate)}
                    </td>
                    <td className="px-3 py-2.5 text-left align-middle font-medium text-slate-900">
                      {period.billingAmount || period.billingAmount === 0
                        ? formatCurrency(period.billingAmount, currency)
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-left align-middle text-slate-700">
                      {period.isPartialPeriod ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-sm font-semibold text-slate-900">Total Contract Value</span>
          <span className="text-sm font-semibold text-slate-900">
            {value.totalContractValue || value.totalContractValue === 0
              ? formatCurrency(value.totalContractValue, currency)
              : "—"}
          </span>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmingDelete}
        title="Delete Fixed Price Rate"
        message="Remove this fixed price configuration? This cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={deleting}
        onCancel={() => !deleting && setConfirmingDelete(false)}
        onConfirm={removeFixedPriceConfig}
      />
    </div>
  );
}

const EMPTY_FULL_PAYMENT_ENTRY = { sequence: 1, percentage: 100, billingDate: "", remarks: "" };
const DEFAULT_MILESTONE_PLAN_STATE = {
  paymentStructure: "FULL_PAYMENT",
  entries: [
    {
      sequence: 1,
      percentage: 100,
      billingDate: "",
      remarks: "",
    },
  ],
  remarks: "",
};
// Installments start with a single empty row — the number of installments and
// every percentage are entirely user-driven, never prefilled. clientKey is a
// UI-only React key (buildMilestonePlanRequestPayload never sends it).
let installmentKeyCounter = 0;
function buildEmptyInstallmentEntry(sequence) {
  installmentKeyCounter += 1;
  return { clientKey: `installment-${installmentKeyCounter}`, sequence, percentage: "", billingDate: "", remarks: "" };
}

const formatSequence = (index) => String(index + 1).padStart(2, "0");
const roundPercent = (value) => Math.round(value * 100) / 100;

// Payment Plan cards shown in the UI — Full Payment, Installments, or Milestones (Managed by PMS).
const PAYMENT_PLAN_CARDS = [
  {
    ...PAYMENT_STRUCTURE_OPTIONS.find((option) => option.value === "FULL_PAYMENT"),
    description: "One complete payment for the full contract value.",
    icon: Wallet,
  },
  {
    ...PAYMENT_STRUCTURE_OPTIONS.find((option) => option.value === "INSTALLMENTS"),
    description: "Split the contract value into multiple scheduled payments.",
    icon: Layers,
  },
  {
    value: "MILESTONES",
    label: "Milestones",
    description: "Managed by PMS",
    icon: Target,
    disabled: false,
    badge: "PMS Linked",
  },
];

// Enterprise-grade Payment Plan selector — a visually distinct card group
// (icon, selected-state ring, PMS Linked badge) rather than the
// generic RadioCardGroup used elsewhere in this wizard.
function PaymentPlanSelector({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Payment Plan" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {PAYMENT_PLAN_CARDS.map((card) => {
        const isSelected = value === card.value;
        const Icon = card.icon;
        return (
          <button
            key={card.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={card.disabled}
            onClick={() => !card.disabled && onChange(card.value)}
            className={`relative flex flex-col gap-2.5 rounded-xl border p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[#0A0082]/30 ${
              isSelected
                ? "border-[#0A0082] bg-[#0A0082]/[0.04] shadow-[0_0_0_1px_rgba(10,0,130,0.35)]"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            } ${card.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          >
            <div className="absolute right-3 top-3 flex items-center gap-1.5">
              {card.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${
                    isSelected
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : card.disabled
                      ? "bg-amber-50 text-amber-600 ring-amber-200"
                      : "bg-indigo-50 text-indigo-700 ring-indigo-200"
                  }`}
                >
                  {card.badge}
                </span>
              )}
              {isSelected && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0A0082] text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                isSelected ? "bg-[#0A0082] text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-900">{card.label}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{card.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Eyebrow-style heading shared by every Milestone Plan section, so the form
// reads as one workflow: Payment Plan → Schedule → Notes → Summary.
function PlanSectionHeading({ title, description, aside }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {aside}
    </div>
  );
}

// One payment entry (Installment N, or the single Full Payment). The user
// enters only the percentage and billing date — the amount is a read-only
// preview of Total Value × % (the backend calculates and persists the real
// amount). Desktop: Percentage | Amount | Billing Date | Remove; stacks on
// narrow screens.
function PaymentEntryCard({
  index,
  title,
  percentage,
  percentageEditable = true,
  percentagePlaceholder,
  amount,
  billingDate,
  errors = {},
  currency,
  onChange,
  onRemove,
}) {
  const hasPercent = percentage !== "" && percentage !== null && percentage !== undefined;
  const fieldLabel = "mb-1.5 block text-xs font-semibold text-slate-600";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow sm:px-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A0082] text-xs font-bold tabular-nums text-white">
            {formatSequence(index)}
          </span>
          <span className="truncate text-sm font-semibold text-slate-900">{title}</span>
        </div>
        <span className={`shrink-0 text-sm font-semibold tabular-nums ${hasPercent ? "text-[#0A0082]" : "text-slate-300"}`}>
          {hasPercent ? `${Number(percentage)}%` : "—%"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-start">
        <div>
          <label htmlFor={`paymentPercentage-${index}`} className={fieldLabel}>
            Percentage <span className="text-red-500">*</span>
          </label>
          {percentageEditable ? (
            <div className="relative">
              <input
                id={`paymentPercentage-${index}`}
                type="number"
                min="0"
                max="100"
                step="0.01"
                inputMode="decimal"
                value={percentage ?? ""}
                placeholder={percentagePlaceholder || "Enter %"}
                onChange={(event) => onChange({ percentage: event.target.value })}
                onWheel={(event) => event.target.blur()}
                aria-invalid={Boolean(errors.percentage)}
                className={`h-[38px] w-full rounded-lg border pl-3 pr-8 text-sm font-semibold tabular-nums text-slate-900 shadow-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20 ${
                  errors.percentage ? "border-red-300 bg-red-50/40" : "border-slate-300"
                }`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-slate-400">%</span>
            </div>
          ) : (
            <div className="flex h-[38px] items-center rounded-lg bg-slate-50 px-3 text-sm font-semibold tabular-nums text-slate-900">100%</div>
          )}
          {errors.percentage && <p className="mt-1 text-xs text-red-600">{errors.percentage}</p>}
        </div>

        <div>
          <span className={fieldLabel}>Payment Amount</span>
          <div className="flex h-[38px] items-center justify-between gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3">
            <span className="truncate text-sm font-bold tabular-nums text-slate-900">
              {hasPercent ? formatCurrency(amount, currency) : "—"}
            </span>
            <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-400">Calculated</span>
          </div>
        </div>

        <div>
          <label htmlFor={`paymentBillingDate-${index}`} className={fieldLabel}>
            Billing Date <span className="text-red-500">*</span>
          </label>
          <input
            id={`paymentBillingDate-${index}`}
            type="date"
            value={billingDate || ""}
            onChange={(event) => onChange({ billingDate: event.target.value })}
            aria-invalid={Boolean(errors.billingDate)}
            className={`h-[38px] w-full rounded-lg border px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20 ${
              errors.billingDate ? "border-red-300 bg-red-50/40" : "border-slate-300"
            }`}
          />
          {errors.billingDate && <p className="mt-1 text-xs text-red-600">{errors.billingDate}</p>}
        </div>

        {onRemove && (
          <div className="flex justify-end sm:col-span-2 lg:col-span-1 lg:pt-[22px]">
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex h-[38px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              aria-label={`Remove ${title}`}
            >
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Shared Payment Summary for Full Payment and Installments. Total Value is the
// Project Budget (no separate contract-value input exists). Order is fixed:
// Total Value → Scheduled Amount → Total Allocation → Remaining Amount (last,
// emphasized). Allocation status is derived from the percentage total so
// floating-point amount rounding never flips the state.
function PaymentSummaryPanel({
  totalValue,
  scheduledAmount,
  totalPercentage,
  currency,
  isMilestones = false,
  previouslyBilledAmount = null,
  remainingContractBalance = null,
}) {
  const percentRemaining = roundPercent(100 - totalPercentage);
  const status = Math.abs(percentRemaining) < 0.01 ? "complete" : percentRemaining > 0 ? "remaining" : "exceeded";
  const remainingAmount = status === "complete" ? 0 : totalValue - scheduledAmount;

  const remainingTone = isMilestones
    ? {
        complete: { tone: "text-emerald-700", icon: Check, text: "Fully allocated (100%)" },
        remaining: { tone: "text-blue-700", icon: Check, text: `Current cycle allocation: ${roundPercent(totalPercentage)}%` },
        exceeded: { tone: "text-red-700", icon: AlertCircle, text: `Allocation exceeds 100% by ${Math.abs(percentRemaining)}%` },
      }[status]
    : {
        complete: { tone: "text-emerald-700", icon: Check, text: "Fully scheduled" },
        remaining: { tone: "text-amber-700", icon: AlertCircle, text: `${percentRemaining}% remaining to schedule` },
        exceeded: { tone: "text-red-700", icon: AlertCircle, text: `Allocation exceeds 100% by ${Math.abs(percentRemaining)}%` },
      }[status];
  const StatusIcon = remainingTone.icon;

  // Compact finance-style statement: labels left, amounts right, one rule
  // above the emphasized Remaining Amount line.
  const row = "flex items-baseline justify-between gap-4 py-1";
  const label = "text-slate-600";
  const amount = "font-medium tabular-nums text-slate-900";
  return (
    <div className="space-y-2">
      <PlanSectionHeading title="Payment Summary" />
      <dl className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm">
        <div className={row}>
          <dt className={label}>Total Value</dt>
          <dd className={amount}>{formatCurrency(totalValue, currency)}</dd>
        </div>
        {previouslyBilledAmount !== null && previouslyBilledAmount !== undefined && (
          <div className={row}>
            <dt className={label}>Previously Billed</dt>
            <dd className={amount}>{formatCurrency(previouslyBilledAmount, currency)}</dd>
          </div>
        )}
        <div className={row}>
          <dt className={label}>{isMilestones ? "Amount Scheduled (Current Cycle)" : "Scheduled Amount"}</dt>
          <dd className={amount}>{formatCurrency(scheduledAmount, currency)}</dd>
        </div>
        <div className={row}>
          <dt className={label}>{isMilestones ? "Selected Allocation Total" : "Total Allocation"}</dt>
          <dd className={`${amount} ${status === "complete" || (isMilestones && status === "remaining") ? "" : remainingTone.tone}`}>
            {roundPercent(totalPercentage)}%
          </dd>
        </div>
        <div className="mt-1.5 border-t border-slate-200 pt-2" role="status">
          {remainingContractBalance !== null && remainingContractBalance !== undefined ? (
            <div className={row}>
              <dt className="font-semibold text-slate-800">Remaining Contract Balance</dt>
              <dd className="font-semibold tabular-nums text-slate-900">
                {formatCurrency(remainingContractBalance, currency)}
              </dd>
            </div>
          ) : (
            <div className={row}>
              <dt className="font-semibold text-slate-800">
                {isMilestones ? "Unallocated (Current Cycle)" : "Remaining Amount"}
              </dt>
              <dd className={`font-semibold tabular-nums ${status === "complete" || (isMilestones && status === "remaining") ? "text-slate-900" : remainingTone.tone}`}>
                {formatCurrency(remainingAmount, currency)}
              </dd>
            </div>
          )}
          <p className={`flex items-center gap-1 text-xs font-medium ${remainingTone.tone}`}>
            <StatusIcon className="h-3.5 w-3.5 shrink-0" /> {remainingTone.text}
          </p>
        </div>
      </dl>
    </div>
  );
}

// Milestone Plan billing (PaymentStructure FULL_PAYMENT / INSTALLMENTS / MILESTONES).
// MILESTONES synchronizes directly with PMS project milestones.
export function MilestonePlanForm({
  value = {},
  onChange,
  currency,
  projectBudget,
  billingConfigurationId,
  ensureBillingConfigurationId,
  projectInfo = {},
}) {
  const update = (patch) => onChange({ ...value, ...patch });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const fetchedRef = useRef(null);
  const seededRef = useRef(false);
  // Last plan persisted on the backend (loaded or just saved) — lets switching
  // Payment Plan away and back restore the saved entries instead of resetting.
  const savedPlanRef = useRef(null);

  const paymentStructure = value.paymentStructure || "FULL_PAYMENT";
  const isFullPayment = paymentStructure === "FULL_PAYMENT";
  const isMilestones = paymentStructure === "MILESTONES";
  const entries = value.entries || [];

  // The PMS project id (a number), carried from the selected project's record.
  // projectInfo.pmsProjectId is the backend master key of the project (the same id PMS uses); it is read
  // explicitly rather than inferred from other project fields.
  const pmsProjectId = toPmsProjectId(projectInfo?.pmsProjectId);
  const milestonesState = useProjectMilestones(pmsProjectId, { enabled: isMilestones });

  // Seeds a sensible default shape the first time this form mounts for a
  // brand-new Milestone Plan (nothing saved/loaded yet) — Full Payment with a
  // single 100% entry — so the "100%" amount is visible immediately.
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    if (value.paymentStructure || (value.entries || []).length > 0) return;
    update({ ...DEFAULT_MILESTONE_PLAN_STATE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Project Budget (shown once already, under Project Financials) is the
  // single source of truth for the contract value here — there is no
  // separate "Total Contract Value" input. Keep it synced onto form state so
  // validation/payload always have it, and so a stale value loaded from a
  // previously-saved record (from before the budget changed) is corrected.
  useEffect(() => {
    if (projectBudget === "" || projectBudget === null || projectBudget === undefined) return;
    const cleanBudget =
      typeof projectBudget === "number"
        ? projectBudget
        : Number(String(projectBudget).replace(/,/g, "").replace(/[^0-9.-]+/g, ""));
    if (Number.isNaN(cleanBudget) || cleanBudget <= 0) return;
    if (Number(value.totalContractValue) === cleanBudget) return;
    update({ totalContractValue: cleanBudget });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectBudget, value.totalContractValue]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!billingConfigurationId) return;
      if (fetchedRef.current === billingConfigurationId) return;
      fetchedRef.current = billingConfigurationId;

      setLoadingConfig(true);
      try {
        const record = await getMilestonePlanByBillingConfiguration(billingConfigurationId);
        if (!mounted) return;
        if (!record) {
          update({
            milestonePlanId: null,
            ...DEFAULT_MILESTONE_PLAN_STATE,
          });
          return;
        }
        const loadedEntries = Array.isArray(record.entries)
          ? record.entries.map((entry, index) => {
              const normalized = normalizeMilestonePaymentEntry(entry);
              return {
                ...normalized,
                sequence: normalized.sequence ?? index + 1,
              };
            })
          : [];
        savedPlanRef.current = { paymentStructure: record.paymentStructure || "FULL_PAYMENT", entries: loadedEntries };
        update({
          milestonePlanId: record.milestonePlanId || record.id || null,
          totalContractValue: record.totalContractValue ?? value.totalContractValue ?? "",
          paymentStructure: record.paymentStructure || "FULL_PAYMENT",
          entries: loadedEntries,
          remarks: record.remarks || "",
          previouslyBilledAmount:
            record.previouslyBilledAmount !== undefined && record.previouslyBilledAmount !== null
              ? record.previouslyBilledAmount
              : value.previouslyBilledAmount ?? null,
          remainingContractBalance:
            record.remainingContractBalance !== undefined && record.remainingContractBalance !== null
              ? record.remainingContractBalance
              : value.remainingContractBalance ?? null,
        });
      } catch (error) {
        if (isMilestonePlanNotFoundError(error)) {
          if (!mounted) return;
          update({
            milestonePlanId: null,
            ...DEFAULT_MILESTONE_PLAN_STATE,
          });
          return;
        }
        showStatusToast(
          getApiErrorMessage(error, "Unable to load milestone plan configuration."),
          "error",
        );
      } finally {
        if (mounted) setLoadingConfig(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingConfigurationId]);

  // Switching Payment Structure must never leave stale entries from the other
  // structure behind. Milestones synchronizes from PMS records.
  const handlePaymentStructureChange = (next) => {
    if (next === paymentStructure) return;
    if (isMilestones) {
      // the entry's own backend state decides, never the milestone list
      const hasFrozen = entries.some(isMilestoneEntryLocked);
      if (hasFrozen) {
        showStatusToast(
          "The payment structure cannot be changed because billing has already started for one or more milestones.",
          "error",
        );
        return;
      }
    }
    const saved = savedPlanRef.current;
    const savedEntries = saved?.paymentStructure === next && saved.entries.length > 0 ? saved.entries : null;

    if (next === "MILESTONES") {
      // Nothing is pre-selected: the user picks the PMS milestones to bill (or the
      // plan's saved milestone entries come back when it was saved as MILESTONES).
      update({
        paymentStructure: "MILESTONES",
        entries: savedEntries?.map((entry) => ({ ...entry })) || [],
      });
      return;
    }

    update({
      paymentStructure: next,
      entries:
        savedEntries?.map((entry) => ({ ...entry })) ||
        (next === "FULL_PAYMENT" ? [{ ...EMPTY_FULL_PAYMENT_ENTRY }] : [buildEmptyInstallmentEntry(1)]),
    });
  };

  const updateFullPaymentEntry = (patch) => {
    const current = entries[0] || EMPTY_FULL_PAYMENT_ENTRY;
    update({ entries: [{ ...current, ...patch, sequence: 1, percentage: 100 }] });
  };

  // Appends an empty row — the remaining percentage is only suggested via the
  // input's placeholder, never prefilled.
  const addInstallment = () => {
    update({ entries: [...entries, buildEmptyInstallmentEntry(entries.length + 1)] });
  };

  const removeInstallment = (index) => {
    if (entries.length <= 1) return;
    const next = entries.filter((_, i) => i !== index).map((entry, i) => ({ ...entry, sequence: i + 1 }));
    update({ entries: next });
  };

  const updateInstallment = (index, patch) => {
    const next = entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry));
    update({ entries: next });
  };

  // Project Budget drives every amount shown here — fall back to the stored
  // value only for the brief window before the sync effect above runs.
  const cleanProjectBudget =
    projectBudget !== "" && projectBudget !== null && projectBudget !== undefined
      ? typeof projectBudget === "number"
        ? projectBudget
        : Number(String(projectBudget).replace(/,/g, "").replace(/[^0-9.-]+/g, ""))
      : null;
  const cleanValueContractValue =
    value.totalContractValue !== "" && value.totalContractValue !== null && value.totalContractValue !== undefined
      ? typeof value.totalContractValue === "number"
        ? value.totalContractValue
        : Number(String(value.totalContractValue).replace(/,/g, "").replace(/[^0-9.-]+/g, ""))
      : null;

  const totalContractValueNum =
    cleanProjectBudget !== null && !Number.isNaN(cleanProjectBudget) && cleanProjectBudget > 0
      ? cleanProjectBudget
      : cleanValueContractValue !== null && !Number.isNaN(cleanValueContractValue) && cleanValueContractValue > 0
      ? cleanValueContractValue
      : 0;

  const entryErrors = entries.map((entry) => {
    const errors = {};
    const percentNum = Number(entry.percentage);
    if (entry.percentage === "" || entry.percentage === null || entry.percentage === undefined) {
      errors.percentage = "Percentage is required.";
    } else if (Number.isNaN(percentNum) || percentNum <= 0) {
      errors.percentage = "Percentage must be greater than 0.";
    } else if (percentNum > 100) {
      errors.percentage = "Percentage cannot exceed 100%.";
    } else {
      const parts = String(entry.percentage).split(".");
      if (parts[1] && parts[1].length > 2) {
        errors.percentage = "Percentage can have at most two decimal places.";
      }
    }
    if (!entry.billingDate) {
      errors.billingDate = "Billing date is required.";
    }
    return errors;
  });

  // Unique billing date rule for MILESTONES (backend creates one occurrence per date)
  if (isMilestones) {
    const dateCounts = new Map();
    entries.forEach((e) => {
      if (e.billingDate) {
        dateCounts.set(e.billingDate, (dateCounts.get(e.billingDate) || 0) + 1);
      }
    });
    entries.forEach((entry, idx) => {
      if (entry.billingDate && dateCounts.get(entry.billingDate) > 1) {
        if (!entryErrors[idx]) entryErrors[idx] = {};
        entryErrors[idx].billingDate = "Each milestone must have its own billing date.";
      }
    });
  }

  const hasEntryErrors = entryErrors.some((error) => error.percentage || error.billingDate);

  const totalPercentage = entries.reduce((sum, entry) => sum + (Number(entry.percentage) || 0), 0);
  const totalPercentageValid = isMilestones
    ? entries.length > 0 && totalPercentage > 0 && totalPercentage <= 100.001
    : entries.length > 0 && Math.abs(totalPercentage - 100) < 0.01;
  const totalAllocated = entries.reduce(
    (sum, entry) => sum + ((Number(entry.percentage) || 0) / 100) * totalContractValueNum,
    0,
  );

  const parseNumOrNull = (val) => {
    if (val === null || val === undefined || val === "") return null;
    const num = Number(val);
    return Number.isNaN(num) ? null : num;
  };

  const previouslyBilled = parseNumOrNull(value.previouslyBilledAmount);
  const maxAllowedAmount = previouslyBilled !== null ? Math.max(0, totalContractValueNum - previouslyBilled) : totalContractValueNum;
  const exceedsPermittedContractValue = previouslyBilled !== null && totalAllocated > maxAllowedAmount + 0.01;

  // MILESTONES: every entry must reference a PMS milestone the backend actually
  // listed for this project (a deleted/foreign one would be refused on save anyway).
  const listedMilestoneIds = new Set(milestonesState.milestones.map((m) => m.pmsMilestoneId));
  const milestonesLoaded = milestonesState.status === "success";
  const hasUnlistedMilestoneEntry = isMilestones
    && milestonesLoaded
    // A locked entry is kept even when PMS no longer lists its milestone (the backend still freezes it and
    // requires it to be sent back unchanged); only entries that can be removed block the save.
    && entries.some((entry) => !listedMilestoneIds.has(entry.pmsMilestoneId) && !isMilestoneEntryLocked(entry));

  const contractValueValid = totalContractValueNum > 0;
  const isInstallmentsValid = entries.length > 0 && !hasEntryErrors && totalPercentageValid;
  const isFullPaymentValid = Boolean(entries[0]?.billingDate) && !entryErrors[0]?.billingDate;
  const isMilestonesValid =
    milestonesLoaded &&
    entries.length > 0 &&
    !hasEntryErrors &&
    totalPercentageValid &&
    !hasUnlistedMilestoneEntry &&
    !exceedsPermittedContractValue;
  const isFormValid =
    contractValueValid &&
    (isFullPayment ? isFullPaymentValid : isMilestones ? isMilestonesValid : isInstallmentsValid);

  // A fresh, still-empty row shouldn't light up red — inline errors show only
  // for a value the user actually entered (e.g. 0 or >100). Anything still
  // missing is listed once next to Save instead (saveBlockers).
  const visibleEntryErrors = entries.map((entry, index) => ({
    percentage:
      entry.percentage === "" || entry.percentage === null || entry.percentage === undefined
        ? ""
        : entryErrors[index]?.percentage,
  }));
  const remainingPercent = roundPercent(100 - totalPercentage);
  const saveBlockers = [];
  if (!contractValueValid) saveBlockers.push("Project Budget is not available");
  if (isFullPayment) {
    if (!entries[0]?.billingDate) saveBlockers.push("Select the billing date");
  } else if (isMilestones) {
    if (!milestonesLoaded) saveBlockers.push("PMS milestones are not loaded");
    else if (milestonesState.milestones.length === 0) saveBlockers.push("No milestones found in PMS");
    else if (entries.length === 0) saveBlockers.push("Select at least one milestone");
    if (entries.some((entry) => entry.percentage === "" || entry.percentage === null || entry.percentage === undefined)) {
      saveBlockers.push("Enter a billing percentage for every selected milestone");
    }
    const hasDecimalError = entries.some((entry) => {
      const parts = String(entry.percentage ?? "").split(".");
      return parts.length > 1 && parts[1].length > 2;
    });
    if (hasDecimalError) {
      saveBlockers.push("Percentage must have at most 2 decimal places");
    }
    if (entries.some((entry) => !entry.billingDate)) saveBlockers.push("Select a billing date for every selected milestone");
    const milestoneDates = entries.map((e) => e.billingDate).filter(Boolean);
    if (new Set(milestoneDates).size !== milestoneDates.length) {
      saveBlockers.push("Each milestone must have a unique billing date");
    }
    if (hasUnlistedMilestoneEntry) saveBlockers.push("Remove milestones PMS no longer lists");
    if (totalPercentage > 100) saveBlockers.push("Total allocation cannot exceed 100%");
    if (exceedsPermittedContractValue) saveBlockers.push("Allocation exceeds remaining contract value");
  } else {
    if (entries.some((entry) => entry.percentage === "" || entry.percentage === null || entry.percentage === undefined)) {
      saveBlockers.push("Enter a percentage for every installment");
    }
    if (entries.some((entry) => !entry.billingDate)) saveBlockers.push("Select a billing date for every installment");
    if (!totalPercentageValid) saveBlockers.push("Allocate exactly 100%");
  }

  const saveMilestonePlanConfig = async () => {
    if (!contractValueValid) {
      showStatusToast("Total Contract Value is required and must be greater than zero.", "error");
      return;
    }
    if (isFullPayment) {
      if (!entries[0]?.billingDate) {
        showStatusToast("Billing date is required.", "error");
        return;
      }
    } else if (isMilestones) {
      if (!milestonesLoaded || entries.length === 0) {
        showStatusToast("Select at least one PMS milestone to bill.", "error");
        return;
      }
      if (hasEntryErrors) {
        showStatusToast("Please fix the highlighted milestone errors before saving.", "error");
        return;
      }
      if (hasUnlistedMilestoneEntry) {
        showStatusToast("Remove the milestones PMS no longer lists before saving.", "error");
        return;
      }
      if (totalPercentage > 100) {
        showStatusToast("Total milestone percentage cannot exceed 100%.", "error");
        return;
      }
      if (exceedsPermittedContractValue) {
        showStatusToast(
          `The selected milestones total ${formatCurrency(totalAllocated, currency)}, which exceeds the remaining contract value of ${formatCurrency(maxAllowedAmount, currency)}.`,
          "error",
        );
        return;
      }
    } else {
      if (entries.length === 0) {
        showStatusToast("At least one installment is required.", "error");
        return;
      }
      if (hasEntryErrors) {
        showStatusToast("Please fix the highlighted installment errors before saving.", "error");
        return;
      }
      if (!totalPercentageValid) {
        showStatusToast("Total installment percentage must equal 100%.", "error");
        return;
      }
    }

    if (!billingConfigurationId) {
      showStatusToast(
        "Unable to save milestone plan configuration: billing configuration id is missing. Please reload and try again.",
        "error",
      );
      return;
    }

    setSaving(true);
    try {
      // The parent billing configuration's draft may have been created before
      // Billing Frequency was selected — re-sync it first, mirroring
      // FixedPriceForm's saveFixedPriceConfig.
      let resolvedConfigId = billingConfigurationId;
      if (ensureBillingConfigurationId) {
        const syncedId = await ensureBillingConfigurationId();
        if (syncedId) resolvedConfigId = syncedId;
      }

      // totalContractValue is sourced from Project Budget (totalContractValueNum,
      // same value already driving the Payment/Allocated/Remaining amounts above),
      // never from value.totalContractValue directly — that field is only kept in
      // sync by the effect above and can still be stale/blank at the moment Save
      // is clicked (e.g. right after the budget first loads). There is no separate
      // Total Contract Value input in this form.
      // Entry-level remarks are no longer collected in the UI — Plan Notes
      // (plan-level remarks) is the single notes field — so each entry's
      // remarks is sent as "" per the existing API convention.
      // MILESTONES entries keep their PMS milestone id and its name as remarks.
      const entriesToSend = isMilestones
        ? entries.map((entry) => ({ ...entry }))
        : entries.map((entry) => ({ ...entry, remarks: "" }));

      const payload = buildMilestonePlanRequestPayload({
        ...value,
        paymentStructure: isMilestones ? "MILESTONES" : paymentStructure,
        totalContractValue: totalContractValueNum,
        entries: entriesToSend,
      });

      // value.milestonePlanId can still be unset here if the wizard's own load
      // effect (above) hasn't resolved yet — re-check the backend directly so
      // an existing record is updated, never re-created as a duplicate.
      let existingId = value.milestonePlanId;
      if (!existingId && resolvedConfigId) {
        const existingRecord = await getMilestonePlanByBillingConfiguration(resolvedConfigId);
        existingId = existingRecord?.milestonePlanId || existingRecord?.id || null;
      }

      const saved = existingId
        ? await updateMilestonePlanConfiguration(existingId, payload)
        : await createMilestonePlanConfiguration(resolvedConfigId, payload);

      const savedMilestonePlanId =
        saved?.milestonePlanId ||
        saved?.id ||
        saved?.data?.milestonePlanId ||
        saved?.data?.id ||
        existingId ||
        value.milestonePlanId ||
        null;

      // Reconcile with the backend-calculated amounts so the display reflects
      // exactly what was persisted, falling back to what was just entered.
      const savedEntries =
        Array.isArray(saved?.entries) && saved.entries.length > 0
          ? saved.entries.map((entry, index) => {
              const normalized = normalizeMilestonePaymentEntry(entry);
              return {
                ...normalized,
                sequence: normalized.sequence ?? index + 1,
                percentage: normalized.percentage ?? entries[index]?.percentage ?? "",
              };
            })
          : entries.map(normalizeMilestonePaymentEntry);
      const savedPaymentStructure = saved?.paymentStructure || value.paymentStructure || "FULL_PAYMENT";

      // A create response does not carry the entries' frozen state (nothing exists to be frozen yet, but the backend
      // does not say so). Re-read the plan so every saved entry shows the authoritative state instead of "unknown".
      let authoritativeEntries = savedEntries;
      if (savedPaymentStructure === "MILESTONES" && savedEntries.some((entry) => entry.frozen === undefined)) {
        try {
          const refreshed = await getMilestonePlanByBillingConfiguration(resolvedConfigId);
          const refreshedEntries = Array.isArray(refreshed?.entries) ? refreshed.entries.map(normalizeMilestonePaymentEntry) : [];
          if (refreshedEntries.length === savedEntries.length && refreshedEntries.every((entry) => entry.frozen !== undefined)) {
            authoritativeEntries = refreshedEntries.map((entry, index) => ({
              ...entry,
              sequence: entry.sequence ?? index + 1,
            }));
          }
        } catch {
          // keep the create/update response; its entries stay "unknown" and therefore locked in the UI
        }
      }
      savedPlanRef.current = { paymentStructure: savedPaymentStructure, entries: authoritativeEntries };

      update({
        milestonePlanId: savedMilestonePlanId,
        totalContractValue: saved?.totalContractValue ?? totalContractValueNum,
        paymentStructure: savedPaymentStructure,
        remarks: saved?.remarks ?? value.remarks ?? "",
        entries: authoritativeEntries,
        previouslyBilledAmount:
          saved?.previouslyBilledAmount !== undefined && saved?.previouslyBilledAmount !== null
            ? saved.previouslyBilledAmount
            : value.previouslyBilledAmount ?? null,
        remainingContractBalance:
          saved?.remainingContractBalance !== undefined && saved?.remainingContractBalance !== null
            ? saved.remainingContractBalance
            : value.remainingContractBalance ?? null,
      });
      showStatusToast("Milestone plan configuration saved", "success");
    } catch (error) {
      if (isMilestones && milestonesState?.reload) {
        milestonesState.reload();
      }
      showStatusToast(
        getApiErrorMessage(error, "Unable to save milestone plan configuration."),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const requestRemoveMilestonePlanConfig = () => {
    if (isMilestones) {
      // the entry's own backend state decides, never the milestone list
      const hasFrozen = entries.some(isMilestoneEntryLocked);
      if (hasFrozen) {
        showStatusToast(
          "The milestone plan cannot be deleted because billing has already started for one or more milestones.",
          "error",
        );
        return;
      }
    }
    if (!value.milestonePlanId) {
      savedPlanRef.current = null;
      update({
        milestonePlanId: null,
        totalContractValue: "",
        ...DEFAULT_MILESTONE_PLAN_STATE,
      });
      return;
    }
    setConfirmingDelete(true);
  };

  const removeMilestonePlanConfig = async () => {
    const milestonePlanId = value.milestonePlanId;
    if (!milestonePlanId) {
      setConfirmingDelete(false);
      return;
    }
    if (isMilestones) {
      // the entry's own backend state decides, never the milestone list
      const hasFrozen = entries.some(isMilestoneEntryLocked);
      if (hasFrozen) {
        showStatusToast(
          "The milestone plan cannot be deleted because billing has already started for one or more milestones.",
          "error",
        );
        setConfirmingDelete(false);
        return;
      }
    }

    setDeleting(true);
    try {
      await deleteMilestonePlanConfiguration(milestonePlanId);
      savedPlanRef.current = null;
      update({
        milestonePlanId: null,
        totalContractValue: "",
        ...DEFAULT_MILESTONE_PLAN_STATE,
      });
      showStatusToast("Milestone plan configuration deleted.", "success");
      setConfirmingDelete(false);
    } catch (error) {
      showStatusToast(
        getApiErrorMessage(error, "Unable to delete milestone plan configuration."),
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-900">Milestone Plan</h2>

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* 1. Payment Plan — how the Total Value is paid */}
        <section className="space-y-3 p-4 sm:px-6 sm:py-5">
          <PlanSectionHeading
            title="Payment Plan"
            description="Choose how the project's total value will be billed."
          />
          <PaymentPlanSelector value={paymentStructure} onChange={handlePaymentStructureChange} />
        </section>

        {/* 2. Schedule — how many payments, how much each, and when */}
        <section className="space-y-3 bg-slate-50/40 p-4 sm:px-6 sm:py-5">
          <PlanSectionHeading
            title={
              isFullPayment
                ? "Payment Schedule"
                : isMilestones
                ? "PMS Milestones Schedule"
                : "Installment Schedule"
            }
            description={
              isFullPayment
                ? "The full value is billed in a single payment on the selected date."
                : isMilestones
                ? "Select the PMS milestones to bill and enter each one's share of the total value and billing date."
                : "Enter each installment's share of the total value and its billing date."
            }
            aside={
              isMilestones ? (
                <span className="text-xs font-semibold text-[#0A0082]">
                  {entries.length} {entries.length === 1 ? "milestone" : "milestones"} selected
                </span>
              ) : !isFullPayment ? (
                <span className="text-xs font-medium text-slate-500">
                  {entries.length} {entries.length === 1 ? "installment" : "installments"}
                </span>
              ) : null
            }
          />

          {isFullPayment ? (
            <PaymentEntryCard
              index={0}
              title="Full Payment"
              percentage={100}
              percentageEditable={false}
              amount={totalContractValueNum}
              billingDate={entries[0]?.billingDate}
              currency={currency}
              onChange={updateFullPaymentEntry}
            />
          ) : isMilestones ? (
            <PmsMilestoneSelectionPanel
              pmsProjectId={pmsProjectId}
              milestonesState={milestonesState}
              onReload={milestonesState.reload}
              entries={entries}
              onEntriesChange={(nextEntries) => update({ entries: nextEntries })}
              totalValue={totalContractValueNum}
              currency={currency}
            />
          ) : (
            <div className="space-y-3">
              {entries.map((entry, index) => {
                const percentNum = Number(entry.percentage) || 0;
                const isEmptyPercent = entry.percentage === "" || entry.percentage === null || entry.percentage === undefined;
                return (
                  <PaymentEntryCard
                    key={entry.clientKey || entry.paymentEntryId || `installment-${index}`}
                    index={index}
                    title={`Installment ${index + 1}`}
                    percentage={entry.percentage}
                    percentagePlaceholder={isEmptyPercent && remainingPercent > 0 ? `${remainingPercent} remaining` : "Enter %"}
                    amount={(percentNum / 100) * totalContractValueNum}
                    billingDate={entry.billingDate}
                    errors={visibleEntryErrors[index]}
                    currency={currency}
                    onChange={(patch) => updateInstallment(index, patch)}
                    onRemove={entries.length > 1 ? () => removeInstallment(index) : undefined}
                  />
                );
              })}

              <button
                type="button"
                onClick={addInstallment}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#0A0082]/40 bg-white px-4 py-3 text-sm font-semibold text-[#0A0082] transition-colors hover:border-[#0A0082] hover:bg-[#0A0082]/[0.04] focus:outline-none focus:ring-2 focus:ring-[#0A0082]/30"
              >
                <Plus className="h-4 w-4" /> Add Installment
              </button>
            </div>
          )}
        </section>

        {/* 3. Plan Notes — the single notes field (plan-level remarks), part
            of the configuration itself rather than appended after the summary */}
        <section className="space-y-2 p-4 sm:px-6 sm:py-5">
          <label htmlFor="milestonePlanRemarks" className="flex items-baseline gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Plan Notes</span>
            <span className="text-xs font-normal text-slate-400">Optional</span>
          </label>
          <textarea
            id="milestonePlanRemarks"
            name="milestonePlanRemarks"
            value={value.remarks || ""}
            onChange={(event) => update({ remarks: event.target.value })}
            placeholder="Add any additional information about this payment plan, commercial agreement, or billing arrangement."
            rows={3}
            className="block min-h-[76px] w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
          />
        </section>

        {/* 4. Payment Summary — overall allocation, Remaining Amount last */}
        <section className="p-4 sm:px-6 sm:py-5">
          <PaymentSummaryPanel
            totalValue={totalContractValueNum}
            scheduledAmount={isFullPayment ? totalContractValueNum : totalAllocated}
            totalPercentage={isFullPayment ? 100 : totalPercentage}
            currency={currency}
            isMilestones={isMilestones}
            previouslyBilledAmount={value.previouslyBilledAmount}
            remainingContractBalance={value.remainingContractBalance}
          />
        </section>

        {/* 5. Actions — destructive Remove on the left, save status + primary on the right */}
        <section className="flex flex-col-reverse gap-3 rounded-b-xl bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {loadingConfig ? (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading saved milestone plan…
            </p>
          ) : (
            <>
              <div className="shrink-0">
                {value.milestonePlanId && (
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={requestRemoveMilestonePlanConfig}
                    loading={deleting}
                    loadingText="Removing..."
                  >
                    <Trash2 className="h-4 w-4 text-red-500" /> Remove
                  </Button>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
                <div className="min-w-0 text-xs">
                  {saveBlockers.length > 0 ? (
                    <p className="flex items-start gap-1.5 font-medium text-slate-500">
                      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <span>To save: {saveBlockers.join(" · ")}</span>
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 font-medium text-emerald-700">
                      <Check className="h-3.5 w-3.5 shrink-0" /> Ready to save
                    </p>
                  )}
                </div>
                <Button
                  variant="primary"
                  size="small"
                  onClick={saveMilestonePlanConfig}
                  loading={saving}
                  loadingText="Saving..."
                  disabled={!isFormValid}
                  className="shrink-0 self-end sm:self-auto"
                >
                  <Check className="h-4 w-4" />
                  {value.milestonePlanId ? "Update Milestone Plan" : "Save Milestone Plan"}
                </Button>
              </div>
            </>
          )}
        </section>
      </div>

      <ConfirmationModal
        isOpen={confirmingDelete}
        title="Delete Milestone Plan"
        message="Remove this milestone plan configuration? This cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={deleting}
        onCancel={() => !deleting && setConfirmingDelete(false)}
        onConfirm={removeMilestonePlanConfig}
      />
    </div>
  );
}

const EMPTY_MILESTONE_FORM = {
  name: "",
  amount: "",
  dueDate: "",
  status: "PENDING",
};

function MilestoneForm({
  milestones = [],
  settings = {},
  onMilestonesChange,
  onSettingsChange,
  currency,
}) {
  const [modalState, setModalState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openAddModal = () =>
    setModalState({ mode: "add", form: EMPTY_MILESTONE_FORM });
  const openEditModal = (milestone) =>
    setModalState({
      mode: "edit",
      id: milestone.id,
      form: {
        name: milestone.name,
        amount: milestone.amount,
        dueDate: milestone.dueDate,
        status: milestone.status || "PENDING",
      },
    });

  const handleModalFieldChange = (patch) =>
    setModalState((prev) => ({ ...prev, form: { ...prev.form, ...patch } }));

  const handleModalSave = () => {
    const { mode, id, form } = modalState;
    if (mode === "add") {
      onMilestonesChange([...milestones, { id: nextMilestoneId(), ...form }]);
    } else {
      onMilestonesChange(
        milestones.map((milestone) =>
          milestone.id === id ? { ...milestone, ...form } : milestone,
        ),
      );
    }
    setModalState(null);
  };

  const handleConfirmDelete = () => {
    onMilestonesChange(
      milestones.filter((milestone) => milestone.id !== deleteTarget.id),
    );
    setDeleteTarget(null);
  };

  const isModalFormValid = Boolean(
    modalState?.form.name &&
    modalState?.form.amount &&
    modalState?.form.dueDate,
  );

  const tableRows = milestones.map((milestone) => ({
    name: milestone.name,
    amount: formatCurrency(milestone.amount, currency),
    dueDate: milestone.dueDate,
    status: (
      <StatusBadge
        label={milestone.status === "COMPLETED" ? "Completed" : "Pending"}
        size="sm"
      />
    ),
    actions: (
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          title="Edit milestone"
          onClick={() => openEditModal(milestone)}
        >
          <Pencil className="h-4 w-4 text-blue-600" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Remove milestone"
          onClick={() => setDeleteTarget(milestone)}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    ),
  }));

  return (
    <div className="space-y-4">
      <h2 className={Fonts.heading4}>Milestone Billing Configuration</h2>

      <div className="rounded-xl border border-slate-200 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Milestones</h3>
          <Button variant="outline" size="small" onClick={openAddModal}>
            <Plus className="h-3.5 w-3.5" /> Add Milestone
          </Button>
        </div>

        <ARTable
          headers={["Milestone Name", "Amount", "Due Date", "Status", "Actions"]}
          columns={["name", "amount", "dueDate", "status", "actions"]}
          rows={tableRows}
          emptyMessage="No milestones added yet. Add at least one milestone."
        />
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 p-5">
        <ToggleSwitch
          label="Bill only completed milestones"
          checked={Boolean(settings.billOnlyCompletedMilestones)}
          onChange={(checked) =>
            onSettingsChange({
              ...settings,
              billOnlyCompletedMilestones: checked,
            })
          }
        />
        <ToggleSwitch
          label="Allow partial milestone billing"
          checked={Boolean(settings.allowPartialMilestoneBilling)}
          onChange={(checked) =>
            onSettingsChange({
              ...settings,
              allowPartialMilestoneBilling: checked,
            })
          }
        />
      </div>

      <Modal
        isOpen={Boolean(modalState)}
        onClose={() => setModalState(null)}
        title={modalState?.mode === "add" ? "Add Milestone" : "Edit Milestone"}
        size="sm"
      >
        {modalState && (
          <div className="space-y-4">
            <FormInput
              label="Milestone Name"
              requiredMark
              name="name"
              value={modalState.form.name}
              onChange={(event) =>
                handleModalFieldChange({ name: event.target.value })
              }
              placeholder="e.g. UAT Completion"
            />
            <FormInput
              label="Amount"
              requiredMark
              name="amount"
              type="number"
              value={modalState.form.amount}
              onChange={(event) =>
                handleModalFieldChange({ amount: event.target.value })
              }
              placeholder="e.g. 1200000"
            />
            <FormDatePicker
              label="Due Date"
              name="dueDate"
              value={modalState.form.dueDate}
              onChange={(event) =>
                handleModalFieldChange({ dueDate: event.target.value })
              }
            />
            {modalState.mode === "edit" && (
              <FormSelect
                anchorOptions
                label="Status"
                name="status"
                value={modalState.form.status}
                onChange={(event) =>
                  handleModalFieldChange({ status: event.target.value })
                }
                options={MILESTONE_STATUS_OPTIONS}
              />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalState(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!isModalFormValid}
                onClick={handleModalSave}
              >
                Save Milestone
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="Remove Milestone"
        message={
          deleteTarget
            ? `Remove milestone "${deleteTarget.name}"? This cannot be undone.`
            : ""
        }
        confirmText="Remove"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

// Recurring billing configuration (BillingRecurringConfiguration, via
// /api/billing-recurring). Billing Frequency itself (durationValue +
// durationUnit, chosen via the shared Billing Frequency selector above)
// determines the recurring period — there is no separate Pricing Model for
// Recurring, and no hardcoded MONTHLY/QUARTERLY/ANNUALLY branching here.
//
// contractValue is the TOTAL recurring budget for the effective period (never
// a per-occurrence amount) — mirrors Fixed Price's Budget Source model:
// Project Budget (contractValueSource "PMS", seeded read-only from the
// project's PMS budget) or Manual (a freely-typed total). A Product/Service
// configuration has no project, so it is always Manual. Occurrence count and
// per-period amounts are derived by the backend (never the frontend) from
// this total, Billing Frequency, and Effective From/To.
function RecurringBillingForm({
  value = {},
  onChange,
  currency,
  billingContext,
  productName,
  productDescription,
  projectBudget,
  billingFrequencyId,
  billingFrequencyOptions = [],
  billingFrequencyOption,
  billingConfigurationId,
  ensureBillingConfigurationId,
  projectStartDate,
  projectEndDate,
}) {
  const update = (patch) => onChange({ ...value, ...patch });
  const isProductService = billingContext === "PRODUCT_SERVICE";
  const contractValueSource = value.contractValueSource || (isProductService ? "MANUAL" : "PMS");
  const isPmsSource = contractValueSource === "PMS";
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [schedule, setSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const fetchedRef = useRef(false);

  // Renewal — manual only (SAME_AS_PREVIOUS or CUSTOM), never automatic.
  const [showRenewalPanel, setShowRenewalPanel] = useState(false);
  const [renewalMode, setRenewalMode] = useState("SAME_AS_PREVIOUS");
  const [renewalEffectiveFrom, setRenewalEffectiveFrom] = useState("");
  const [renewalEffectiveTo, setRenewalEffectiveTo] = useState("");
  const [renewalContractValue, setRenewalContractValue] = useState("");
  const [renewalBillingFrequencyId, setRenewalBillingFrequencyId] = useState("");
  const [renewalRemarks, setRenewalRemarks] = useState("");
  const [renewing, setRenewing] = useState(false);
  const [renewalHistory, setRenewalHistory] = useState([]);
  const [loadingRenewalHistory, setLoadingRenewalHistory] = useState(false);
  const [showRenewalHistory, setShowRenewalHistory] = useState(false);

  // Seeds contractValue/contractValueSource from the project's PMS budget the
  // first time this form has neither set — mirrors FixedPriceForm's seed
  // effect so Project Budget is the sensible default for a new configuration.
  // Product/Service has no project, so it never seeds and stays Manual.
  useEffect(() => {
    if (isProductService) return;
    if (value.contractValue || value.contractValueSource) return;
    if (projectBudget === "" || projectBudget === null || projectBudget === undefined) return;
    update({ contractValue: projectBudget, contractValueSource: "PMS" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectBudget, isProductService]);

  // Fetches backend-calculated schedule preview for Recurring via
  // POST /api/billing-configurations/preview-schedule. contractValue here is
  // the TOTAL recurring budget for the effective period — the backend derives
  // and distributes the per-period amounts from it, the frontend never does.
  const loadSchedulePreview = async (overrideValues) => {
    const current = overrideValues || value;
    const freqId =
      billingFrequencyId ||
      billingFrequencyOption?.billingFrequencyId ||
      billingFrequencyOption?.id;
    const amount = Number(current.contractValue);
    const effFrom =
      toDateOnly(current.recurringStartDate || current.effectiveFrom) || "";
    const effTo =
      toDateOnly(current.recurringEndDate || current.effectiveTo) || "";

    if (!freqId || !amount || !effFrom || !effTo) {
      return;
    }

    setLoadingSchedule(true);
    setScheduleError("");
    try {
      const periods = await previewBillingSchedule({
        billingType: "RECURRING",
        billingFrequencyId: freqId,
        effectiveFrom: effFrom,
        effectiveTo: effTo,
        contractValue: amount,
      });
      setSchedule(periods);
    } catch (error) {
      const errorMsg = getApiErrorMessage(error, "Unable to generate billing schedule preview.");
      setScheduleError(errorMsg);
      showStatusToast(errorMsg, "error");
      setSchedule([]);
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Project dates can arrive as a full timestamp depending on which backend
  // lookup supplied them; the date input's min/max (and every comparison
  // below) need a plain yyyy-mm-dd, so normalize once up front — otherwise
  // the project's own start/end date can be misread as outside its duration.
  // A Product/Service configuration has no project, so these are always
  // blank in that case and every bound below becomes a no-op.
  const projectStartDateOnly = isProductService ? "" : toDateOnly(projectStartDate);
  const projectEndDateOnly = isProductService ? "" : toDateOnly(projectEndDate);

  const billingFrequencyLabel = billingFrequencyOption
    ? formatBillingFrequencyLabel({
        durationValue: billingFrequencyOption.durationValue,
        durationUnit: billingFrequencyOption.durationUnit,
        billingFrequencyName: billingFrequencyOption.label,
      })
    : "";

  // Fetches the backend-generated schedule for this recurring configuration —
  // the periods/amounts shown in the "Billing Schedule (Preview)" table always
  // come from here, never from a frontend calculation.
  const loadSchedule = async (recurringConfigurationId, billingConfigId) => {
    if (!recurringConfigurationId && !billingConfigId) {
      setSchedule([]);
      return;
    }
    setLoadingSchedule(true);
    try {
      const periods = recurringConfigurationId
        ? await getBillingRecurringSchedule(recurringConfigurationId)
        : await getBillingRecurringScheduleByBillingConfigurationId(billingConfigId);
      setSchedule(periods);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Unable to load billing schedule."), "error");
      setSchedule([]);
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Load the existing recurring configuration (and its generated schedule)
  // when editing a Recurring configuration — fetched once per
  // billingConfigurationId (mirrors FixedPriceForm below).
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!billingConfigurationId || fetchedRef.current) return;
      fetchedRef.current = true;

      setLoadingConfig(true);
      try {
        const record = await getBillingRecurringByBillingConfigurationId(billingConfigurationId);
        if (!mounted || !record) return;
        update(normalizeRecurringConfig(record));
        const recurringConfigurationId = record.recurringConfigurationId || record.subscriptionConfigurationId || record.id;
        if (recurringConfigurationId) await loadSchedule(recurringConfigurationId, billingConfigurationId);
      } catch (error) {
        showStatusToast(
          getApiErrorMessage(error, "Unable to load recurring billing configuration."),
          "error",
        );
      } finally {
        if (mounted) setLoadingConfig(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingConfigurationId]);

  const loadRenewalHistory = async (recurringConfigurationId) => {
    if (!recurringConfigurationId) return;
    setLoadingRenewalHistory(true);
    try {
      const history = await getBillingRecurringRenewalHistory(recurringConfigurationId);
      setRenewalHistory(history);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Unable to load renewal history."), "error");
    } finally {
      setLoadingRenewalHistory(false);
    }
  };

  // Opens the renewal action panel, seeding it from the current configuration
  // so "Same as Previous" has a sensible Effective From to start with.
  const openRenewalPanel = () => {
    setRenewalMode("SAME_AS_PREVIOUS");
    setRenewalEffectiveFrom("");
    setRenewalEffectiveTo("");
    setRenewalContractValue(value.contractValue ?? "");
    setRenewalBillingFrequencyId(billingFrequencyOption?.billingFrequencyId || "");
    setRenewalRemarks("");
    setShowRenewalPanel(true);
  };

  const dateErrors = getRecurringDateErrors({
    recurringStartDate: value.recurringStartDate,
    recurringEndDate: value.recurringEndDate,
    projectStartDate: projectStartDateOnly,
    projectEndDate: projectEndDateOnly,
  });

  const displaySchedule = schedule;

  // Client-side display estimate only (never sent to the backend, never
  // editable) — the authoritative occurrence count/amounts always come from
  // displaySchedule once the backend has generated it.
  const estimatedOccurrenceCount = countRecurringOccurrences({
    effectiveFrom: value.recurringStartDate,
    effectiveTo: value.recurringEndDate,
    durationValue: billingFrequencyOption?.durationValue,
    durationUnit: billingFrequencyOption?.durationUnit,
  });
  const occurrenceCount = displaySchedule.length || estimatedOccurrenceCount;
  const scheduleTotal = displaySchedule.reduce((sum, period) => sum + (Number(period.billingAmount) || 0), 0);
  // contractValue is the TOTAL recurring budget for the period, not a
  // per-occurrence amount — the estimate fallback (before the backend
  // schedule has loaded) is simply that total, never multiplied by occurrences.
  const totalRecurringValue = displaySchedule.length > 0 ? scheduleTotal : Number(value.contractValue || 0);

  // Fires only when the user actually picks a complete date (native <input
  // type="date"> onChange never fires while browsing calendar months, only
  // once a full date is selected) — so no error ever appears mid-navigation.
  // min/max on the input already gray out invalid dates in the native
  // calendar; this is the fallback for pickers/browsers that don't strictly
  // enforce that, flagging an out-of-range pick via toast in addition to the
  // inline error already shown under the field, rather than silently
  // reverting it with no feedback.
  const handleDateFieldChange = (field, label, dateValue) => {
    update({ [field]: dateValue });
    const normalizedValue = toDateOnly(dateValue);
    if (
      normalizedValue &&
      ((projectStartDateOnly && normalizedValue < projectStartDateOnly) ||
        (projectEndDateOnly && normalizedValue > projectEndDateOnly))
    ) {
      showStatusToast(
        `${label} is outside the project duration (${formatDisplayDate(projectStartDateOnly)} – ${formatDisplayDate(
          projectEndDateOnly,
        )}).`,
        "error",
      );
    }
  };

  const contractValueIsBlank =
    value.contractValue === "" || value.contractValue === null || value.contractValue === undefined;
  const contractValueNum = Number(value.contractValue);
  const contractValueError = !contractValueIsBlank
    ? Number.isNaN(contractValueNum) || contractValueNum <= 0
      ? "Manual Budget must be greater than 0."
      : ""
    : "";
  const projectBudgetIsBlank =
    projectBudget === "" ||
    projectBudget === null ||
    projectBudget === undefined ||
    Number.isNaN(Number(projectBudget)) ||
    Number(projectBudget) <= 0;

  // Persists the complete recurring billing configuration — billing context,
  // product details, the total recurring budget (Project Budget or Manual),
  // billing frequency, and effective dates — and then refreshes the schedule
  // preview from the backend. The frontend never derives periods/amounts
  // itself, so every change to frequency, dates, or amount must round-trip
  // through this save before the preview can reflect it.
  //
  // Every field this needs is validated here, up front, so clicking Save with
  // incomplete information always surfaces a clear, specific toast — never a
  // raw backend validation error from a request that should never have been sent.
  const saveRecurringConfig = async () => {
    if (isPmsSource) {
      if (projectBudgetIsBlank) {
        showStatusToast("Project Budget is not available for the selected project.", "error");
        return;
      }
    } else {
      if (contractValueIsBlank) {
        showStatusToast("Manual Budget is required before saving.", "error");
        return;
      }
      if (contractValueError) {
        showStatusToast(contractValueError, "error");
        return;
      }
    }
    if (!billingFrequencyOption?.billingFrequencyId) {
      showStatusToast("Select a Billing Frequency before saving.", "error");
      return;
    }
    if (!value.recurringStartDate || !value.recurringEndDate) {
      showStatusToast("Effective From and Effective To are required.", "error");
      return;
    }
    if (hasRecurringDateErrors(dateErrors)) {
      showStatusToast("Please fix the highlighted date errors before saving.", "error");
      return;
    }
    if (!billingConfigurationId) {
      showStatusToast(
        "Unable to save recurring configuration: billing configuration id is missing. Please reload and try again.",
        "error",
      );
      return;
    }

    setSaving(true);
    try {
      // The parent billing configuration's draft may have been created before
      // Billing Frequency was selected (it's auto-created as soon as Billing
      // Type is known), so it can still be missing billingFrequencyId here.
      // Re-sync the parent with the current selection first — the Recurring
      // API requires billingFrequencyId to already be set on it.
      let resolvedConfigId = billingConfigurationId;
      if (ensureBillingConfigurationId) {
        const syncedId = await ensureBillingConfigurationId();
        if (syncedId) resolvedConfigId = syncedId;
      }

      const payload = buildRecurringRequestPayload(
        { ...value, billingContext, productName, productDescription, contractValueSource },
        billingFrequencyOption.billingFrequencyId,
      );

      // value.recurringConfigurationId can still be unset here if the
      // wizard's own load effect (above) hasn't resolved yet — re-check the
      // backend directly so an existing record is updated, never duplicated.
      let existingId = value.recurringConfigurationId;
      if (!existingId) {
        const existingRecord = await getBillingRecurringByBillingConfigurationId(resolvedConfigId);
        existingId = existingRecord?.recurringConfigurationId || existingRecord?.subscriptionConfigurationId || existingRecord?.id || null;
      }

      const saved = existingId
        ? await updateBillingRecurring(existingId, payload)
        : await createBillingRecurring(resolvedConfigId, payload);
      const savedId = saved?.recurringConfigurationId || saved?.subscriptionConfigurationId || saved?.id || existingId;

      update({ recurringConfigurationId: savedId || value.recurringConfigurationId || null });
      showStatusToast("Recurring configuration saved.", "success");
      await loadSchedulePreview();
    } catch (error) {
      showStatusToast(
        getApiErrorMessage(error, "Unable to save recurring configuration."),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const requestRemoveRecurring = () => {
    if (!value.recurringConfigurationId) {
      onChange({});
      setSchedule([]);
      setScheduleError("");
      return;
    }
    setConfirmingDelete(true);
  };

  const removeRecurring = async () => {
    setDeleting(true);
    try {
      await deleteBillingRecurring(value.recurringConfigurationId);
      onChange({});
      setSchedule([]);
      setScheduleError("");
      showStatusToast("Recurring configuration removed.", "success");
      setConfirmingDelete(false);
    } catch (error) {
      showStatusToast(
        getApiErrorMessage(error, "Unable to remove recurring configuration."),
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  // POST /api/billing-recurring/{recurringConfigurationId}/renew — a
  // deliberate Maker action, never automatic. SAME_AS_PREVIOUS only needs a
  // new Effective From (the renewed term reuses the current amount/frequency,
  // extended for the same duration); CUSTOM also lets the Maker override the
  // commercial terms for the renewed period.
  const submitRenewal = async () => {
    if (!value.recurringConfigurationId) return;
    if (!renewalEffectiveFrom) {
      showStatusToast("Effective From is required to renew.", "error");
      return;
    }
    if (renewalMode === "CUSTOM") {
      if (!renewalEffectiveTo) {
        showStatusToast("Effective To is required for a custom renewal.", "error");
        return;
      }
      if (renewalContractValue === "" || Number(renewalContractValue) <= 0) {
        showStatusToast("Recurring Amount must be greater than 0 for a custom renewal.", "error");
        return;
      }
      if (!renewalBillingFrequencyId) {
        showStatusToast("Select a Billing Frequency for a custom renewal.", "error");
        return;
      }
    }

    setRenewing(true);
    try {
      const payload = {
        renewalMode,
        effectiveFrom: toDateOnly(renewalEffectiveFrom) || renewalEffectiveFrom,
        remarks: renewalRemarks || "",
        ...(renewalMode === "CUSTOM"
          ? {
              effectiveTo: toDateOnly(renewalEffectiveTo) || renewalEffectiveTo,
              contractValue: Number(renewalContractValue),
              billingFrequencyId: renewalBillingFrequencyId,
            }
          : {}),
      };
      await renewBillingRecurring(value.recurringConfigurationId, payload);
      // Persist the chosen renewal mode/terms onto the base recurring record
      // too, so the next Save/Update reflects it instead of nulling it out
      // (see buildRecurringRequestPayload's RENEWAL_MODE_TO_API mapping).
      update({
        renewalMode,
        renewalEffectiveFrom,
        ...(renewalMode === "CUSTOM"
          ? { renewalContractValue, renewalBillingFrequencyId }
          : {}),
      });
      showStatusToast("Recurring configuration renewed.", "success");
      setShowRenewalPanel(false);
      await Promise.all([
        loadSchedule(value.recurringConfigurationId, billingConfigurationId),
        loadRenewalHistory(value.recurringConfigurationId),
      ]);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Unable to renew recurring configuration."), "error");
    } finally {
      setRenewing(false);
    }
  };

  const toggleRenewalHistory = () => {
    const next = !showRenewalHistory;
    setShowRenewalHistory(next);
    if (next && renewalHistory.length === 0) {
      loadRenewalHistory(value.recurringConfigurationId);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className={Fonts.heading4}>Recurring Billing Configuration</h2>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        {isProductService && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Product / Application / Service:</span>{" "}
            {productName || "—"}
            {productDescription && <p className="mt-1 text-slate-500">{productDescription}</p>}
          </div>
        )}

        {!isProductService && (
          <EnterpriseBudgetSourceSelector
            value={contractValueSource}
            onChange={(nextSource) => {
              if (nextSource === "PMS") {
                update({ contractValueSource: "PMS", contractValue: projectBudget || "" });
              } else {
                update({ contractValueSource: "MANUAL" });
              }
            }}
            projectBudget={projectBudget}
            currency={currency}
            sourceLabel="Budget Source:"
            manualLabel="Manual Budget"
          />
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            {isPmsSource ? (
              <>
                <label className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
                  Project Budget
                  <ContractValueSourceBadge source="PMS" />
                </label>
                <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900">
                  {projectBudgetIsBlank ? "Not available" : formatCurrency(projectBudget, currency)}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {projectBudgetIsBlank
                    ? "Project Budget is not available for the selected project."
                    : "Read-only — total budget for the selected recurring period."}
                </p>
              </>
            ) : (
              <>
                <IndianAmountInput
                  label="Manual Budget"
                  requiredMark
                  name="contractValue"
                  value={value.contractValue ?? ""}
                  onChange={(nextValue) => update({ contractValue: nextValue, contractValueSource: "MANUAL" })}
                  placeholder={`e.g. 300000 (${currency})`}
                  error={contractValueError}
                />
                <p className="mt-1 text-xs text-slate-400">Total budget for the selected recurring period.</p>
              </>
            )}
          </div>

          <div>
            <FormInput
              label="Billing Frequency"
              name="recurringBillingFrequencyDisplay"
              value={billingFrequencyLabel || "—"}
              readOnly
            />
          </div>

          <div>
            <FormDatePicker
              label="Effective From"
              requiredMark
              name="recurringStartDate"
              value={value.recurringStartDate || ""}
              onChange={(e) =>
                handleDateFieldChange(
                  "recurringStartDate",
                  "Effective From",
                  e.target.value,
                )
              }
              min={projectStartDateOnly || undefined}
              max={projectEndDateOnly || undefined}
              error={dateErrors.recurringStartDate}
            />
          </div>

          <div>
            <FormDatePicker
              label="Effective To"
              requiredMark
              name="recurringEndDate"
              value={value.recurringEndDate || ""}
              onChange={(e) =>
                handleDateFieldChange(
                  "recurringEndDate",
                  "Effective To",
                  e.target.value,
                )
              }
              min={projectStartDateOnly || undefined}
              max={projectEndDateOnly || undefined}
              error={dateErrors.recurringEndDate}
            />
          </div>

          <div className="md:col-span-2">
            <FormTextArea
              label="Remarks"
              name="recurringRemarks"
              value={value.remarks || ""}
              onChange={(e) => update({ remarks: e.target.value })}
              placeholder="Any additional notes about this recurring billing setup"
              rows={3}
            />
          </div>
        </div>

        {loadingConfig ? (
          <p className="text-sm text-slate-500">Loading saved recurring configuration…</p>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="small"
              onClick={saveRecurringConfig}
              loading={saving}
              loadingText="Saving..."
            >
              <Check className="h-4 w-4" />
              {value.recurringConfigurationId
                ? "Update Recurring Configuration"
                : "Save Recurring Configuration"}
            </Button>
            {value.recurringConfigurationId && (
              <Button
                variant="ghost"
                size="small"
                onClick={requestRemoveRecurring}
                loading={deleting}
                loadingText="Removing..."
              >
                <Trash2 className="h-4 w-4 text-red-500" /> Remove Recurring Configuration
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Billing Schedule (Preview)</h3>
          <span className="text-xs text-slate-400">Generated by the system — not editable.</span>
        </div>

        {loadingSchedule ? (
          <p className="text-sm text-slate-500">Loading billing schedule…</p>
        ) : scheduleError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
            {scheduleError}
          </p>
        ) : displaySchedule.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-500">
            No billing schedule has been generated yet.
          </p>
        ) : (
          <div className="max-h-96 w-full overflow-y-auto overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full table-fixed divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-1/6 px-3 py-2.5 text-left align-middle font-semibold text-slate-600">Period</th>
                  <th className="w-1/6 px-3 py-2.5 text-left align-middle font-semibold text-slate-600">From</th>
                  <th className="w-1/6 px-3 py-2.5 text-left align-middle font-semibold text-slate-600">To</th>
                  <th className="w-1/6 px-3 py-2.5 text-left align-middle font-semibold text-slate-600">Amount</th>
                  <th className="w-1/6 px-3 py-2.5 text-left align-middle font-semibold text-slate-600">Partial Period</th>
                  <th className="w-1/6 px-3 py-2.5 text-center align-middle font-semibold text-slate-600">Invoiced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displaySchedule.map((period, index) => (
                  <tr key={period.periodNumber ?? index}>
                    <td className="px-3 py-2.5 text-left align-middle text-slate-700">
                      Period {period.periodNumber ?? index + 1}
                    </td>
                    <td className="px-3 py-2.5 text-left align-middle text-slate-700">
                      {formatDisplayDate(period.periodStartDate)}
                    </td>
                    <td className="px-3 py-2.5 text-left align-middle text-slate-700">
                      {formatDisplayDate(period.periodEndDate)}
                    </td>
                    <td className="px-3 py-2.5 text-left align-middle font-medium text-slate-900">
                      {period.billingAmount || period.billingAmount === 0
                        ? formatCurrency(period.billingAmount, currency)
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-left align-middle text-slate-700">
                      {period.isPartialPeriod ? "Yes" : "No"}
                    </td>
                    <td className="px-3 py-2.5 text-center align-middle">
                      <StatusBadge label={period.isInvoiced ? "Invoiced" : "Pending"} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-sm font-semibold text-slate-900">
            {occurrenceCount > 0 ? `${occurrenceCount} Occurrence${occurrenceCount === 1 ? "" : "s"} — Total` : "Total"}
          </span>
          <span className="text-sm font-semibold text-slate-900">
            {totalRecurringValue ? formatCurrency(totalRecurringValue, currency) : "—"}
          </span>
        </div>
      </div>

      {/* Renewal is a Subscription (Product/Service) concept only — a
          project-based Recurring configuration runs for the project's own
          duration and is never "renewed" the way a standalone subscription
          is, so this entire section is hidden for billingContext PROJECT. */}
      {isProductService && value.recurringConfigurationId && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Renewal</h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="small" onClick={toggleRenewalHistory}>
                {showRenewalHistory ? "Hide Renewal History" : "View Renewal History"}
              </Button>
              {!showRenewalPanel && (
                <Button variant="outline" size="small" onClick={openRenewalPanel}>
                  Renew Configuration
                </Button>
              )}
            </div>
          </div>

          {showRenewalHistory && (
            <div className="rounded-lg border border-slate-100">
              {loadingRenewalHistory ? (
                <p className="p-4 text-center text-sm text-slate-500">Loading renewal history…</p>
              ) : renewalHistory.length === 0 ? (
                <p className="p-4 text-center text-sm text-slate-500">No renewals recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Mode</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">New Effective Period</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Amount</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Renewed On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {renewalHistory.map((entry, index) => (
                        <tr key={entry.renewalId ?? index}>
                          <td className="px-3 py-2 text-slate-700">
                            {entry.renewalMode === "CUSTOM" ? "Custom" : "Same as Previous"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {formatDisplayDate(entry.newEffectiveFrom)} – {formatDisplayDate(entry.newEffectiveTo) || "Ongoing"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {entry.contractValue || entry.contractValue === 0 ? formatCurrency(entry.contractValue, currency) : "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{formatDisplayDate(entry.renewedAt) || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {showRenewalPanel && (
            <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4">
              <RadioCardGroup
                name="renewalMode"
                options={RECURRING_RENEWAL_MODE_OPTIONS}
                value={renewalMode}
                onChange={setRenewalMode}
                columns={2}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormDatePicker
                  label="New Effective From"
                  requiredMark
                  name="renewalEffectiveFrom"
                  value={renewalEffectiveFrom}
                  onChange={(e) => setRenewalEffectiveFrom(e.target.value)}
                  min={value.recurringEndDate || undefined}
                />

                {renewalMode === "CUSTOM" && (
                  <>
                    <FormDatePicker
                      label="New Effective To"
                      requiredMark
                      name="renewalEffectiveTo"
                      value={renewalEffectiveTo}
                      onChange={(e) => setRenewalEffectiveTo(e.target.value)}
                      min={renewalEffectiveFrom || undefined}
                    />
                    <FormInput
                      label="Total Budget"
                      requiredMark
                      name="renewalContractValue"
                      type="number"
                      min="0"
                      value={renewalContractValue}
                      onChange={(e) => setRenewalContractValue(e.target.value)}
                      placeholder={`e.g. 65000 (${currency})`}
                    />
                    <FormSelect
                      anchorOptions
                      label="Billing Frequency *"
                      name="renewalBillingFrequencyId"
                      value={renewalBillingFrequencyId}
                      onChange={(e) => setRenewalBillingFrequencyId(e.target.value)}
                      options={billingFrequencyOptions
                        .filter((option) => frequencyCode(option) !== "ONE_TIME")
                        .map((option) => ({ value: option.billingFrequencyId, label: option.label }))}
                    />
                  </>
                )}

                <div className="md:col-span-2">
                  <FormTextArea
                    label="Remarks"
                    name="renewalRemarks"
                    value={renewalRemarks}
                    onChange={(e) => setRenewalRemarks(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="primary" size="small" onClick={submitRenewal} loading={renewing} loadingText="Renewing...">
                  Confirm Renewal
                </Button>
                <Button variant="ghost" size="small" onClick={() => setShowRenewalPanel(false)} disabled={renewing}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmingDelete}
        title="Delete Recurring Configuration"
        message="Remove this recurring billing configuration? This cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={deleting}
        onCancel={() => !deleting && setConfirmingDelete(false)}
        onConfirm={removeRecurring}
      />
    </div>
  );
}

export default function BillingConfigurationStep({
  value = {},
  onChange,
  setupMode,
  projectInfo = {},
  onProjectInfoChange = () => {},
  ensureBillingConfigurationId,
}) {
  const isExisting = false; // Billing mode and rates are always configurable for new billing setups
  const billingType = value.billingType || "";
  const billingMode = value.billingMode || "";
  const billingFrequency = value.billingFrequency || "";
  const billingTypeId = value.billingTypeId || "";
  const billingFrequencyId = value.billingFrequencyId || "";
  const billingContext = projectInfo?.billingContext || "PROJECT";
  const isProductService = billingContext === "PRODUCT_SERVICE";
  const currency = String(
    projectInfo?.projectBudgetCurrency || projectInfo?.currency || "",
  )
    .trim()
    .toUpperCase();
  // A Product/Service configuration has no project at all, so there is no PMS
  // project budget to sync from regardless of projectSource.
  const isPmsSourced =
    !isProductService &&
    String(projectInfo?.projectSource || "ENTERPRISE").toUpperCase() ===
    "ENTERPRISE";
  const hasPmsBudget =
    isPmsSourced &&
    projectInfo?.projectBudget !== "" &&
    projectInfo?.projectBudget !== null &&
    projectInfo?.projectBudget !== undefined;
  const [activeBillingTypeOptions, setActiveBillingTypeOptions] = useState([]);
  const [activeBillingFrequencyOptions, setActiveBillingFrequencyOptions] =
    useState([]);
  const [loadingBillingData, setLoadingBillingData] = useState(true);
  const frequencyLabel = (val) =>
    activeBillingFrequencyOptions.find((option) => option.value === val)
      ?.label ||
    val ||
    "—";

  useEffect(() => {
    let isMounted = true;

    const loadBillingOptions = async () => {
      try {
        const [billingTypes, billingFrequencies] = await Promise.all([
          getActiveBillingTypes(),
          getActiveBillingFrequencies(),
        ]);

        if (!isMounted) return;

        const normalizedTypes = Array.isArray(billingTypes)
          ? billingTypes.map(normalizeBillingType).filter((type) => type.value)
          : [];
        const normalizedFrequencies = Array.isArray(billingFrequencies)
          ? billingFrequencies.filter((frequency) => frequency.value)
          : [];

        setActiveBillingTypeOptions(
          sortByOrder(normalizedTypes, BILLING_TYPE_ORDER),
        );
        setActiveBillingFrequencyOptions(normalizedFrequencies);
      } catch (error) {
        if (!isMounted) return;
        setActiveBillingTypeOptions([]);
        setActiveBillingFrequencyOptions([]);
        showStatusToast(
          getApiErrorMessage(
            error,
            "Failed to load billing types and frequencies.",
          ),
          "error",
        );
      } finally {
        if (isMounted) setLoadingBillingData(false);
      }
    };

    loadBillingOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const projectCurrencyCode = String(
      projectInfo.projectBudgetCurrency || projectInfo.currency || "",
    )
      .trim()
      .toUpperCase();
    if (
      !projectCurrencyCode ||
      (projectInfo.currency === projectCurrencyCode &&
        projectInfo.projectBudgetCurrency === projectCurrencyCode)
    ) {
      return;
    }

    onProjectInfoChange({
      ...projectInfo,
      currency: projectCurrencyCode,
      projectBudgetCurrency:
        projectInfo.projectBudgetCurrency || projectCurrencyCode,
    });
  }, [onProjectInfoChange, projectInfo]);

  const update = (patch) => onChange({ ...value, ...patch });
  const updateSection = (section, patch) => update({ [section]: patch });
  const pricingModelOptions = getPricingModelOptions(billingType);
  const frequencyOptions = getBillingFrequencyOptions(
    billingType,
    activeBillingFrequencyOptions,
  );
  // Milestone Plan has no recurring frequency at all — Installments is
  // billed on each entry's own date, not a single system-derived one, so the
  // Billing Frequency field relabels itself to "Billing Schedule" for it.
  const milestonePlanIsInstallments = (value.milestonePlan?.paymentStructure || "FULL_PAYMENT") === "INSTALLMENTS";
  // Product/Application/Service billing has no project, so T&M/Fixed
  // Price/Milestone (all project-scoped) never apply — only Recurring does.
  // Fixed Price is also hidden from the picker for every other context — it is
  // no longer offered for new configurations (superseded by Milestone Plan),
  // but an existing configuration already saved as Fixed Price must keep
  // showing/allowing it here so it stays viewable/editable.
  const billingTypeOptionsForContext = isProductService
    ? activeBillingTypeOptions.filter((type) => type.value === "RECURRING")
    : activeBillingTypeOptions.filter(
        (type) => type.value !== "FIXED_PRICE" || billingType === "FIXED_PRICE",
      );

  // Guards against a stale non-Recurring billing type left over from before
  // the user switched Billing Context to Product/Service on Step 1 (e.g. they
  // went back and changed it after already configuring Step 2).
  useEffect(() => {
    if (isProductService && billingType && billingType !== "RECURRING") {
      showStatusToast(
        "Product/Service billing only supports Recurring billing — please choose a Billing Type again.",
        "warning",
      );
      update({ billingType: "", billingTypeId: "", billingMode: "", timeAndMaterial: {}, fixedPrice: {}, milestones: [], milestoneSettings: {}, milestonePlan: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProductService, billingType]);

  // Milestone Plan is billed against explicit payment/installment dates, not a
  // recurring cadence — always force it to the master data's One-Time Billing
  // Frequency and never let the user pick Weekly/Monthly/etc. Re-runs (and
  // self-corrects) whenever billingType, the loaded frequency list, or the
  // current selection changes, so it also fixes a stale/incorrect value on an
  // existing loaded configuration, not just a fresh pill selection.
  useEffect(() => {
    if (billingType !== "MILESTONE_PLAN") return;
    const oneTimeFrequency = activeBillingFrequencyOptions.find(
      (option) => frequencyCode(option) === "ONE_TIME",
    );
    if (!oneTimeFrequency) return;
    const oneTimeId = oneTimeFrequency.billingFrequencyId || oneTimeFrequency.id;
    if (!oneTimeId || String(billingFrequencyId) === String(oneTimeId)) return;
    update({
      billingFrequency: oneTimeFrequency.value || "ONE_TIME",
      billingFrequencyId: oneTimeId,
      billingFrequencyName: oneTimeFrequency.label || oneTimeFrequency.billingFrequencyName || "One-Time",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingType, activeBillingFrequencyOptions, billingFrequencyId]);

  const handleBillingTypeChange = (nextId) => {
    const selectedOption = activeBillingTypeOptions.find(
      (type) => String(type.billingTypeId) === String(nextId),
    );
    if (!selectedOption) return;

    const normalizedBillingType = selectedOption.value;
    const mustChooseRecurringFrequency =
      normalizedBillingType === "RECURRING" && billingType !== "RECURRING";
    const nextPricingModels = getPricingModelOptions(normalizedBillingType);
    const nextBillingMode =
      nextPricingModels.length > 0 ? nextPricingModels[0].value : "";

    // Switching away from Fixed Price after it was already saved would otherwise leave
    // an orphaned fixed price record under this billing configuration.
    const staleFixedPriceId = value.fixedPrice?.fixedPriceConfigurationId;
    if (
      billingType === "FIXED_PRICE" &&
      normalizedBillingType !== "FIXED_PRICE" &&
      staleFixedPriceId
    ) {
      deleteFixedPriceConfiguration(staleFixedPriceId).catch((error) => {
        console.warn("Unable to remove previous fixed price configuration", error);
      });
    }

    // Same cleanup for Milestone Plan: switching away after it was already
    // saved would otherwise leave an orphaned milestone plan record.
    const staleMilestonePlanId = value.milestonePlan?.milestonePlanId;
    if (
      billingType === "MILESTONE_PLAN" &&
      normalizedBillingType !== "MILESTONE_PLAN" &&
      staleMilestonePlanId
    ) {
      deleteMilestonePlanConfiguration(staleMilestonePlanId).catch((error) => {
        console.warn("Unable to remove previous milestone plan configuration", error);
      });
    }

    // Same cleanup for Recurring: switching away after a recurring
    // configuration was already saved would otherwise leave an orphaned record.
    const staleRecurringId =
      value.recurring?.recurringConfigurationId || value.recurring?.subscriptionConfigurationId;
    if (
      billingType === "RECURRING" &&
      normalizedBillingType !== "RECURRING" &&
      staleRecurringId
    ) {
      deleteBillingRecurring(staleRecurringId).catch((error) => {
        console.warn("Unable to remove previous recurring billing configuration", error);
      });
    }

    update({
      billingType: normalizedBillingType,
      billingTypeId: selectedOption.billingTypeId,
      billingTypeLabel: selectedOption.label,
      billingMode: nextBillingMode,
      billingFrequency:
        normalizedBillingType === "RECURRING"
          ? mustChooseRecurringFrequency
            ? ""
            : value.billingFrequency || ""
          : "",
      billingFrequencyId:
        normalizedBillingType === "RECURRING"
          ? mustChooseRecurringFrequency
            ? ""
            : value.billingFrequencyId || ""
          : "",
      billingFrequencyName:
        normalizedBillingType === "RECURRING"
          ? mustChooseRecurringFrequency
            ? ""
            : value.billingFrequencyName || ""
          : "",
      timeAndMaterial:
        normalizedBillingType === "TIME_MATERIAL"
          ? value.timeAndMaterial || {}
          : {},
      fixedPrice:
        normalizedBillingType === "FIXED_PRICE" ? value.fixedPrice || {} : {},
      milestones:
        normalizedBillingType === "MILESTONE" ? value.milestones || [] : [],
      milestoneSettings:
        normalizedBillingType === "MILESTONE"
          ? value.milestoneSettings || {}
          : {},
      milestonePlan:
        normalizedBillingType === "MILESTONE_PLAN" ? value.milestonePlan || {} : {},
      recurring:
        normalizedBillingType === "RECURRING" ? value.recurring || {} : {},
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            {isProductService ? "Billing Currency" : "Project Financials"}
          </h3>
          {(isPmsSourced || hasPmsBudget) && <PmsSyncedBadge />}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isPmsSourced ? (
            <ReadOnlyField label="Billing Currency *" value={currency} />
          ) : (
            <FormSelect
              anchorOptions
              label="Billing Currency *"
              name="currency"
              value={currency}
              onChange={(e) =>
                onProjectInfoChange({
                  ...projectInfo,
                  currency: e.target.value,
                  projectBudgetCurrency: e.target.value,
                })
              }
              options={CURRENCY_OPTIONS}
            />
          )}

          {/* Project Budget is a project-level figure — it never applies to
              Product/Service billing (no project at all). It is shown for
              every project billing type, including Recurring, so Project
              Financials looks the same regardless of billing type. */}
          {!isProductService &&
            (hasPmsBudget ? (
              <ReadOnlyField
                label="Project Budget"
                value={formatCurrency(projectInfo.projectBudget, currency)}
              />
            ) : (
              <FormInput
                label="Project Budget"
                name="projectBudget"
                type="number"
                min="0"
                step="0.01"
                value={projectInfo.projectBudget ?? ""}
                onChange={(e) =>
                  onProjectInfoChange({
                    ...projectInfo,
                    projectBudget: e.target.value,
                  })
                }
                placeholder="e.g. 45678"
              />
            ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Billing Type <span className="text-red-500">*</span>
          </label>
          {loadingBillingData ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <PillSelectGroup
              name="billingTypeId"
              options={billingTypeOptionsForContext.map((type) => ({
                value: type.billingTypeId,
                label: type.label,
              }))}
              value={billingTypeId}
              onChange={handleBillingTypeChange}
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            {billingType === "MILESTONE_PLAN"
              ? milestonePlanIsInstallments
                ? "Billing Schedule"
                : "Billing Frequency"
              : (
                <>
                  Billing Frequency <span className="text-red-500">*</span>
                </>
              )}
          </label>
          {billingType === "MILESTONE_PLAN" ? (
            <div>
              <ReadOnlyField
                label=""
                value={milestonePlanIsInstallments ? "Custom Payment Dates" : value.billingFrequencyName || "One-Time"}
              />
              <p className="mt-1 text-xs text-slate-400">
                {milestonePlanIsInstallments
                  ? "Each installment carries its own billing date, set individually in the Milestone Plan below."
                  : "Milestone Plan billing is driven by the payment date, not a recurring frequency."}
              </p>
            </div>
          ) : (
            <PillSelectGroup
              name="billingFrequencyId"
              options={frequencyOptions.map((f) => ({
                value: f.billingFrequencyId,
                label: f.label,
              }))}
              value={billingFrequencyId}
              onChange={(next) => {
                const selectedFrequency = activeBillingFrequencyOptions.find(
                  (option) =>
                    String(option.billingFrequencyId) === String(next),
                );
                update({
                  billingFrequency: selectedFrequency?.value || "",
                  billingFrequencyId:
                    selectedFrequency?.billingFrequencyId ||
                    selectedFrequency?.id ||
                    "",
                  billingFrequencyName:
                    selectedFrequency?.label ||
                    selectedFrequency?.billingFrequencyName ||
                    "",
                });
              }}
            />
          )}
        </div>
      </div>

      {!isExisting && pricingModelOptions.length > 0 && (
        <div className="space-y-3 pt-5 border-t border-slate-100">
          <h3 className={Fonts.subheading}>Pricing Model</h3>

          <RadioCardGroup
            name="billingMode"
            options={pricingModelOptions}
            value={billingMode || ""}
            onChange={(next) => update({ billingMode: next })}
            columns={2}
          />
        </div>
      )}

      {billingType !== "" ? (
        <div className="space-y-3 pt-5 border-t border-slate-100">
          <h3 className={Fonts.subheading}>Rate Details</h3>
          <div>
            {billingType === "TIME_MATERIAL" && (
              <TimeAndMaterialForm
                value={value.timeAndMaterial}
                onChange={(next) => updateSection("timeAndMaterial", next)}
                billingMode={billingMode}
                currency={currency}
                isExisting={isExisting}
                billingConfigurationId={
                  value.billingConfigurationId || value.id
                }
                ensureBillingConfigurationId={ensureBillingConfigurationId}
                billingConfigurationPayload={{
                  ...value,
                  projectInfo,
                  billingConfig: value,
                }}
                billingFrequency={billingFrequency}
                projectStartDate={projectInfo.startDate}
                projectEndDate={projectInfo.endDate}
              />
            )}

            {billingType === "FIXED_PRICE" && (
              <FixedPriceForm
                value={value.fixedPrice}
                onChange={(next) => updateSection("fixedPrice", next)}
                currency={currency}
                projectBudget={projectInfo.projectBudget}
                billingFrequency={billingFrequency}
                billingFrequencyId={billingFrequencyId}
                billingFrequencyLabel={frequencyLabel(billingFrequency)}
                billingFrequencyOption={activeBillingFrequencyOptions.find(
                  (option) => String(option.billingFrequencyId) === String(billingFrequencyId),
                )}
                billingConfigurationId={value.billingConfigurationId || value.id}
                ensureBillingConfigurationId={ensureBillingConfigurationId}
                projectStartDate={projectInfo.startDate}
                projectEndDate={projectInfo.endDate}
              />
            )}

            {billingType === "MILESTONE" && (
              <MilestoneForm
                milestones={value.milestones}
                settings={value.milestoneSettings}
                onMilestonesChange={(next) => update({ milestones: next })}
                onSettingsChange={(next) => update({ milestoneSettings: next })}
                currency={currency}
              />
            )}

            {billingType === "MILESTONE_PLAN" && (
              <MilestonePlanForm
                value={value.milestonePlan}
                onChange={(next) => updateSection("milestonePlan", next)}
                currency={currency}
                projectBudget={projectInfo.projectBudget}
                billingConfigurationId={value.billingConfigurationId || value.id}
                ensureBillingConfigurationId={ensureBillingConfigurationId}
                projectInfo={projectInfo}
              />
            )}

            {billingType === "RECURRING" && (
              <RecurringBillingForm
                value={value.recurring || {}}
                onChange={(next) => updateSection("recurring", next)}
                currency={currency}
                billingContext={billingContext}
                productName={projectInfo.productName}
                productDescription={projectInfo.productDescription}
                projectBudget={isProductService ? null : projectInfo.projectBudget}
                billingFrequencyId={billingFrequencyId}
                billingFrequencyOptions={activeBillingFrequencyOptions}
                billingFrequencyOption={activeBillingFrequencyOptions.find(
                  (option) => String(option.billingFrequencyId) === String(billingFrequencyId),
                )}
                billingConfigurationId={value.billingConfigurationId || value.id}
                ensureBillingConfigurationId={ensureBillingConfigurationId}
                projectStartDate={isProductService ? "" : projectInfo.startDate}
                projectEndDate={isProductService ? "" : projectInfo.endDate}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
