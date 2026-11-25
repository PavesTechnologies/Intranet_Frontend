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

/** GET /xms/reports/employee-money?from&to: advances, claims, tax and budget per employee and department (Finance). */
export const employeeMoneyReportApi = {
  get: ({ from, to } = {}) =>
    api.get("/xms/reports/employee-money", {
      baseURL: EXPENSE_API_BASE,
      params: { from: from || undefined, to: to || undefined },
      headers: authHeaders(),
    }),
};

/**
 * GET /xms/reports/tax/itc-register?from&to&itcStatus: every submitted line with GST in the window (by expense date),
 * with its recoverable ITC, ITC status (NOT_RECOVERABLE / UNVERIFIED / VERIFIED) and supplier GSTIN, plus totals (Finance).
 */
export const itcRegisterApi = {
  get: ({ from, to, itcStatus } = {}) =>
    api.get("/xms/reports/tax/itc-register", {
      baseURL: EXPENSE_API_BASE,
      params: { from: from || undefined, to: to || undefined, itcStatus: itcStatus || undefined },
      headers: authHeaders(),
    }),
  /** Records that these lines' ITC was claimed (outside, on the GST portal) in GSTR-3B month returnPeriod (yyyy-MM). */
  claim: ({ lineItemIds, returnPeriod, note }) =>
    api.post("/xms/reports/tax/itc-register/claim", { lineItemIds, returnPeriod, note: note || undefined }, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  /** Undoes a claim; note is the required reason. */
  unclaim: ({ lineItemIds, note }) =>
    api.post("/xms/reports/tax/itc-register/unclaim", { lineItemIds, note }, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
};

export const departmentApi = {
  getAll: () => api.get(`${EMPLOYEE_ONBOARDING_URL}/masters/departments/`, { headers: authHeaders() }),
};
