import api from "@/api/axiosInstance";

/**
 * Admin config backing ApproverSourceType.DEPARTMENT_OWNER resolution (/xms/admin/department-approvers,
 * ADMIN-only). DepartmentApproverRequest: { departmentUuid, approverEmployeeId, status? }.
 */

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const withBase = (extra) => ({ baseURL: EXPENSE_API_BASE, headers: authHeaders(), ...extra });

export const departmentApproverApi = {
  getAll: () => api.get("/xms/admin/department-approvers", withBase()),
  getById: (id) => api.get(`/xms/admin/department-approvers/${id}`, withBase()),
  create: (payload) => api.post("/xms/admin/department-approvers", payload, withBase()),
  update: (id, payload) => api.put(`/xms/admin/department-approvers/${id}`, payload, withBase()),
  delete: (id) => api.delete(`/xms/admin/department-approvers/${id}`, withBase()),
};
