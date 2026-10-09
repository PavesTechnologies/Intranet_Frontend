import api from "@/api/axiosInstance";

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";
const EMPLOYEE_ONBOARDING_URL = window.__APP_CONFIG__?.EMPLOYEE_ONBOARDING_URL || "";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

/** GET /xms/reports/expense-summary?from&to (ISO dates, both optional). */
export const expenseSummaryReportApi = {
  get: ({ from, to } = {}) =>
    api.get("/xms/reports/expense-summary", {
      baseURL: EXPENSE_API_BASE,
      params: { from: from || undefined, to: to || undefined },
      headers: authHeaders(),
    }),
};

export const departmentApi = {
  getAll: () => api.get(`${EMPLOYEE_ONBOARDING_URL}/masters/departments/`, { headers: authHeaders() }),
};
