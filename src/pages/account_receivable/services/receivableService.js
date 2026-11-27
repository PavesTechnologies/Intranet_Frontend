import api from "../../../api/axiosInstance";

const AR_BASE_URL =
  window.__APP_CONFIG__?.AR_BASE_URL ||
  window.APP_CONFIG?.AR_BASE_URL ||
  import.meta.env?.VITE_AR_API_BASE_URL ||
  "http://localhost:8080";

const RECEIVABLES_URL = `${AR_BASE_URL}/api/v1/receivables`;

/**
 * Receivable status values sent by the backend (ReceivableStatus). Every
 * receivable starts OUTSTANDING when its invoice is first sent; the payment
 * flow that will move it to PARTIALLY_PAID / SETTLED is not built yet.
 */
export const RECEIVABLE_STATUS = {
  OUTSTANDING: "OUTSTANDING",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  SETTLED: "SETTLED",
};

export const RECEIVABLE_STATUS_LABELS = {
  OUTSTANDING: "Outstanding",
  PARTIALLY_PAID: "Partially Paid",
  SETTLED: "Settled",
};

/**
 * Aging buckets keyed off the backend's daysOverdue (days past due date,
 * floored at 0). A receivable with no due date cannot be aged.
 */
export const AGING_BUCKETS = [
  { key: "CURRENT", label: "Current", test: (days) => days === 0 },
  { key: "1_30", label: "1–30 days", test: (days) => days >= 1 && days <= 30 },
  { key: "31_60", label: "31–60 days", test: (days) => days >= 31 && days <= 60 },
  { key: "61_90", label: "61–90 days", test: (days) => days >= 61 && days <= 90 },
  { key: "90_PLUS", label: "90+ days", test: (days) => days > 90 },
];

export const NO_DUE_DATE_BUCKET = { key: "NO_DUE_DATE", label: "No due date" };

/* ------------------------------------------------------------------ */
/* Live aging                                                          */
/* ------------------------------------------------------------------ */

/** Local calendar date as yyyy-MM-dd (not UTC — a due date is a local day). */
export const toLocalIsoDate = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Whole days from one local date to another; null when either is unparseable
// (never NaN — a NaN would silently stop an invoice from ever turning overdue).
const daysBetween = (from, to) => {
  const a = toIsoDay(from);
  const b = toIsoDay(to);
  if (!a || !b) return null;
  const [fy, fm, fd] = a.split("-").map(Number);
  const [ty, tm, td] = b.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
};

/**
 * Re-ages a receivable against `todayIso`. The backend computes
 * daysOutstanding / daysOverdue once per request, and never moves the
 * status to overdue, so a page left open overnight (or a cached list) would
 * show yesterday's picture. Same rules as the backend: only while a balance
 * is owed, floored at 0, null without the needed date.
 */
export const applyLiveAging = (receivable, todayIso = toLocalIsoDate()) => {
  const owed = receivable.outstandingBalance > 0;
  const sinceInvoice = owed ? daysBetween(receivable.invoiceDate, todayIso) : null;
  const pastDue = owed ? daysBetween(receivable.dueDate, todayIso) : null;
  return {
    ...receivable,
    daysOutstanding: sinceInvoice === null ? null : Math.max(0, sinceInvoice),
    daysOverdue: pastDue === null ? null : Math.max(0, pastDue),
    daysUntilDue: pastDue === null ? null : -pastDue,
  };
};

/**
 * Where a receivable stands today. Overdue wins over partially paid: money
 * still owed past its due date is overdue however much has been received.
 */
export const RECEIVABLE_DUE_STATE = {
  NOT_DUE: { key: "NOT_DUE", label: "Not Due" },
  DUE_TODAY: { key: "DUE_TODAY", label: "Due Today" },
  OVERDUE: { key: "OVERDUE", label: "Overdue" },
  PARTIALLY_PAID: { key: "PARTIALLY_PAID", label: "Partially Paid" },
  NO_DUE_DATE: { key: "NO_DUE_DATE", label: "No Due Date" },
  SETTLED: { key: "SETTLED", label: "Settled" },
};

export const getReceivableDueState = (receivable) => {
  if (receivable.status === RECEIVABLE_STATUS.SETTLED || !(receivable.outstandingBalance > 0)) {
    return RECEIVABLE_DUE_STATE.SETTLED;
  }
  if (receivable.daysOverdue > 0) return RECEIVABLE_DUE_STATE.OVERDUE;
  if (receivable.dueDate && receivable.daysUntilDue === 0) return RECEIVABLE_DUE_STATE.DUE_TODAY;
  if (receivable.status === RECEIVABLE_STATUS.PARTIALLY_PAID) return RECEIVABLE_DUE_STATE.PARTIALLY_PAID;
  if (!receivable.dueDate) return RECEIVABLE_DUE_STATE.NO_DUE_DATE;
  return RECEIVABLE_DUE_STATE.NOT_DUE;
};

/** Short "when" text for a due date: "Due in 5 days", "Due today", "12 days overdue". */
export const describeDue = (receivable) => {
  if (!receivable.dueDate || receivable.daysUntilDue === null || receivable.daysUntilDue === undefined) return null;
  if (receivable.daysOverdue > 0) return `${receivable.daysOverdue} day${receivable.daysOverdue === 1 ? "" : "s"} overdue`;
  if (receivable.daysUntilDue === 0) return "Due today";
  return `Due in ${receivable.daysUntilDue} day${receivable.daysUntilDue === 1 ? "" : "s"}`;
};

export const getAgingBucket = (receivable) => {
  const days = receivable?.daysOverdue;
  if (days === null || days === undefined) return NO_DUE_DATE_BUCKET;
  return AGING_BUCKETS.find((bucket) => bucket.test(days)) || NO_DUE_DATE_BUCKET;
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toNullableNumber = (value) => (value === null || value === undefined ? null : Number(value));

/**
 * Normalises a backend LocalDate to "yyyy-MM-dd". Jackson may send it as
 * [2026, 11, 11], "2026,11,11", "2026-11-11" or an ISO timestamp — every
 * date calculation below needs the dashed form. Returns null if unparseable.
 */
export const toIsoDay = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const pad = (n) => String(n).padStart(2, "0");
  let parts = null;
  if (Array.isArray(value)) parts = value.slice(0, 3).map(Number);
  else if (value instanceof Date && !Number.isNaN(value.getTime())) parts = [value.getFullYear(), value.getMonth() + 1, value.getDate()];
  else {
    const str = String(value).trim();
    const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) parts = iso.slice(1, 4).map(Number);
    else if (str.includes(",")) parts = str.split(",").slice(0, 3).map((p) => Number(p.trim()));
  }
  if (!parts || parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return `${parts[0]}-${pad(parts[1])}-${pad(parts[2])}`;
};

export const normalizeReceivable = (item = {}) => {
  const invoiceAmount = toNumber(item.invoiceAmount);
  const outstandingBalance = toNumber(item.outstandingBalance);

  return {
    receivableId: item.receivableId || null,
    invoiceId: item.invoiceId || null,
    invoiceNumber: item.invoiceNumber || "—",
    clientId: item.clientId || null,
    clientName: item.clientName || "—",
    projectId: item.projectId ?? null,
    projectName: item.projectName || "—",
    currencyCode: item.currencyCode || "USD",
    invoiceDate: toIsoDay(item.invoiceDate),
    dueDate: toIsoDay(item.dueDate),
    invoiceAmount,
    outstandingBalance,
    // No payment flow exists yet, so this is invoice amount minus what is
    // still owed — derived, never stored.
    amountReceived: Math.max(invoiceAmount - outstandingBalance, 0),
    status: String(item.status || RECEIVABLE_STATUS.OUTSTANDING).toUpperCase(),
    daysOutstanding: toNullableNumber(item.daysOutstanding),
    daysOverdue: toNullableNumber(item.daysOverdue),
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
};

const unwrapData = (response) => {
  const payload = response?.data;
  if (payload && typeof payload === "object" && "data" in payload) return payload.data;
  return payload ?? null;
};

/**
 * GET /api/v1/receivables/outstanding
 * Receivables that still have a balance owed, earliest due date first.
 * Every filter is optional and only narrows the result.
 */
export const getOutstandingReceivables = async ({ clientId, projectId, status } = {}) => {
  const params = {};
  if (clientId) params.clientId = clientId;
  if (projectId !== undefined && projectId !== null && projectId !== "") params.projectId = projectId;
  if (status) params.status = status;

  const response = await api.get(`${RECEIVABLES_URL}/outstanding`, { params });
  const data = unwrapData(response);
  return (Array.isArray(data) ? data : []).map(normalizeReceivable);
};

/**
 * GET /api/v1/receivables/{receivableId}
 * One receivable in any status, including settled history.
 */
export const getReceivableById = async (receivableId) => {
  if (!receivableId) throw new Error("Receivable ID is required.");
  const response = await api.get(`${RECEIVABLES_URL}/${receivableId}`);
  return normalizeReceivable(unwrapData(response) || {});
};

export const getReceivableErrorMessage = (
  error,
  fallback = "Receivables could not be loaded. Please try again."
) => {
  const status = error?.response?.status;
  const detail = String(
    error?.response?.data?.message || error?.response?.data?.detail || error?.message || ""
  );

  if (status === 404) return "Receivable could not be found.";
  if (status === 401 || status === 403) return "You do not have access to receivables.";
  if (/sql|hibernate|constraint|jdbc/i.test(detail)) return fallback;
  return detail || fallback;
};

export default {
  getOutstandingReceivables,
  getReceivableById,
  getReceivableErrorMessage,
  getAgingBucket,
};
