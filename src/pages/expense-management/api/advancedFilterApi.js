import api from "@/api/axiosInstance";

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const withBase = (extra) => ({ baseURL: EXPENSE_API_BASE, headers: authHeaders(), ...extra });

/**
 * Advanced Multi-Criteria Filter API
 * Spec: EP12-S2 - Advanced filters for precise expense data narrowing
 * Backend enforces role-based scope (employee/manager/admin)
 * API: GET /api/v1/expense-reports?status=&dateFrom=&dateTo=&category=&costCenter=&amountMin=&amountMax=&billable=&page=0&size=20
 */
export const advancedFilterApi = {
  filter: (filters = {}, page = 0, size = 20) => {
    const params = new URLSearchParams();

    // Add filter parameters if they have values
    if (filters.status) params.append("status", filters.status);
    if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.append("dateTo", filters.dateTo);
    if (filters.category) params.append("category", filters.category);
    if (filters.costCenter) params.append("costCenter", filters.costCenter);
    if (filters.amountMin !== null && filters.amountMin !== undefined) params.append("amountMin", filters.amountMin);
    if (filters.amountMax !== null && filters.amountMax !== undefined) params.append("amountMax", filters.amountMax);
    if (filters.employeeId) params.append("employeeId", filters.employeeId);
    if (filters.billable !== null && filters.billable !== undefined) params.append("billable", filters.billable);

    params.append("page", page);
    params.append("size", size);

    return api.get(`/expense-reports?${params.toString()}`, withBase());
  },
};
