import api from "../../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

// Global Candidate Directory — GET /candidates
// (CandidateDirectoryService.list_candidates). Independent of campaigns,
// the Talent Pool, and Pipeline — every candidate in the system,
// HR_ADMIN only. Only email_hash (exact match) and jurisdiction are real
// backend filters; there's no free-text name/skill search on this endpoint.
export const getCandidateDirectory = async ({ jurisdiction, page = 1, size = 20 } = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/candidates`, {
            params: { jurisdiction: jurisdiction || undefined, page, size },
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching candidate directory:", error);
        throw error;
    }
};
