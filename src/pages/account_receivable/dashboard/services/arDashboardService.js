import api from "../../../../api/axiosInstance";

const AR_BASE_URL =
  window.__APP_CONFIG__?.AR_BASE_URL ||
  window.APP_CONFIG?.AR_BASE_URL ||
  import.meta.env?.VITE_AR_API_BASE_URL ||
  "http://localhost:8080";

const DASHBOARD_URL = `${AR_BASE_URL}/api/v1/dashboard`;

const unwrap = (response) => response?.data?.data ?? response?.data;

/** Backend error message when present, otherwise the fallback. */
export const getDashboardErrorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

/**
 * GET /api/v1/dashboard/summary — KPIs, pipeline, trend, aging, billing-model
 * mix, worklist and recent activity. Money is per currency.
 */
export async function getDashboardSummary({ period = "MTD", signal } = {}) {
  const response = await api.get(`${DASHBOARD_URL}/summary`, { params: { period }, signal });
  return unwrap(response);
}

/**
 * GET /api/v1/dashboard/invoices — ledger rows, soonest due first.
 * view: ALL | OVERDUE | PENDING_APPROVAL | AWAITING_SEND | SENT
 */
export async function getDashboardInvoices({ view = "ALL", q, limit = 100, signal } = {}) {
  const params = { view, limit };
  if (q && q.trim()) params.q = q.trim();
  const response = await api.get(`${DASHBOARD_URL}/invoices`, { params, signal });
  return unwrap(response) || [];
}
