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
