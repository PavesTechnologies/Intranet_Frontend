import api from "@/api/axiosInstance";

/**
 * Manager team views (/xms/manager/team) - "team" is the caller's direct reports; drafts are never
 * included. expense-reports params: { page (1-based), limit (≤100), sortBy, sortDirection, status,
 * search, employeeId } - an employeeId outside the team is a 403.
 */

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const withBase = (extra) => ({ baseURL: EXPENSE_API_BASE, headers: authHeaders(), ...extra });

export const teamExpensesApi = {
  getMembers: () => api.get("/xms/manager/team/members", withBase()),
  getReports: (params) => api.get("/xms/manager/team/expense-reports", withBase({ params })),
  getSummary: () => api.get("/xms/manager/team/summary", withBase()),
};
