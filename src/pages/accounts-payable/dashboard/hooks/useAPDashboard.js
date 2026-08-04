import { useQuery } from "@tanstack/react-query";
import apDashboardService from "../services/apDashboardService";

export const AP_DASHBOARD_KEY = ["accountsPayable", "dashboard"];

export const useAPDashboard = () =>
  useQuery({
    queryKey: AP_DASHBOARD_KEY,
    queryFn: apDashboardService.getDashboardSummary,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

export default useAPDashboard;
