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
