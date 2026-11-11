import api from "../../../../api/axiosInstance";
import { logError } from "@/pages/airs/utils/logError";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const getDashboardStats = async () => {
    try {
        const response = await api.get(`${BASE_URL}/dashboard/stats`, { headers: authHeaders() });
        return response.data;
    } catch (error) {
        logError("Error fetching dashboard stats:", error);
        throw error;
    }
};

export const getHiringFunnel = async (days = 30) => {
    try {
        const response = await api.get(`${BASE_URL}/dashboard/hiring-funnel`, {
            params: { days },
            headers: authHeaders(),
        });
        return response.data;
    } catch (error) {
        logError("Error fetching hiring funnel:", error);
        throw error;
    }
};

export const getTopCandidates = async (limit = 5) => {
    try {
        const response = await api.get(`${BASE_URL}/dashboard/top-candidates`, {
            params: { limit },
            headers: authHeaders(),
        });
        return response.data;
    } catch (error) {
        logError("Error fetching top candidates:", error);
        throw error;
    }
};

export const getDashboardNotifications = async (limit = 10) => {
    try {
        const response = await api.get(`${BASE_URL}/dashboard/notifications`, {
            params: { limit },
            headers: authHeaders(),
        });
        return response.data;
    } catch (error) {
        logError("Error fetching dashboard notifications:", error);
        throw error;
    }
};
export const getStageTiming = async (campaignId) => {
  const response = await api.get(
    `${BASE_URL}/dashboard/campaigns/${campaignId}/stage-timing`,
    { headers: authHeaders() },
  );
  return response.data?.data || [];
};

// ── resume-derived filters ───────────────────────────────

// Returns null when no filter in this family is active, so the caller knows
// not to intersect (distinct from an empty array meaning "matched nothing").
export const filterCandidates = async (campaignId, filters = {}) => {
  const params = new URLSearchParams();
  const simple = [
    "experience_min", "experience_max", "uploaded_by",
    "uploaded_from", "uploaded_to", "upload_type",
  ];
  let any = false;
  simple.forEach((k) => {
    if (filters[k] !== undefined && filters[k] !== null && filters[k] !== "") {
      params.append(k, filters[k]);
      any = true;
    }
  });
  (filters.degree_levels || []).forEach((d) => { params.append("degree_levels", d); any = true; });
  if (filters.include_unknown_experience === false) {
    params.append("include_unknown_experience", "false");
  }
  if (!any) return null;

  const response = await api.get(
    `${BASE_URL}/dashboard/campaigns/${campaignId}/candidate-filter?${params.toString()}`,
    { headers: authHeaders() },
  );
  return response.data?.data?.campaign_candidate_ids || [];
};

export const getCampaignUploaders = async (campaignId) => {
  const response = await api.get(
    `${BASE_URL}/dashboard/campaigns/${campaignId}/uploaders`,
    { headers: authHeaders() },
  );
  return response.data?.data || [];
};
