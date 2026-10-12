import { useQuery } from "@tanstack/react-query";
import dashboardService from "../services/dashboardService";

export const DASHBOARD_SUMMARY_KEY = (fromDate, toDate) => [
  "accountsPayable",
  "dashboardSummary",
  fromDate || null,
  toDate || null,
];

/**
 * @param {{fromDate?: string, toDate?: string}} [range]
 * retry: false — a 422 (invalid range) shouldn't be silently retried; the caller surfaces it.
 */
export function useDashboardSummary({ fromDate, toDate } = {}) {
  return useQuery({
    queryKey: DASHBOARD_SUMMARY_KEY(fromDate, toDate),
    queryFn: () => dashboardService.getSummary({ fromDate, toDate }),
    retry: false,
  });
}

export default useDashboardSummary;
