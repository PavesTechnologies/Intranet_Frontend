import api from "../../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * M13-E01-S01 — add an existing candidate to another ACTIVE campaign, reusing
 * their current eligible resume. HR_ADMIN only (enforced server-side).
 *
 * The backend picks the resume, writes stage history, audits the action and
 * re-queues scoring itself, so there is deliberately nothing to do here but
 * pass the target campaign. Known refusals: 409 already in that campaign,
 * 403 campaign closed, 409 campaign paused, 422 no eligible resume.
 */
export const addCandidateToCampaign = async (candidateId, campaignId) => {
  const response = await api.post(
    `${BASE_URL}/talent-pool/candidates/${candidateId}/add-to-campaign`,
    { campaign_id: campaignId },
    { headers: authHeaders() },
  );
  return response.data?.data || null;
};
