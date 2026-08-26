// Service layer for the HM Review / Interview Queue's row actions (Epic 1) —
// same conventions as src/pages/airs/prompt-templates/services/promptTemplateService.js.
// All 3 endpoints are HIRING_MANAGER/HR_ADMIN-gated with HM ownership
// enforced server-side, and return the full CandidateScorecardResponse on
// success — callers only need to know the action succeeded (the target
// stage after each is deterministic) so the response is passed through
// unmapped.
import api from "@/api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// HM_REVIEW -> INTERVIEW
export const advanceToInterview = async (campaignCandidateId) => {
  try {
    const response = await api.post(
      `${BASE_URL}/campaign-candidates/${campaignCandidateId}/advance-to-interview`,
      {},
      { headers: authHeaders() }
    );
    return response.data?.data || null;
  } catch (error) {
    console.error("Error advancing candidate to interview:", error);
    throw error;
  }
};

// INTERVIEW -> SELECTED
export const selectCandidate = async (campaignCandidateId) => {
  try {
    const response = await api.post(
      `${BASE_URL}/campaign-candidates/${campaignCandidateId}/select`,
      {},
      { headers: authHeaders() }
    );
    return response.data?.data || null;
  } catch (error) {
    console.error("Error selecting candidate:", error);
    throw error;
  }
};

// INTERVIEW -> REJECTED. Reason required, max 500 words (enforced server-side
// too — see RejectAtInterviewModal.jsx for the matching client-side check).
export const rejectAtInterview = async (campaignCandidateId, reason) => {
  try {
    const response = await api.post(
      `${BASE_URL}/campaign-candidates/${campaignCandidateId}/reject-interview`,
      { reason },
      { headers: authHeaders() }
    );
    return response.data?.data || null;
  } catch (error) {
    console.error("Error rejecting candidate at interview:", error);
    throw error;
  }
};
