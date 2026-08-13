import api from "../../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const getHrAdminSummary = async () => {
  const response = await api.get(`${BASE_URL}/dashboard/hr-admin/summary`, {
    headers: authHeaders(),
  });
  return response.data?.data || null;
};

export const getRecruiterSummary = async () => {
  const response = await api.get(`${BASE_URL}/dashboard/recruiter/summary`, {
    headers: authHeaders(),
  });
  return response.data?.data || null;
};

// Scoping is decided server-side from the caller's role — HR_ADMIN gets every
// campaign, RECRUITER only the ones they uploaded to or created.
export const getDashboardCampaigns = async ({
  limit = 12, show_closed = false, search, status,
} = {}) => {
  const params = { limit, show_closed };
  if (search) params.search = search;
  if (status && status !== "All") params.status = status;
  const response = await api.get(`${BASE_URL}/dashboard/campaigns`, {
    params,
    headers: authHeaders(),
  });
  return response.data?.data || [];
};

export const getNavBadges = async () => {
  const response = await api.get(`${BASE_URL}/dashboard/badges`, {
    headers: authHeaders(),
  });
  return response.data?.data || null;
};

export const getStageTiming = async (campaignId) => {
  const response = await api.get(
    `${BASE_URL}/dashboard/campaigns/${campaignId}/stage-timing`,
    { headers: authHeaders() },
  );
  return response.data?.data || [];
};

// ── skill search ─────────────────────────────────────────

export const getSkillSuggestions = async (campaignId, q, limit = 10) => {
  const response = await api.get(
    `${BASE_URL}/dashboard/campaigns/${campaignId}/skill-suggestions`,
    { params: { q, limit }, headers: authHeaders() },
  );
  return response.data?.data || [];
};

// AND logic — a candidate must hold every skill passed here.
export const filterCandidatesBySkills = async (campaignId, skillIds, q = "") => {
  const params = new URLSearchParams();
  skillIds.forEach((id) => params.append("skill_ids", id));
  if (q) params.append("q", q);
  const response = await api.get(
    `${BASE_URL}/dashboard/campaigns/${campaignId}/skill-filter?${params.toString()}`,
    { headers: authHeaders() },
  );
  return response.data?.data || { campaign_candidate_ids: [], match_tiers: {}, result_count: 0 };
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
