import api from "../../../api/axiosInstance";
import { useJobProgress } from "../../../contexts/JobProgressContext";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

// Get token from localStorage (or sessionStorage if you're using that)
const getAuthHeader = () => {
  return localStorage.getItem("token") ? { Authorization: `Bearer ${localStorage.getItem("token")}` } : {};
};

export const approvalService = {
  getPendingApprovals: async () => {
    const response = await api.get(`${BASE_URL}/api/approvals/pending`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  approveRequest: async (requestId, comment) => {
    const response = await api.post(
      `${BASE_URL}/api/approvals/${requestId}/approve`,
      { comment },
      { headers: getAuthHeader() },
    );
    {
      startJob(response.data.data.jobId);
    }
    return response.data;
  },

  rejectRequest: async (requestId, reason) => {
    const response = await api.post(
      `${BASE_URL}/api/approvals/${requestId}/reject`,
      { reason },
      { headers: getAuthHeader() },
    );
    return response.data;
  },
};
