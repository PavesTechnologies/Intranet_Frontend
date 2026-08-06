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
