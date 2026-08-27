// Client-side helpers for the Recurring Billing Configuration wizard step.
//
// This file intentionally contains only date-range validation. Billing
// periods and amounts are never computed on the frontend — the backend's
// generated BillingSchedule (see getBillingRecurringSchedule /
// getBillingRecurringScheduleByBillingConfigurationId in
// billingConfigurationService.js) is the sole source of truth and is what
// drives the "Billing Schedule (Preview)" table.

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
