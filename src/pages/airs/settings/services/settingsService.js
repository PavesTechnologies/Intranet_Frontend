// Settings page API (/settings/*, HR_ADMIN only). Same conventions as profileTemplateService.js.
import api from "@/api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const unwrap = (data) => data?.data ?? data ?? {};

// Per-field problems a 422 carries: { KEY: "message" } or { field: ["message", ...] }.
export const fieldProblems = (error) => error?.response?.data?.data?.problems || null;

// ── platform settings ─────────────────────────────────────────
// [{ group, settings: [{ key, label, help, kind, minimum, maximum, default, unit, value, is_default }] }]
export const getPlatformSettings = async () => {
  const response = await api.get(`${BASE_URL}/settings/platform`, { headers: authHeaders() });
  return unwrap(response.data);
};

// -> { changes: [{ key, label, unit, before, after }], warnings: [{ key, message }] }
export const previewPlatformSettings = async (values) => {
  const response = await api.post(`${BASE_URL}/settings/platform/preview`, { values }, { headers: authHeaders() });
  return unwrap(response.data);
};

// -> { changed: [keys], settings: [...groups] }
export const savePlatformSettings = async (values) => {
  const response = await api.put(`${BASE_URL}/settings/platform`, { values }, { headers: authHeaders() });
  return unwrap(response.data);
};

// ── alert recipients ──────────────────────────────────────────
export const getAlertSettings = async () => {
  const response = await api.get(`${BASE_URL}/settings/alerts`, { headers: authHeaders() });
  return unwrap(response.data);
};

export const setAlertRecipient = async (triggerEvent, userId, enabled) => {
  const response = await api.put(
    `${BASE_URL}/settings/alerts/${triggerEvent}/recipients/${encodeURIComponent(userId)}`,
    { enabled },
    { headers: authHeaders() },
  );
  return unwrap(response.data);
};

// ── schedules (read-only) ─────────────────────────────────────
export const getSchedules = async () => {
  const response = await api.get(`${BASE_URL}/settings/schedules`, { headers: authHeaders() });
  return unwrap(response.data);
};

// ── override reason codes ─────────────────────────────────────
export const getReasonCodes = async () => {
  const response = await api.get(`${BASE_URL}/settings/reason-codes`, { headers: authHeaders() });
  return unwrap(response.data);
};

export const addReasonCode = async (payload) => {
  const response = await api.post(`${BASE_URL}/settings/reason-codes`, payload, { headers: authHeaders() });
  return unwrap(response.data);
};

export const updateReasonCode = async (code, payload) => {
  const response = await api.patch(`${BASE_URL}/settings/reason-codes/${code}`, payload, { headers: authHeaders() });
  return unwrap(response.data);
};

// ── email templates ───────────────────────────────────────────
export const getEmailTemplates = async () => {
  const response = await api.get(`${BASE_URL}/settings/email-templates`, { headers: authHeaders() });
  return unwrap(response.data);
};

export const getEmailTemplate = async (triggerEvent) => {
  const response = await api.get(`${BASE_URL}/settings/email-templates/${triggerEvent}`, { headers: authHeaders() });
  return unwrap(response.data);
};

// Renders with made-up sample values; sends nothing. -> { subject, html, sample_values }
export const previewEmailTemplate = async (triggerEvent, payload) => {
  const response = await api.post(
    `${BASE_URL}/settings/email-templates/${triggerEvent}/preview`, payload, { headers: authHeaders() },
  );
  return unwrap(response.data);
};

export const saveEmailTemplate = async (triggerEvent, payload) => {
  const response = await api.put(
    `${BASE_URL}/settings/email-templates/${triggerEvent}`, payload, { headers: authHeaders() },
  );
  return unwrap(response.data);
};

export const restoreEmailTemplate = async (triggerEvent, templateId) => {
  const response = await api.post(
    `${BASE_URL}/settings/email-templates/${triggerEvent}/versions/${templateId}/restore`, {},
    { headers: authHeaders() },
  );
  return unwrap(response.data);
};
