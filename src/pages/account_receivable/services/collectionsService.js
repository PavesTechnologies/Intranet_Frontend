import api from "../../../api/axiosInstance";
import { AR_BASE_URL, toNumber, unwrapApiData } from "../utils/apiAvailability";

/**
 * Reminders and collections. Contract: docs/POST_INVOICE_API_CONTRACT.md §4–5.
 */
const REMINDERS_URL = `${AR_BASE_URL}/api/v1/reminders`;
const CASES_URL = `${AR_BASE_URL}/api/v1/collection-cases`;

export const REMINDERS_ENDPOINT = "GET /api/v1/reminders";
export const COLLECTION_CASES_ENDPOINT = "GET /api/v1/collection-cases";

/* ------------------------------- Reminders ------------------------------- */

export const REMINDER_TYPES = [
  { value: "UPCOMING_DUE", label: "Upcoming Due" },
  { value: "DUE_TODAY", label: "Due Today" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "ESCALATION", label: "Escalation" },
];
export const REMINDER_TYPE_LABELS = Object.fromEntries(REMINDER_TYPES.map((t) => [t.value, t.label]));

export const REMINDER_CHANNELS = [
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "PORTAL", label: "Portal" },
];
export const REMINDER_CHANNEL_LABELS = Object.fromEntries(REMINDER_CHANNELS.map((c) => [c.value, c.label]));

export const normalizeReminder = (r = {}) => ({
  reminderId: r.reminderId || null,
  receivableId: r.receivableId || null,
  invoiceId: r.invoiceId || null,
  invoiceNumber: r.invoiceNumber || "—",
  clientName: r.clientName || "—",
  reminderType: String(r.reminderType || "").toUpperCase(),
  channel: String(r.channel || "").toUpperCase(),
  status: String(r.status || "").toUpperCase(),
  triggeredBy: String(r.triggeredBy || "").toUpperCase(),
  recipient: r.recipient || "",
  scheduledAt: r.scheduledAt || null,
  sentAt: r.sentAt || null,
  failureReason: r.failureReason || null,
});

/** GET /api/v1/reminders — optional filters: receivableId, status. */
export const getReminders = async ({ receivableId, status } = {}) => {
  const params = {};
  if (receivableId) params.receivableId = receivableId;
  if (status) params.status = status;
  const response = await api.get(REMINDERS_URL, { params });
  const data = unwrapApiData(response);
  return (Array.isArray(data) ? data : []).map(normalizeReminder);
};

/** POST /api/v1/reminders — send a manual reminder now. */
export const sendReminder = async ({ receivableId, reminderType, channel, message }) => {
  const response = await api.post(REMINDERS_URL, { receivableId, reminderType, channel, message });
  return normalizeReminder(unwrapApiData(response) || {});
};

/** POST /api/v1/reminders/{reminderId}/cancel — cancel a scheduled reminder. */
export const cancelReminder = async (reminderId) => {
  const response = await api.post(`${REMINDERS_URL}/${reminderId}/cancel`);
  return normalizeReminder(unwrapApiData(response) || {});
};

/* --------------------------- Collection cases ---------------------------- */

export const CASE_PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];
export const CASE_PRIORITY_LABELS = Object.fromEntries(CASE_PRIORITIES.map((p) => [p.value, p.label]));

export const CASE_STATUS_LABELS = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  PROMISE_TO_PAY: "Promise to Pay",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
};

export const ACTIVITY_TYPES = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING", label: "Meeting" },
  { value: "NOTE", label: "Note" },
];
export const ACTIVITY_TYPE_LABELS = Object.fromEntries(ACTIVITY_TYPES.map((a) => [a.value, a.label]));

const normalizeActivity = (a = {}) => ({
  activityId: a.activityId || null,
  activityType: String(a.activityType || "").toUpperCase(),
  outcome: a.outcome || "",
  notes: a.notes || "",
  createdAt: a.createdAt || null,
  createdBy: a.createdBy || null,
});

export const normalizeCase = (c = {}) => ({
  caseId: c.caseId || null,
  caseNumber: c.caseNumber || "—",
  clientId: c.clientId || null,
  clientName: c.clientName || "—",
  receivableIds: Array.isArray(c.receivableIds) ? c.receivableIds : [],
  invoiceNumbers: Array.isArray(c.invoiceNumbers) ? c.invoiceNumbers : [],
  totalOverdue: toNumber(c.totalOverdue),
  currencyCode: c.currencyCode || "USD",
  priority: String(c.priority || "MEDIUM").toUpperCase(),
  status: String(c.status || "OPEN").toUpperCase(),
  assigneeName: c.assigneeName || null,
  nextFollowUpDate: c.nextFollowUpDate || null,
  promiseToPay: c.promiseToPay
    ? { promisedDate: c.promiseToPay.promisedDate || null, promisedAmount: toNumber(c.promiseToPay.promisedAmount) }
    : null,
  openedAt: c.openedAt || null,
  lastActivityAt: c.lastActivityAt || null,
  activities: Array.isArray(c.activities) ? c.activities.map(normalizeActivity) : [],
});

/** GET /api/v1/collection-cases — optional filters: status, clientId. */
export const getCollectionCases = async ({ status, clientId } = {}) => {
  const params = {};
  if (status) params.status = status;
  if (clientId) params.clientId = clientId;
  const response = await api.get(CASES_URL, { params });
  const data = unwrapApiData(response);
  return (Array.isArray(data) ? data : []).map(normalizeCase);
};

/** GET /api/v1/collection-cases/{caseId} — includes the activity timeline. */
export const getCollectionCase = async (caseId) => {
  const response = await api.get(`${CASES_URL}/${caseId}`);
  return normalizeCase(unwrapApiData(response) || {});
};

/** POST /api/v1/collection-cases — open a case for a client's overdue receivables. */
export const openCollectionCase = async ({ clientId, receivableIds, priority, assigneeName, notes }) => {
  const response = await api.post(CASES_URL, { clientId, receivableIds, priority, assigneeName, notes });
  return normalizeCase(unwrapApiData(response) || {});
};

const caseAction = async (caseId, action, body) => {
  const response = await api.post(`${CASES_URL}/${caseId}/${action}`, body);
  return normalizeCase(unwrapApiData(response) || {});
};

/** POST /collection-cases/{id}/assign */
export const assignCollectionCase = (caseId, assigneeName) => caseAction(caseId, "assign", { assigneeName });
/** POST /collection-cases/{id}/activities — log a follow-up. */
export const logCaseActivity = (caseId, payload) => caseAction(caseId, "activities", payload);
/** POST /collection-cases/{id}/promise-to-pay */
export const recordPromiseToPay = (caseId, payload) => caseAction(caseId, "promise-to-pay", payload);
/** POST /collection-cases/{id}/escalate */
export const escalateCollectionCase = (caseId, reason) => caseAction(caseId, "escalate", { reason });
/** POST /collection-cases/{id}/resolve */
export const resolveCollectionCase = (caseId, resolution) => caseAction(caseId, "resolve", { resolution });
