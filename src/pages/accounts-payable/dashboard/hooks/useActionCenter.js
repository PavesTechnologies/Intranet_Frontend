import { useQuery } from "@tanstack/react-query";
import dashboardService from "../services/dashboardService";
import { useAuth } from "../../../../contexts/AuthContext";

// Keyed by the logged-in user, like the role dashboards (the QueryClient outlives a logout).
export const ACTION_CENTER_KEY = (userKey) => ["accountsPayable", "actionCenter", userKey];

/** What this user should do now, across every AP area they work in (GET /dashboard/actions). */
export function useActionCenter() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ACTION_CENTER_KEY(String(user?.user_id ?? user?.sub ?? "anonymous")),
    queryFn: () => dashboardService.getActions(),
    retry: false,
    staleTime: 60_000,
  });
}
