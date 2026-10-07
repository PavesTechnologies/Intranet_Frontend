import { useQuery, keepPreviousData } from "@tanstack/react-query";
import dashboardService from "../services/dashboardService";

export const DASHBOARD_ACTIVITY_KEY = ({ search, entityType, fromDate, toDate, page, pageSize }) => [
  "accountsPayable",
  "dashboardActivity",
  search || "",
  entityType || null,
  fromDate || null,
  toDate || null,
  page || 1,
  pageSize || null,
];

/**
 * Full activity-history search (GET /apm/dashboard/activity) — distinct from useDashboardSummary's
 * `recent_activity`, which is capped to whatever the summary response already loaded. Used by both
 * the Recent Activity widget's search box and the standalone Activity page.
 * `placeholderData: keepPreviousData` keeps the last page's rows on screen while a new
 * search/page/filter is loading, matching every other paginated AP list (useInvoices, etc.).
 *
 * @param {{search?: string, entityType?: string, fromDate?: string, toDate?: string, page?: number, pageSize?: number, enabled?: boolean}} [params]
 */
export function useDashboardActivity({ search, entityType, fromDate, toDate, page = 1, pageSize = 20, enabled = true } = {}) {
  return useQuery({
    queryKey: DASHBOARD_ACTIVITY_KEY({ search, entityType, fromDate, toDate, page, pageSize }),
    queryFn: () => dashboardService.getActivity({ search, entityType, fromDate, toDate, page, pageSize }),
    placeholderData: keepPreviousData,
    enabled,
    retry: false,
  });
}

export default useDashboardActivity;
