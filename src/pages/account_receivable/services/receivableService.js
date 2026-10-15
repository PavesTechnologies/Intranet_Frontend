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
    invoiceDate: item.invoiceDate || null,
    dueDate: item.dueDate || null,
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
