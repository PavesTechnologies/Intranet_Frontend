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

// ── stage transitions (phase 2) ───────────────────────────────
// { stages, terminal_stages, roles, routes_for_role, transitions: [{ id, previous_stage, from_stage, to_stage,
//   allowed_roles, requires_reason, protected, system }] }
export const getTransitions = async () => {
  const response = await api.get(`${BASE_URL}/settings/transitions`, { headers: authHeaders() });
  return unwrap(response.data);
};

// changes: [{ op: "update", id, allowed_roles?, requires_reason? } | { op: "add", ... } | { op: "remove", id }]
// 422 data.problems: every pipeline rule the batch would break.
export const previewTransitions = async (changes) => {
  const response = await api.post(`${BASE_URL}/settings/transitions/preview`, { changes }, { headers: authHeaders() });
  return unwrap(response.data);
};

export const saveTransitions = async (changes) => {
  const response = await api.put(`${BASE_URL}/settings/transitions`, { changes }, { headers: authHeaders() });
  return unwrap(response.data);
};

// ── scoring (phase 3) ─────────────────────────────────────────
// { defaults, schema: { section: { key: { type, min?, max? } } | { type } }, current_version_id }
export const getScoringConfig = async () => {
  const response = await api.get(`${BASE_URL}/settings/scoring-config`, { headers: authHeaders() });
  return unwrap(response.data);
};

// { config_hash, runs: [...], promotion_run }
export const getGoldenRuns = async (versionId) => {
  const response = await api.get(`${BASE_URL}/settings/scoring-versions/${versionId}/golden-runs`, { headers: authHeaders() });
  return unwrap(response.data);
};

// { model, cap, used_today, reserved_for_candidates, needed }
export const getGoldenBudget = async (versionId, needed) => {
  const response = await api.get(`${BASE_URL}/settings/scoring-versions/${versionId}/golden-runs/budget`, {
    headers: authHeaders(), params: { needed },
  });
  return unwrap(response.data);
};

// kind: "ESTIMATE" (no LLM call) | "RUN" (needs a fresh estimate; full and no-LLM)
export const startGoldenRun = async (versionId, kind) => {
  const response = await api.post(`${BASE_URL}/settings/scoring-versions/${versionId}/golden-runs`, { kind }, {
    headers: authHeaders(),
  });
  return unwrap(response.data);
};

// ── reference data impact (phase 3) ───────────────────────────
// kind: skill | certification | education_relation | profile_template
// -> { campaigns: [{ id, name }], candidates_marked_out_of_date }
export const previewReferenceImpact = async (payload) => {
  const response = await api.post(`${BASE_URL}/settings/reference-impact`, payload, { headers: authHeaders() });
  return unwrap(response.data);
};
