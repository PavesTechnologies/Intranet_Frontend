import api from "@/api/axiosInstance";
import { XMS_BASE_URL } from "@/pages/expense-management/api/xmsBaseUrl";

/**
 * Saved filters (/xms/employee/saved-filters) - always the caller's own; the backend takes the
 * owner from the token. SavedFilterRequest: { filterName, filterJson (≤255 chars) }.
 */

const EXPENSE_API_BASE = XMS_BASE_URL;

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const withBase = () => ({ baseURL: EXPENSE_API_BASE, headers: authHeaders() });

export const savedFiltersApi = {
  getAll: () => api.get("/xms/employee/saved-filters", withBase()),
  create: (payload) => api.post("/xms/employee/saved-filters", payload, withBase()),
  update: (id, payload) => api.put(`/xms/employee/saved-filters/${id}`, payload, withBase()),
  delete: (id) => api.delete(`/xms/employee/saved-filters/${id}`, withBase()),
};
