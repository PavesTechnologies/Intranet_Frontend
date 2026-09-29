import api from "@/api/axiosInstance";

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Service layer for Cash Advance operations mapping to CashAdvanceController endpoints:
 * - GET/PUT/DELETE /xms/employee/cash-advances/{advanceId}
 * - GET/POST /xms/employee/cash-advances
 * - POST /xms/employee/cash-advances/{advanceId}/submit
 * - POST /xms/employee/cash-advances/{advanceId}/approve
 * - POST /xms/employee/cash-advances/{advanceId}/reject
 * - POST /xms/employee/cash-advances/{advanceId}/disburse
 * - POST /xms/employee/cash-advances/{advanceId}/cancel
 * - GET /xms/employee/cash-advances/my-advances
 */
export const cashAdvanceApi = {
  getAll: (params) =>
    api.get("/xms/employee/cash-advances", {
      baseURL: EXPENSE_API_BASE,
      params,
      headers: authHeaders(),
    }),

  getMyApprovals: (params) =>
    api.get("/xms/employee/cash-advances/my-approvals", {
      baseURL: EXPENSE_API_BASE,
      params,
      headers: authHeaders(),
    }),

  getMyAdvances: (params) =>
    api.get("/xms/employee/cash-advances/my-advances", {
      baseURL: EXPENSE_API_BASE,
      params,
      headers: authHeaders(),
    }),

  getById: (advanceId) =>
    api.get(`/xms/employee/cash-advances/${advanceId}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  create: (payload) =>
    api.post("/xms/employee/cash-advances", payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  update: (advanceId, payload) =>
    api.put(`/xms/employee/cash-advances/${advanceId}`, payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  delete: (advanceId) =>
    api.delete(`/xms/employee/cash-advances/${advanceId}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  submit: (advanceId) =>
    api.post(`/xms/employee/cash-advances/${advanceId}/submit`, null, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  approve: (advanceId) =>
    api.post(`/xms/employee/cash-advances/${advanceId}/approve`, null, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  reject: (advanceId, reason) =>
    api.post(`/xms/employee/cash-advances/${advanceId}/reject`, null, {
      baseURL: EXPENSE_API_BASE,
      params: reason ? { reason } : undefined,
      headers: authHeaders(),
    }),

  disburse: (advanceId) =>
    api.post(`/xms/employee/cash-advances/${advanceId}/disburse`, null, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  cancel: (advanceId) =>
    api.post(`/xms/employee/cash-advances/${advanceId}/cancel`, null, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  // Settlement / Reimbursement Adjustment Endpoints (/xms/finance/reimbursements)
  getReimbursementAdjustments: (params) =>
    api.get("/xms/finance/reimbursements", {
      baseURL: EXPENSE_API_BASE,
      params,
      headers: authHeaders(),
    }),

  getReimbursementAdjustmentById: (adjustmentId) =>
    api.get(`/xms/finance/reimbursements/${adjustmentId}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  createReimbursementAdjustment: (payload) =>
    api.post("/xms/finance/reimbursements", payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  updateReimbursementAdjustment: (adjustmentId, payload) =>
    api.put(`/xms/finance/reimbursements/${adjustmentId}`, payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  deleteReimbursementAdjustment: (adjustmentId) =>
    api.delete(`/xms/finance/reimbursements/${adjustmentId}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
};

export default cashAdvanceApi;
