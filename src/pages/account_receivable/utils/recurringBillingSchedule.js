// Client-side helpers for the Recurring/Fixed Price Billing Configuration
// wizard steps.
//
// Billing periods/amounts are still ultimately owned by the backend once a
// configuration is saved — the backend's generated BillingSchedule (see
// getBillingRecurringSchedule / getBillingRecurringScheduleByBillingConfigurationId
// in billingConfigurationService.js) remains the source of truth and, once
// available, is what the "Billing Schedule (Preview)" table displays.
// Before that exists (or for Fixed Price, which has no backend schedule
// endpoint at all), computeBillingSchedulePreview below derives the same
// preview purely from the current, unsaved form state (Billing Frequency's
// durationValue/durationUnit, Effective From/To, and the Contract Value) so
// the preview updates immediately as those fields change, without creating
// any billing_schedule records.

import { formatDisplayDate } from "./format";

// Reduces any date-ish string to its plain yyyy-mm-dd date part. Project
// dates can arrive as a full ISO timestamp (e.g. "2026-08-05T00:00:00.000Z")
// depending on which backend lookup supplied them, while the date picker's
// value is always plain "yyyy-mm-dd" — comparing those two forms lexically
// makes an exact boundary date (the project's own start/end date) look like
// it falls outside the project duration, even though it doesn't. Normalizing
// both sides to date-only here keeps this validation correct regardless of
// the format upstream data happens to arrive in.
export const toDateOnly = (value) => {
  if (!value) return "";
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
};

// Dates are compared as plain yyyy-mm-dd strings (see toDateOnly above), so
// lexical comparison is equivalent to chronological comparison. Field names
// mirror the backend's RecurringBillingRequestDto (recurringStartDate/
// recurringEndDate).
export function getRecurringDateErrors({
  recurringStartDate,
  recurringEndDate,
  projectStartDate,
  projectEndDate,
}) {
  const errors = { recurringStartDate: "", recurringEndDate: "" };

  const startDate = toDateOnly(recurringStartDate);
  const endDate = toDateOnly(recurringEndDate);
  const projStart = toDateOnly(projectStartDate);
  const projEnd = toDateOnly(projectEndDate);
  const projectRange = `${formatDisplayDate(projStart)} – ${formatDisplayDate(projEnd)}`;

  // Boundary dates are valid — the project's own start/end date is always a
  // permitted Billing Start/End Date, so these are strict < / > comparisons
  // (an exact match on the boundary never triggers the error).
  if (startDate && projStart && startDate < projStart) {
    errors.recurringStartDate = `Billing Start Date is outside the project duration (${projectRange}).`;
  } else if (startDate && projEnd && startDate > projEnd) {
    errors.recurringStartDate = `Billing Start Date is outside the project duration (${projectRange}).`;
  }

  if (endDate && projEnd && endDate > projEnd) {
    errors.recurringEndDate = `Billing End Date is outside the project duration (${projectRange}).`;
  } else if (endDate && projStart && endDate < projStart) {
    errors.recurringEndDate = `Billing End Date is outside the project duration (${projectRange}).`;
  }

  if (!errors.recurringEndDate && startDate && endDate && startDate > endDate) {
    errors.recurringEndDate = "Billing End Date must be on or after the Billing Start Date.";
  }

  return errors;
}

export const hasRecurringDateErrors = (errors) =>
  Boolean(errors?.recurringStartDate || errors?.recurringEndDate);

function parseDateOnly(value) {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return null;
  const date = new Date(`${dateOnly}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateOnlyString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Steps a date forward by the Billing Frequency's own durationValue/
// durationUnit (never a hardcoded MONTHLY/QUARTERLY/ANNUALLY branch) — mirrors
// the unit handling already used by formatBillingFrequencyLabel in
// billingConfigurationService.js. Returns null for a unit this preview
// doesn't recognize, so the caller can fall back to "no schedule" instead of
// guessing.
function addDuration(date, durationValue, durationUnit) {
  const unit = String(durationUnit || "").trim().toUpperCase();
  const next = new Date(date.getTime());
  if (unit === "MONTHS") {
    next.setMonth(next.getMonth() + durationValue);
  } else if (unit === "YEARS") {
    next.setFullYear(next.getFullYear() + durationValue);
  } else if (unit === "WEEKS") {
    next.setDate(next.getDate() + durationValue * 7);
  } else if (unit === "DAYS") {
    next.setDate(next.getDate() + durationValue);
  } else {
    return null;
  }
  return next;
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

// Derives the "Billing Schedule (Preview)" periods/amounts entirely on the
// frontend, from the current (possibly unsaved) form state — used by both
// the Fixed Price and Recurring billing forms in BillingConfigurationStep.jsx
// so this logic exists in exactly one place. No billing_schedule record is
// created or read here; this is purely a display calculation.
//
// Periods step forward from effectiveFrom by durationValue/durationUnit
// until effectiveTo is reached, with the final period's end date capped at
// effectiveTo (marking it isPartialPeriod when that cap actually shortened
// it). The Contract Value is split evenly across the resulting periods, with
// any rounding remainder folded into the last period so the sum of all
// period amounts always equals the Contract Value exactly.
export function computeBillingSchedulePreview({
  effectiveFrom,
  effectiveTo,
  contractValue,
  durationValue,
  durationUnit,
} = {}) {
  const startDate = parseDateOnly(effectiveFrom);
  const endDate = parseDateOnly(effectiveTo);
  const totalAmount = Number(contractValue);
  const stepValue = Number(durationValue);

  if (!startDate || !endDate || startDate > endDate) return [];
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return [];
  if (!Number.isFinite(stepValue) || stepValue <= 0 || !durationUnit) return [];

  const rawPeriods = [];
  let cursorStart = startDate;
  // Backstop against a pathological step producing an unbounded loop — no
  // real billing frequency needs anywhere near this many periods.
  let guard = 0;
  while (cursorStart <= endDate && guard < 1000) {
    guard += 1;
    const naturalNextStart = addDuration(cursorStart, stepValue, durationUnit);
    if (!naturalNextStart) return [];

    const naturalPeriodEnd = addDays(naturalNextStart, -1);
    const cappedPeriodEnd = naturalPeriodEnd > endDate ? endDate : naturalPeriodEnd;

    rawPeriods.push({
      periodStartDate: toDateOnlyString(cursorStart),
      periodEndDate: toDateOnlyString(cappedPeriodEnd),
      isPartialPeriod: cappedPeriodEnd.getTime() !== naturalPeriodEnd.getTime(),
    });

    cursorStart = naturalNextStart;
  }

  if (rawPeriods.length === 0) return [];

  const periodCount = rawPeriods.length;
  const evenShare = Math.round((totalAmount / periodCount) * 100) / 100;
  const lastShare = Math.round((totalAmount - evenShare * (periodCount - 1)) * 100) / 100;

  return rawPeriods.map((period, index) => ({
    periodNumber: index + 1,
    periodStartDate: period.periodStartDate,
    periodEndDate: period.periodEndDate,
    billingAmount: index === periodCount - 1 ? lastShare : evenShare,
    isPartialPeriod: period.isPartialPeriod,
    isInvoiced: false,
  }));
}
