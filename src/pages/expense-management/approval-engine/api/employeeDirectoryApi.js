import api from "@/api/axiosInstance";
import { XMS_BASE_URL } from "@/pages/expense-management/api/xmsBaseUrl";

/**
 * Same cross-service employee lookup already used by PolicyAssignments.jsx
 * (src/pages/expense-management/pages/PolicyAssignments.jsx) - the Employee Onboarding service
 * exposes the org's employee directory at this path; there is no expense-management-local
 * employee list, so approval screens resolve employeeId -> name the same way policy assignment
 * screens already do, rather than inventing a second integration.
 */
const EMPLOYEE_ONBOARDING_URL = window.__APP_CONFIG__?.EMPLOYEE_ONBOARDING_URL || "";
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const EXPENSE_API_BASE = XMS_BASE_URL;

export const employeeDirectoryApi = {
  getAll: () =>
    api.get(`${EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/`, {
      headers: authHeaders(),
    }),
  // Active employees from the expense service's own employee cache - readable by every role, so
  // non-admin approvers can pick their own delegate (Employee Onboarding's list may not be).
  getActive: () => api.get("/xms/employees", { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
};
