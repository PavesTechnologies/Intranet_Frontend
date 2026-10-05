// Billing Tax Pipeline — normalizes the two backend record shapes that feed
// the Tax Calculation workspace (T&M billing snapshots and Milestone Plan /
// Recurring billing occurrences) into ONE display model so every record
// renders in the same row regardless of billing type.
//
// Stages are only a grouping of statuses the backend already returned; no
// eligibility is derived here (no date comparisons, no amount checks).
import { formatDisplayDate } from "./format";
import { getBillingTypeDisplayName } from "./billingType";

export const PIPELINE_STAGES = {
  UPCOMING: "UPCOMING",
  READY_FOR_TAX: "READY_FOR_TAX",
  TAX_CALCULATED: "TAX_CALCULATED",
  INVOICED: "INVOICED",
};

export const PIPELINE_STAGE_ORDER = [
  PIPELINE_STAGES.UPCOMING,
  PIPELINE_STAGES.READY_FOR_TAX,
  PIPELINE_STAGES.TAX_CALCULATED,
  PIPELINE_STAGES.INVOICED,
];

export const PIPELINE_STAGE_LABELS = {
  [PIPELINE_STAGES.UPCOMING]: "Upcoming",
  [PIPELINE_STAGES.READY_FOR_TAX]: "Ready for Tax",
  [PIPELINE_STAGES.TAX_CALCULATED]: "Tax Calculated",
  [PIPELINE_STAGES.INVOICED]: "Invoiced",
};

export const PIPELINE_EMPTY_MESSAGES = {
  ALL: "No billing records in the tax calculation workspace.",
  [PIPELINE_STAGES.UPCOMING]: "No upcoming billing occurrences.",
  [PIPELINE_STAGES.READY_FOR_TAX]: "No billing occurrences are currently pending tax calculation.",
  [PIPELINE_STAGES.TAX_CALCULATED]: "No records with completed tax calculation awaiting invoice.",
  [PIPELINE_STAGES.INVOICED]: "No invoiced billing records.",
};

/**
 * T&M billing snapshot status -> pipeline stage. IN_TAX (calculation running
 * on the backend) sits with Tax Calculated; the row badge still shows the
 * real backend status so it is never presented as finished.
 * Returns null for statuses that don't belong in the tax workspace
 * (e.g. NOT_ACQUIRED).
 */
export function getSnapshotStage(status) {
  const st = String(status || "").toUpperCase();
  if (st === "READY_TO_TAX" || st === "READY_FOR_TAX" || st === "READY") return PIPELINE_STAGES.READY_FOR_TAX;
  if (st === "IN_TAX" || st === "TAX_COMPLETED" || st === "CALCULATED") return PIPELINE_STAGES.TAX_CALCULATED;
  if (st === "INVOICED") return PIPELINE_STAGES.INVOICED;
  return null;
}

// Billing Type is a display label only. The backend's billing type name wins
// when the occurrence carries one (mapped through the app-wide
// getBillingTypeDisplayName, e.g. "Milestone Based" -> "Milestone Plan").
// Otherwise an occurrence is either Recurring or a billing-configuration
// schedule, which in the current billing setup is a Milestone Plan — the
// legacy FIXED scheduleType is the same schedule and never shown as a
// separate billing type here.
export function getOccurrenceBillingType(occurrence) {
  const backendName = occurrence?.billingTypeName || occurrence?.billingType;
  if (backendName && typeof backendName === "string") {
    return getBillingTypeDisplayName(backendName);
  }
  const raw = String(occurrence?.scheduleType || "").trim().toUpperCase();
  if (raw.includes("RECUR") || raw.includes("SUBSCRIPTION")) return "Recurring";
  if (occurrence?.recurringConfigurationId) return "Recurring";
  if (raw || occurrence?.billingConfigurationId) return "Milestone Plan";
  return "Billing Occurrence";
}

/**
 * Single display stage for a billing occurrence, using the same backend
 * fields the detail page has always keyed on (isInvoiced, periodStatus,
 * taxStatus, taxCalculationStatus) — collapsed into one status so the UI
 * never shows Tax Status and Tax Calculation Status side by side.
 */
export function getOccurrenceStage(occurrence) {
  const periodStatus = String(occurrence?.periodStatus || "").toUpperCase();
  const taxStatus = String(occurrence?.taxStatus || "").toUpperCase();
  const calcStatus = String(occurrence?.taxCalculationStatus || occurrence?.status || "").toUpperCase();
  if (occurrence?.isInvoiced) return PIPELINE_STAGES.INVOICED;
  if (
    periodStatus === "TAX_CALCULATED" ||
    taxStatus === "TAX_CALCULATED" ||
    taxStatus === "CALCULATED" ||
    calcStatus === "CALCULATED"
  ) {
    return PIPELINE_STAGES.TAX_CALCULATED;
  }
  if (periodStatus === "TAX_PENDING" || taxStatus === "TAX_PENDING") return PIPELINE_STAGES.READY_FOR_TAX;
  if (periodStatus === "SCHEDULED") return PIPELINE_STAGES.UPCOMING;
  return null;
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DISPLAY_DATE = /^(\d{2}) ([A-Z][a-z]{2}) (\d{4})$/;

// Sortable "YYYY-MM-DD" for any date shape formatDisplayDate accepts
// (ISO string, LocalDate tuple, "2026,10,1"), or "" when unparseable.
export function toDateKey(value) {
  const match = formatDisplayDate(value).match(DISPLAY_DATE);
  if (!match) return "";
  const month = SHORT_MONTHS.indexOf(match[2]) + 1;
  return `${match[3]}-${String(month).padStart(2, "0")}-${match[1]}`;
}

// "YYYY-MM" key -> "Oct 2026"
export function formatMonthKey(monthKey) {
  const [year, month] = String(monthKey || "").split("-");
  const name = SHORT_MONTHS[Number(month) - 1];
  return name && year ? `${name} ${year}` : monthKey;
}

// Compact period: "30 Sep – 31 Oct" (the year lives in the Billing Date
// column); keeps the full dates when the period spans two years.
export function formatPeriodRange(start, end, fallback = "—") {
  const s = formatDisplayDate(start);
  const e = formatDisplayDate(end);
  if (s === "—" && e === "—") return fallback || "—";
  if (s === "—" || e === "—") return s === "—" ? e : s;
  const sm = s.match(DISPLAY_DATE);
  const em = e.match(DISPLAY_DATE);
  if (!sm || !em) return `${s} – ${e}`;
  if (sm[3] !== em[3]) return `${s} – ${e}`;
  return `${sm[1]} ${sm[2]} – ${em[1]} ${em[2]}`;
}

// Full period for detail views: "05 Oct 2026 – 05 Oct 2026".
export function formatFullPeriod(start, end, fallback = "—") {
  const s = formatDisplayDate(start);
  const e = formatDisplayDate(end);
  if (s === "—" && e === "—") return fallback || "—";
  if (s === "—" || e === "—") return s === "—" ? e : s;
  return `${s} – ${e}`;
}

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

/**
 * Snapshot row (as built by TaxCalculationConsole from the T&M APIs) ->
 * pipeline record. Returns null when the snapshot has no pipeline stage.
 */
export function toSnapshotPipelineRecord(snapshot) {
  const stage = getSnapshotStage(snapshot?.status);
  if (!stage) return null;

  // A snapshot carries no separate billing date; its period end is the
  // date it was billed up to.
  const billingDate = snapshot.billingDate || snapshot.periodEnd || null;
  const isInTax = String(snapshot.status || "").toUpperCase() === "IN_TAX";

  return {
    key: `snapshot-${snapshot.id}`,
    source: "SNAPSHOT",
    client: snapshot.client || "—",
    project: snapshot.projectName || "—",
    reference: snapshot.snapshotNumber || snapshot.projectCode || "",
    billingType: "Time & Material",
    billingPeriod: formatPeriodRange(snapshot.periodStart, snapshot.periodEnd, snapshot.billingPeriod),
    billingDate,
    billingDateKey: toDateKey(billingDate),
    amount: toNumberOrNull(snapshot.taxableAmount),
    taxAmount: toNumberOrNull(snapshot.totalTaxAmount),
    grandTotal: toNumberOrNull(snapshot.grandTotal),
    currency: snapshot.currency || "USD",
    taxRegion: snapshot.taxRegion || "",
    stage,
    statusLabel: isInTax ? "Tax in Progress" : PIPELINE_STAGE_LABELS[stage],
    rawStatus: snapshot.status,
    searchText: [snapshot.client, snapshot.projectName, snapshot.projectCode, snapshot.snapshotNumber]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
    original: snapshot,
  };
}

/**
 * Normalized billing occurrence -> pipeline record. `stage` is the bucket
 * the occurrence was fetched into (by backend periodStatus / isInvoiced).
 */
export function toOccurrencePipelineRecord(occurrence, stage) {
  const amount = toNumberOrNull(occurrence.billingAmount ?? occurrence.taxableAmount);
  const reference = occurrence.periodNumber ? `Period ${occurrence.periodNumber}` : "";

  return {
    key: `occurrence-${occurrence.billingScheduleId}`,
    source: "OCCURRENCE",
    client: occurrence.clientName || "—",
    project: occurrence.projectName || "—",
    reference,
    billingType: getOccurrenceBillingType(occurrence),
    billingPeriod: formatPeriodRange(occurrence.periodStartDate, occurrence.periodEndDate),
    billingDate: occurrence.billingDate || null,
    billingDateKey: toDateKey(occurrence.billingDate),
    amount,
    taxAmount: toNumberOrNull(occurrence.totalTaxAmount),
    grandTotal: toNumberOrNull(occurrence.grandTotal),
    currency: occurrence.currencyCode || "USD",
    taxRegion: occurrence.taxRegionName || "",
    stage,
    statusLabel: PIPELINE_STAGE_LABELS[stage],
    rawStatus: occurrence.isInvoiced ? "INVOICED" : occurrence.periodStatus || occurrence.taxStatus,
    searchText: [occurrence.clientName, occurrence.projectName, reference]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
    original: occurrence,
  };
}

// Pipeline order first (Upcoming -> Invoiced), then billing date ascending.
export function comparePipelineRecords(a, b) {
  const stageDiff = PIPELINE_STAGE_ORDER.indexOf(a.stage) - PIPELINE_STAGE_ORDER.indexOf(b.stage);
  if (stageDiff !== 0) return stageDiff;
  return (a.billingDateKey || "9999").localeCompare(b.billingDateKey || "9999");
}
