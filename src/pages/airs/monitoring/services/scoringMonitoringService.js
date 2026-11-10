// Scoring monitoring (/monitoring/scoring-summary, /monitoring/llm-prices - HR_ADMIN).
// Same conventions as outcomeOverrideService.js.
import api from "@/api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const unwrap = (data) => data?.data ?? data ?? {};

// { outcomes_over_time, vote_quality, llm_usage, quota, tasks, days, bucket }
export const getScoringSummary = async ({ days = 30, campaignId } = {}) => {
  const params = { days };
  if (campaignId) params.campaign_id = campaignId;
  const response = await api.get(`${BASE_URL}/monitoring/scoring-summary`, { headers: authHeaders(), params });
  return unwrap(response.data);
};

// { currency, unit, models: { "<model>": { input, output, source } } }
export const getLlmPrices = async () => {
  const response = await api.get(`${BASE_URL}/monitoring/llm-prices`, { headers: authHeaders() });
  return unwrap(response.data);
};

export const saveLlmPrices = async (models) => {
  const response = await api.put(`${BASE_URL}/monitoring/llm-prices`, { models }, { headers: authHeaders() });
  return unwrap(response.data);
};

// { min_group_size, candidates, meeting_min_experience, dimensions: [{ key, label, all, meeting_min_experience }], notes }
export const getFairnessReport = async ({ days, campaignId } = {}) => {
  const params = {};
  if (days) params.days = days;
  if (campaignId) params.campaign_id = campaignId;
  const response = await api.get(`${BASE_URL}/monitoring/fairness-report`, { headers: authHeaders(), params });
  return unwrap(response.data);
};

export const saveFairnessMinGroupSize = async (minGroupSize) => {
  const response = await api.put(`${BASE_URL}/monitoring/fairness-settings`, { min_group_size: minGroupSize },
    { headers: authHeaders() });
  return unwrap(response.data);
};

// Emails stuck in SENDING (delivery unknown): [{ id, trigger_event, recipient_type, minutes, provider_message_id, ... }]
export const getStuckEmails = async () => {
  const response = await api.get(`${BASE_URL}/monitoring/stuck-emails`, { headers: authHeaders() });
  const data = unwrap(response.data);
  return Array.isArray(data) ? data : [];
};

// outcome: "SENT" (delivered, per the email provider) | "FAILED" (not delivered). Audited; sends nothing.
export const resolveStuckEmail = async (notificationId, outcome) => {
  const response = await api.post(`${BASE_URL}/monitoring/stuck-emails/${notificationId}/resolve`,
    { outcome }, { headers: authHeaders() });
  return unwrap(response.data);
};
