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

// Status values that mean tax has been calculated. IN_TAX (T&M calculation
// running on the backend) sits with Tax Calculated; the row badge still
// shows "Tax in Progress" so it is never presented as finished.
const TAX_CALCULATED_STATUSES = new Set(["TAX_CALCULATED", "CALCULATED", "TAX_COMPLETED", "IN_TAX"]);
// Status values that mean the record is eligible and waiting for tax.
const TAX_PENDING_STATUSES = new Set(["TAX_PENDING", "READY_FOR_TAX", "READY_TO_TAX", "READY"]);

const recordStatuses = (record) =>
  [record?.periodStatus, record?.taxStatus, record?.taxCalculationStatus, record?.status].map((s) =>
    String(s || "").toUpperCase()
  );

/**
 * True only when an invoice has actually been generated for the record:
 * the backend's persisted per-occurrence `isInvoiced` flag (strictly true),
 * or the id of a persisted invoice. A status string such as "INVOICED" on
 * a billing/snapshot/occurrence status is deliberately NOT proof.
 */
export function hasGeneratedInvoice(record) {
  return record?.isInvoiced === true || Boolean(record?.invoiceId);
}

/**
 * The ONE pipeline status for any Tax Calculation record (billing
 * occurrence or T&M snapshot). Summary counts, stage tabs/filters, the
 * table Status column and the detail badge all read this value.
 *
 *   1. INVOICED        — an invoice was actually generated
 *   2. TAX_CALCULATED  — tax calculated, no invoice yet
 *   3. READY_FOR_TAX   — eligible and TAX_PENDING (periodStatus/taxStatus)
 *   4. UPCOMING        — not yet eligible (e.g. periodStatus SCHEDULED)
 */
export function getTaxPipelineStatus(record) {
  if (hasGeneratedInvoice(record)) return PIPELINE_STAGES.INVOICED;
  const statuses = recordStatuses(record);
  if (statuses.some((s) => TAX_CALCULATED_STATUSES.has(s))) return PIPELINE_STAGES.TAX_CALCULATED;
  if (statuses.some((s) => TAX_PENDING_STATUSES.has(s))) return PIPELINE_STAGES.READY_FOR_TAX;
  return PIPELINE_STAGES.UPCOMING;
}

// A T&M snapshot only belongs in the tax workspace once it has been acquired
// into a tax status (or invoiced) — e.g. NOT_ACQUIRED stays out.
const isSnapshotInTaxWorkspace = (snapshot) =>
  hasGeneratedInvoice(snapshot) ||
  recordStatuses(snapshot).some((s) => TAX_CALCULATED_STATUSES.has(s) || TAX_PENDING_STATUSES.has(s));

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
 * pipeline record. Returns null when the snapshot is not in the tax workspace.
 */
export function toSnapshotPipelineRecord(snapshot) {
  if (!snapshot || !isSnapshotInTaxWorkspace(snapshot)) return null;
  const stage = getTaxPipelineStatus(snapshot);

  // A snapshot carries no separate billing date; its period end is the
  // date it was billed up to.
  const billingDate = snapshot.billingDate || snapshot.periodEnd || null;
  const isInTax = stage === PIPELINE_STAGES.TAX_CALCULATED && String(snapshot.status || "").toUpperCase() === "IN_TAX";

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
    rawStatus: stage === PIPELINE_STAGES.INVOICED ? "INVOICED" : snapshot.status,
    searchText: [snapshot.client, snapshot.projectName, snapshot.projectCode, snapshot.snapshotNumber]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
    original: snapshot,
  };
}

/**
 * Normalized billing occurrence -> pipeline record. The stage always comes
 * from getTaxPipelineStatus, never from the query bucket it was fetched by.
 */
export function toOccurrencePipelineRecord(occurrence) {
  const stage = getTaxPipelineStatus(occurrence);
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
    rawStatus: stage === PIPELINE_STAGES.INVOICED ? "INVOICED" : occurrence.periodStatus || occurrence.taxStatus,
    searchText: [occurrence.clientName, occurrence.projectName, reference]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
    original: occurrence,
  };
}

// { ALL, UPCOMING, READY_FOR_TAX, TAX_CALCULATED, INVOICED } counts from the
// records' normalized stage — shared by the summary cards and stage tabs.
export function countPipelineStages(records = []) {
  const counts = { ALL: records.length };
  PIPELINE_STAGE_ORDER.forEach((s) => {
    counts[s] = 0;
  });
  records.forEach((r) => {
    if (r.stage in counts) counts[r.stage] += 1;
  });
  return counts;
}

// Records shown under a stage tab/filter ("ALL" shows every record).
export function filterByPipelineStage(records = [], stage = "ALL") {
  return stage === "ALL" ? records : records.filter((r) => r.stage === stage);
}

// Pipeline order first (Upcoming -> Invoiced), then billing date ascending.
export function comparePipelineRecords(a, b) {
  const stageDiff = PIPELINE_STAGE_ORDER.indexOf(a.stage) - PIPELINE_STAGE_ORDER.indexOf(b.stage);
  if (stageDiff !== 0) return stageDiff;
  return (a.billingDateKey || "9999").localeCompare(b.billingDateKey || "9999");
}
