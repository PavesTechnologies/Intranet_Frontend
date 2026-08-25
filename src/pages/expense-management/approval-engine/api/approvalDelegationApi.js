import api from "@/api/axiosInstance";

/**
 * Delegations (/xms/manager/approval-delegations). Create/update/delete carry no role restriction
 * at the URL level (any employee can be a resolved approver, §1.5) - the backend enforces ownership
 * itself (self-service on your own delegation, or ADMIN acting on anyone's). Same functions serve
 * both the Admin table and the approver's own self-service "My Delegate" card - only the UI differs.
 *
 * ApprovalDelegationRequest: { delegatorId, delegateId, startDate?, endDate?, status? }
 */

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const withBase = (extra) => ({ baseURL: EXPENSE_API_BASE, headers: authHeaders(), ...extra });

export const approvalDelegationApi = {
  getAll: () => api.get("/xms/manager/approval-delegations", withBase()),
  getById: (id) => api.get(`/xms/manager/approval-delegations/${id}`, withBase()),
  create: (payload) => api.post("/xms/manager/approval-delegations", payload, withBase()),
  update: (id, payload) => api.put(`/xms/manager/approval-delegations/${id}`, payload, withBase()),
  delete: (id) => api.delete(`/xms/manager/approval-delegations/${id}`, withBase()),
};
