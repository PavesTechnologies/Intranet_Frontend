import api from "@/api/axiosInstance";
import { XMS_BASE_URL } from "@/pages/expense-management/api/xmsBaseUrl";

const EXPENSE_API_BASE = XMS_BASE_URL;
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
