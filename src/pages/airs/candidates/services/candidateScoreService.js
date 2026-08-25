import api from "../../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

// Candidate Scorecard — GET /airs/campaign-candidates/{campaign_candidate_id}
export const getCampaignCandidateDetail = async (campaignCandidateId) => {
  try {
    const response = await api.get(`${BASE_URL}/campaign-candidates/${campaignCandidateId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching campaign candidate detail:", error);
    throw error;
  }
};

// Candidate Scorecard — Deterministic tab —
// GET /airs/campaign-candidates/{campaign_candidate_id}/deterministic
export const getDeterministicScoreBreakdown = async (campaignCandidateId) => {
  try {
    const response = await api.get(`${BASE_URL}/campaign-candidates/${campaignCandidateId}/deterministic`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching deterministic score breakdown:", error);
    throw error;
  }
};

// Candidate Scorecard — Semantic tab —
// GET /airs/campaign-candidates/{campaign_candidate_id}/semantic
export const getSemanticScoreBreakdown = async (campaignCandidateId) => {
  try {
    const response = await api.get(`${BASE_URL}/campaign-candidates/${campaignCandidateId}/semantic`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching semantic score breakdown:", error);
    throw error;
  }
};

// Candidate Scorecard — AI Evaluation tab —
// GET /airs/campaign-candidates/{campaign_candidate_id}/ai-evaluation
export const getAiEvaluationBreakdown = async (campaignCandidateId) => {
  try {
    const response = await api.get(`${BASE_URL}/campaign-candidates/${campaignCandidateId}/ai-evaluation`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching AI evaluation breakdown:", error);
    throw error;
  }
};

// Candidate Scorecard — Final Status tab —
// GET /airs/campaign-candidates/{campaign_candidate_id}/composite
export const getCompositeScoreBreakdown = async (campaignCandidateId) => {
  try {
    const response = await api.get(`${BASE_URL}/campaign-candidates/${campaignCandidateId}/composite`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching composite score breakdown:", error);
    throw error;
  }
};

// Candidate Scorecard — Final Status tab —
// POST /airs/campaign-candidates/{campaign_candidate_id}/send-rejection-email
// Only valid when pipeline_stage === "REJECTED" (backend-enforced); no
// dedup lock, so this is safe to call more than once for the same candidate.
export const sendRejectionEmail = async (campaignCandidateId) => {
  try {
    const response = await api.post(
      `${BASE_URL}/campaign-candidates/${campaignCandidateId}/send-rejection-email`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error sending rejection email:", error);
    throw error;
  }
};

// Candidate list / Candidates tab — bulk version of the above.
// POST /airs/campaign-candidates/bulk-send-rejection-email
// Per-candidate validation (must be REJECTED) — a mixed batch returns
// partial success ({queued, failed}), not all-or-nothing; max 200 ids,
// an empty list is a clean no-op. Re-sending is allowed, same as the
// single version.
export const bulkSendRejectionEmail = async (campaignCandidateIds) => {
  try {
    const response = await api.post(
      `${BASE_URL}/campaign-candidates/bulk-send-rejection-email`,
      { campaign_candidate_ids: campaignCandidateIds },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error bulk-sending rejection emails:", error);
    throw error;
  }
};
