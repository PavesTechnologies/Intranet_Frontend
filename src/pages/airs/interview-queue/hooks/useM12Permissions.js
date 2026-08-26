import { useAuth } from "@/contexts/AuthContext";

// Role -> permission flags for the HM Review / Interview Queue screen,
// mirroring useCampaignPermissions.js's shape. HM ownership itself is
// enforced server-side on every Epic 1 endpoint (HR_ADMIN exempt) — this
// hook only role-gates, same as its campaigns counterpart, so the UI never
// offers an action the backend would 403/404 anyway.
export default function useM12Permissions() {
  const { hasRole } = useAuth();

  const isHRAdmin = hasRole(["HR_ADMIN"]);
  const isHiringManager = hasRole(["HIRING_MANAGER"]);

  const canActOnQueue = isHRAdmin || isHiringManager;

  return {
    isHRAdmin,
    isHiringManager,

    canViewQueue: canActOnQueue,
    canAdvanceToInterview: canActOnQueue,
    canSelectCandidate: canActOnQueue,
    canRejectAtInterview: canActOnQueue,
  };
}
