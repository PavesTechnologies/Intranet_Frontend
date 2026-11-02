import api from "@/api/axiosInstance";
import { XMS_BASE_URL } from "@/pages/expense-management/api/xmsBaseUrl";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const json = () => ({ baseURL: XMS_BASE_URL, headers: authHeaders() });

const unwrap = (res) => res?.data?.data ?? res?.data ?? null;

/**
 * Carry-forward of an unused advance balance to another approved advance (CashAdvanceCarryForwardController).
 * The server only accepts it while the feature is enabled (expense.carry-forward.enabled).
 */
export const carryForwardApi = {
  // The carry-forward ready on an advance: { readyAmount, currencyCode, outstandingBalance }.
  getReady: (advanceId) => api.get(`/xms/cash-advance-carry-forwards/ready/${advanceId}`, json()).then(unwrap),
  // The balance is marked ready here. It is added to the employee's next approved INR advance automatically.
  markReady: (payload) => api.post("/xms/cash-advance-carry-forwards/ready", payload, json()).then(unwrap),
  cancelReady: (advanceId, reason) =>
    api.delete(`/xms/cash-advance-carry-forwards/ready/${advanceId}`, { ...json(), params: { reason } }).then(unwrap),
  propose: (payload) => api.post("/xms/cash-advance-carry-forwards", payload, json()).then(unwrap),
  approve: (carryForwardId, reason) =>
    api.post(`/xms/cash-advance-carry-forwards/${carryForwardId}/approve`, { reason }, json()).then(unwrap),
  reject: (carryForwardId, reason) =>
    api.post(`/xms/cash-advance-carry-forwards/${carryForwardId}/reject`, { reason }, json()).then(unwrap),
};

export default carryForwardApi;
