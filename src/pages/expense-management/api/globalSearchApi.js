import api from "@/api/axiosInstance";
import { XMS_BASE_URL } from "@/pages/expense-management/api/xmsBaseUrl";

const EXPENSE_API_BASE = XMS_BASE_URL;

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const withBase = (extra) => ({ baseURL: EXPENSE_API_BASE, headers: authHeaders(), ...extra });

/**
 * Global expense search API
 * Spec: EP12-S1 - Global search across reports and line items
 * Backend enforces role-based scope (employee/manager/admin)
 * API: GET /api/v1/search?q=<query>&page=0&size=20
 */
export const globalSearchApi = {
  search: (query = "", page = 0, size = 20) => {
    if (!query || query.trim() === "") {
      return Promise.resolve({ data: { content: [], totalElements: 0, totalPages: 0 } });
    }
    return api.get(`/xms/api/v1/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`, withBase());
  },
};
