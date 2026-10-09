import { useQuery } from "@tanstack/react-query";
import dashboardService from "../services/dashboardService";

export const FINANCE_DASHBOARD_KEY = ["accountsPayable", "financeDashboard"];

/** Finance Executive dashboard — a 403 (no PAYMENT_VIEW/PAYMENT_PROCESS) is not retried. */
export function useFinanceDashboard({ enabled = true } = {}) {
  return useQuery({
    queryKey: FINANCE_DASHBOARD_KEY,
    queryFn: () => dashboardService.getFinance(),
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}

export default useFinanceDashboard;
