import api from "../../../../api/axiosInstance";

const AP_BASE_URL = window.__APP_CONFIG__.AP_BASE_URL;

/**
 * 2-way/3-way matching API. The backend computes match_type, overall_status and per-line
 * variance entirely server-side — this service only reads the result, never recomputes it.
 */
export const matchingService = {
  /** @param {string|number} invoiceId @returns {Promise<Object>} MatchResult */
  async getMatching(invoiceId) {
    const response = await api.get(`${AP_BASE_URL}/invoice/${Number(invoiceId)}/matching`);
    return response.data;
  },
};

export default matchingService;
