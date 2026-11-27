/**
 * Billing period schedule derived from a billing configuration's frequency.
 *
 * Self-contained on purpose: the redesigned Period Billing workspace builds the
 * full project start → end schedule locally so every period is addressable before
 * any of it has been acquired. Nothing here calls the backend.
 *
 * Dates are plain yyyy-mm-dd strings throughout — the same representation the AR
 * services and <input type="date"> use — so lexical comparison is chronological
 * and no timezone conversion ever happens.
 */

/** yyyy-mm-dd from anything date-ish, or "" when it cannot be read. */
export function toDateOnly(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const head = trimmed.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fromDateOnly(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(iso, days) {
  const d = fromDateOnly(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

/**
 * Adds months while clamping the day to the target month's length, so
 * 31 Jan + 1 month is 28/29 Feb rather than rolling into March.
 */
function addMonths(iso, months) {
  const d = fromDateOnly(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return toIso(d);
}

export const FREQUENCY_PRESETS = Object.freeze({
  WEEKLY: { key: "WEEKLY", label: "Weekly", step: { days: 7 } },
  BI_WEEKLY: { key: "BI_WEEKLY", label: "Bi-Weekly", step: { days: 14 } },
  MONTHLY: { key: "MONTHLY", label: "Monthly", step: { months: 1 } },
  QUARTERLY: { key: "QUARTERLY", label: "Quarterly", step: { months: 3 } },
  HALF_YEARLY: { key: "HALF_YEARLY", label: "Half-Yearly", step: { months: 6 } },
  ANNUALLY: { key: "ANNUALLY", label: "Annually", step: { months: 12 } },
  ON_DEMAND: { key: "ON_DEMAND", label: "On Demand", step: null },
});

/**
 * Maps whatever the configuration carries — enum (`BI_WEEKLY`), master-data label
 * ("Bi-Weekly"), or a {durationValue, durationUnit} object — onto one preset.
 * Order matters: the bi-weekly spellings are tested before the plain weekly one.
 */
export function resolveFrequency(frequency) {
  if (!frequency) return FREQUENCY_PRESETS.MONTHLY;

  if (typeof frequency === "object") {
    const value = Number(frequency.durationValue ?? frequency.value ?? 1) || 1;
    const unit = String(frequency.durationUnit ?? frequency.unit ?? "MONTHS").toUpperCase();
    if (unit.startsWith("WEEK")) {
      return value === 2 ? FREQUENCY_PRESETS.BI_WEEKLY : { key: `WEEKS_${value}`, label: `Every ${value} Weeks`, step: { days: value * 7 } };
    }
    if (unit.startsWith("DAY")) return { key: `DAYS_${value}`, label: `Every ${value} Days`, step: { days: value } };
    if (unit.startsWith("YEAR")) return { key: `YEARS_${value}`, label: value === 1 ? "Annually" : `Every ${value} Years`, step: { months: value * 12 } };
    if (value === 1) return FREQUENCY_PRESETS.MONTHLY;
    if (value === 3) return FREQUENCY_PRESETS.QUARTERLY;
    if (value === 6) return FREQUENCY_PRESETS.HALF_YEARLY;
    return { key: `MONTHS_${value}`, label: `Every ${value} Months`, step: { months: value } };
  }

  const norm = String(frequency).trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!norm) return FREQUENCY_PRESETS.MONTHLY;
  if (norm.includes("DEMAND") || norm.includes("ADHOC") || norm.includes("AD_HOC")) return FREQUENCY_PRESETS.ON_DEMAND;
  // Every bi-weekly spelling, including the separator-less "BIWEEKLY" form.
  if (norm.includes("BI_WEEK") || norm.includes("BIWEEK") || norm.includes("FORTNIGHT")) return FREQUENCY_PRESETS.BI_WEEKLY;
  if (norm.includes("SEMI_MONTH") || norm.includes("SEMIMONTH")) return { key: "SEMI_MONTHLY", label: "Semi-Monthly", step: { days: 15 } };
  if (norm.includes("WEEK")) return FREQUENCY_PRESETS.WEEKLY;
  if (norm.includes("QUARTER")) return FREQUENCY_PRESETS.QUARTERLY;
  if (norm.includes("HALF") || norm.includes("SEMI_ANNUAL") || norm.includes("SEMIANNUAL")) return FREQUENCY_PRESETS.HALF_YEARLY;
  if (norm.includes("ANNUAL") || norm.includes("YEAR")) return FREQUENCY_PRESETS.ANNUALLY;
  if (norm.includes("MONTH")) return FREQUENCY_PRESETS.MONTHLY;
  return FREQUENCY_PRESETS.MONTHLY;
}

/** Inclusive end of the period that starts at `startIso`, capped at `maxEndIso`. */
function periodEndFor(startIso, step, maxEndIso) {
  let end;
  if (step.days) {
    end = addDays(startIso, step.days - 1);
  } else {
    end = addDays(addMonths(startIso, step.months), -1);
  }
  if (maxEndIso && end > maxEndIso) return maxEndIso;
  return end;
}

export const PERIOD_STATE = Object.freeze({
  CLOSED: "CLOSED", // ended — fully billable
  OPEN: "OPEN", // in progress today — partially billable
  FUTURE: "FUTURE", // has not started
});

/** Hard stop so a bad date range can never spin the browser. */
const MAX_PERIODS = 520;

/**
 * Every billing period from project start to project end for the given frequency.
 *
 * Returns [] when there is no start date or no repeating frequency (On Demand),
 * which the caller renders as an explanatory empty state rather than an error.
 */
export function buildPeriodSchedule({ frequency, projectStartDate, projectEndDate, today = toDateOnly(new Date()) }) {
  const preset = resolveFrequency(frequency);
  const start = toDateOnly(projectStartDate);
  const end = toDateOnly(projectEndDate);

  if (!start || !preset.step) {
    return { frequency: preset, periods: [], reason: !start ? "NO_START_DATE" : "NO_SCHEDULE" };
  }

  const periods = [];
  let cursor = start;

  while (periods.length < MAX_PERIODS) {
    const periodEnd = periodEndFor(cursor, preset.step, end);
    if (!periodEnd || periodEnd < cursor) break;

    // Short only because the project ends mid-period, not because of the frequency.
    const naturalEnd = periodEndFor(cursor, preset.step, null);
    const index = periods.length + 1;

    periods.push({
      index,
      key: `${cursor}..${periodEnd}`,
      startDate: cursor,
      endDate: periodEnd,
      isPartial: Boolean(end) && periodEnd < naturalEnd,
      state: periodEnd < today ? PERIOD_STATE.CLOSED : cursor > today ? PERIOD_STATE.FUTURE : PERIOD_STATE.OPEN,
    });

    if (end && periodEnd >= end) break;

    const next = addDays(periodEnd, 1);
    if (next <= cursor) break; // never possible, but keeps the loop provably finite
    cursor = next;
    if (end && cursor > end) break;
  }

  return { frequency: preset, periods, reason: null, truncated: periods.length >= MAX_PERIODS };
}

/**
 * Attaches each snapshot to the period it belongs to, matched on the period's
 * exact date range. Snapshots that match no period (legacy or manually dated)
 * are returned separately rather than being forced onto a neighbouring period.
 */
export function attachSnapshotsToPeriods(periods, snapshots = []) {
  const byKey = new Map(periods.map((p) => [p.key, { ...p, snapshots: [] }]));
  const unmatched = [];

  for (const snap of snapshots) {
    const s = toDateOnly(snap?.billingPeriodStart);
    const e = toDateOnly(snap?.billingPeriodEnd);
    const slot = s && e ? byKey.get(`${s}..${e}`) : null;
    if (slot) slot.snapshots.push(snap);
    else unmatched.push(snap);
  }

  return { periods: Array.from(byKey.values()), unmatched };
}
