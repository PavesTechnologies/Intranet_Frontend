// Recruiter overrides report (/outcome-overrides/report, HR_ADMIN).
// Same conventions as settings/services/profileTemplateService.js.
import api from "@/api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const unwrap = (data) => data?.data ?? data ?? {};

// filters: { campaignId, since, until } - since/until as YYYY-MM-DD (until is exclusive)
export const getOutcomeOverrideReport = async ({ campaignId, since, until } = {}) => {
  const params = {};
  if (campaignId) params.campaign_id = campaignId;
  if (since) params.since = `${since}T00:00:00`;
  if (until) params.until = `${until}T00:00:00`;
  const response = await api.get(`${BASE_URL}/outcome-overrides/report`, { headers: authHeaders(), params });
  return unwrap(response.data);
};
