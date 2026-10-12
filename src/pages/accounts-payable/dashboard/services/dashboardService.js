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
  /** Role dashboards this user may open: [{key, label}] in display order (GET /dashboard/views). */
  async getViews() {
    try {
      const response = await api.get(`${AP_BASE_URL}/dashboard/views`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /** One role dashboard: "management" | "approvals" | "my_work" | "finance" (GET /dashboard/view/{key}). */
  async getView(key) {
    try {
      const response = await api.get(`${AP_BASE_URL}/dashboard/view/${key}`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /**
   * Finance Executive dashboard (GET /dashboard/finance) — action cards, ageing, upcoming
   * payments by month, recent payments, TDS follow-ups. Every amount is computed by the backend
   * (ap_reporting_service.py) and carried per currency; nothing is recomputed here.
   */
  async getFinance() {
    try {
      const response = await api.get(`${AP_BASE_URL}/dashboard/finance`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

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

  /**
   * Searches the full activity history — unlike `recent_activity` on the summary response (capped
   * to whatever the dashboard already loaded), this hits the backend's audit log directly
   * (dashboard_dao.py's search_audit), so it finds activity well past what the dashboard shows.
   * Same visibility rules as /summary (authorization comes from the caller's token — an
   * Invoice-only user can never search up vendor/procurement activity), and the same date-range
   * limits (30 days default, 366 max; an out-of-range span or unknown entity_type is a 422).
   *
   * @param {{search?: string, entityType?: string, fromDate?: string, toDate?: string, page?: number, pageSize?: number}} [params]
   * @returns {Promise<{period: object, page: number, page_size: number, total: number, items: Array}>}
   *   `items` share recent_activity's exact shape: {title, entity_type, entity_id, reference, actor, occurred_at}.
   */
  async getActivity({ search, entityType, fromDate, toDate, page, pageSize } = {}) {
    try {
      const response = await api.get(`${AP_BASE_URL}/dashboard/activity`, {
        params: {
          search: search || undefined,
          entity_type: entityType || undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          page: page || undefined,
          page_size: pageSize || undefined,
        },
      });
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },
};

export default dashboardService;
