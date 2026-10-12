import { useQuery } from "@tanstack/react-query";
import dashboardService from "../services/dashboardService";
import { useAuth } from "../../../../contexts/AuthContext";

// Keyed by the logged-in user: the QueryClient outlives a logout/login in the same tab, so an
// un-keyed cache would show the previous user's views (and a 403 for them) to the next user.
const userKeyOf = (user) => String(user?.user_id ?? user?.sub ?? "anonymous");
export const DASHBOARD_VIEWS_KEY = (userKey) => ["accountsPayable", "dashboardViews", userKey];
export const ROLE_DASHBOARD_KEY = (view, userKey) => ["accountsPayable", "roleDashboard", userKey, view];

/** Which role dashboards this user may open — decided by the backend from the JWT. */
export function useDashboardViews() {
  const { user } = useAuth();
  return useQuery({
    queryKey: DASHBOARD_VIEWS_KEY(userKeyOf(user)),
    queryFn: () => dashboardService.getViews(),
    retry: false,
    staleTime: 5 * 60_000,
  });
}

/** One role dashboard's data; fetched only while that view is open. */
export function useRoleDashboard(view, { enabled = true } = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ROLE_DASHBOARD_KEY(view, userKeyOf(user)),
    queryFn: () => dashboardService.getView(view),
    enabled: Boolean(view) && enabled,
    retry: false,
    staleTime: 60_000,
  });
}
