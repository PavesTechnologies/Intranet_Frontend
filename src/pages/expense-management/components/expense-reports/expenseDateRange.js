import { useEffect, useState } from "react";
import { lineItemService } from "@/pages/expense-management/api/expenseReportsApi";
import { toIsoDate } from "@/pages/expense-management/pages/reports/reportUtils";

/**
 * The dates an expense line may carry. The server computes them (ExpenseDatePolicy) and the forms read that range,
 * so the two sides cannot disagree. Dates are yyyy-mm-dd on the employee's own calendar.
 *
 * @typedef {{ minDate: string|null, maxDate: string|null, today: string, basis: string, blockedReason: string|null }} ExpenseDateRange
 */

/**
 * Used only until the server range arrives, or when it cannot be loaded. It refuses future dates on the employee's
 * own calendar day; the server still applies the report's real range when the line is saved.
 */
export const fallbackRange = (now = new Date()) => {
  const today = toIsoDate(now);
  return { minDate: null, maxDate: today, today, basis: "the report's dates", blockedReason: null };
};

const describeWindow = (range) => `${range.minDate || "any earlier date"} to ${range.maxDate}`;

/** Hint under the date field: the permitted dates, or why none are permitted yet. */
export const expenseDateHint = (range) => {
  if (!range) return "";
  if (range.blockedReason) return range.blockedReason;
  return `Permitted dates: ${describeWindow(range)} (${range.basis}).`;
};

/** Same rule as ExpenseDatePolicy.assertAllowed on the server. Returns the message to show, or null when permitted. */
export const expenseDateError = (value, range) => {
  if (!value) return "Expense date is required.";
  if (!range) return null;
  if (range.blockedReason) return range.blockedReason;
  if (value > range.today) return `Expense date ${value} cannot be in the future.`;
  const beforeStart = Boolean(range.minDate) && value < range.minDate;
  const afterEnd = !range.maxDate || value > range.maxDate;
  if (beforeStart || afterEnd) {
    return `Expense date ${value} must fall within ${range.basis} (${describeWindow(range)}).`;
  }
  return null;
};

/** Days after the trip end date that an advance-linked report may still be submitted. Matches the server. */
export const ADVANCE_EXPENSE_DEADLINE_DAYS = 30;

/**
 * The last date an expense for a trip may be dated, for a report linked to a cash advance: 30 days after the trip end.
 * Java's plusDays and this helper agree. Returns yyyy-mm-dd, or null when the trip end is not set.
 *
 * @param tripEnd the report's trip end date (yyyy-mm-dd)
 */
export const advanceExpenseDeadline = (tripEnd) => {
  if (!tripEnd || !/^\d{4}-\d{2}-\d{2}$/.test(tripEnd)) return null;
  const [year, month, day] = tripEnd.split("-").map(Number);
  return toIsoDate(new Date(year, month - 1, day + ADVANCE_EXPENSE_DEADLINE_DAYS));
};

/** The report's permitted range, loaded from the server while `enabled`. Falls back to today until it arrives. */
export const useExpenseDateRange = (reportId, enabled = true) => {
  const [range, setRange] = useState(null);

  useEffect(() => {
    if (!enabled || !reportId) return undefined;
    let cancelled = false;
    Promise.resolve()
      .then(() => lineItemService.getExpenseDateRange(reportId))
      .then((res) => {
        if (!cancelled) setRange(res?.data?.data ?? fallbackRange());
      })
      .catch(() => {
        if (!cancelled) setRange(fallbackRange());
      });
    return () => {
      cancelled = true;
    };
  }, [reportId, enabled]);

  return range ?? fallbackRange();
};
