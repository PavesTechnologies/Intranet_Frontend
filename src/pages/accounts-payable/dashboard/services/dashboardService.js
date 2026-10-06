import api from "../../../../api/axiosInstance";

const AP_BASE_URL = window.__APP_CONFIG__.AP_BASE_URL;

/** Copies error.response.status onto error.status, matching every other AP service's
 * convention so callers can branch on error?.status (422 invalid date range, 401/403). */
function withNormalizedStatus(error) {
  error.status = error.status ?? error.response?.status;
  return error;
}

/**
 * AP Dashboard summary API — one endpoint drives the entire dashboard (KPIs, action-required,
 * status distribution, financial summary, trends, recent activity). The backend resolves
 * authorization itself (the `sections` array in the response names what this user is allowed to
 * see) — this service never filters or recomputes anything, just fetches and returns raw.
 */
export const dashboardService = {
  /**
   * @param {{fromDate?: string, toDate?: string}} [params] - YYYY-MM-DD, both optional; backend
   *   defaults to the last 30 days when omitted and returns the resolved period either way.
   * @returns {Promise<Object>} DashboardSummaryDTO — {generated_at, period, sections, kpis,
   *   action_required, status_summary, financial_summary, trends, recent_activity}
   */
  async getSummary({ fromDate, toDate } = {}) {
    try {
      const response = await api.get(`${AP_BASE_URL}/dashboard/summary`, {
        params: {
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        },
      });
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },
};

export default dashboardService;
