import axios from "axios";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

// Get token from localStorage (or sessionStorage if you're using that)
const getAuthHeader = () => {
  return localStorage.getItem("token") ? { Authorization: `Bearer ${localStorage.getItem("token")}` } : {};
};

export const approvalService = {
  getPendingApprovals: async () => {
    const response = await axios.get(`${BASE_URL}/api/approvals/pending`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  approveRequest: async (requestId, comment) => {
    await axios.post(
      `${BASE_URL}/api/approvals/${requestId}/approve`,
      { comment },
      { headers: getAuthHeader() },
    );
  },

  rejectRequest: async (requestId, reason) => {
    await axios.post(
      `${BASE_URL}/api/approvals/${requestId}/reject`,
      { reason },
      { headers: getAuthHeader() },
    );
  },
};
