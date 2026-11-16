/**
 * Review cycles for settling an employee's remaining cash advance balance. A deferred balance is
 * reviewed at the end of the next cycle period. Periods are counted from the financial year start
 * month (April by default, the Indian financial year).
 */

export const REVIEW_CYCLE = {
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  HALF_YEARLY: "HALF_YEARLY",
  FINANCIAL_YEAR: "FINANCIAL_YEAR",
};

export const REVIEW_CYCLE_OPTIONS = [
  { value: REVIEW_CYCLE.MONTHLY, label: "Monthly", months: 1 },
  { value: REVIEW_CYCLE.QUARTERLY, label: "Quarterly", months: 3 },
  { value: REVIEW_CYCLE.HALF_YEARLY, label: "Half-yearly", months: 6 },
  { value: REVIEW_CYCLE.FINANCIAL_YEAR, label: "Financial year", months: 12 },
];

export const DEFAULT_FY_START_MONTH = 4; // April, 1-based

const cycleMonths = (cycle) => REVIEW_CYCLE_OPTIONS.find((o) => o.value === cycle)?.months;

const isoDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * The first period end strictly after `fromDate` for the cycle. Returns an ISO date (YYYY-MM-DD),
 * or null for an unknown cycle.
 */
export const getNextReviewDate = (cycle, fromDate = new Date(), fyStartMonth = DEFAULT_FY_START_MONTH) => {
  const step = cycleMonths(cycle);
  if (!step) return null;

  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  for (let offset = 0; offset < 48; offset += 1) {
    const monthStart = new Date(start.getFullYear(), start.getMonth() + offset, 1);
    const monthNumber = monthStart.getMonth() + 1;
    // Position of this month in the financial year, 1..12 (fyStartMonth = 1).
    const position = ((monthNumber - fyStartMonth + 12) % 12) + 1;
    if (position % step !== 0) continue;

    const periodEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    if (periodEnd > fromDate) return isoDate(periodEnd);
  }
  return null;
};
