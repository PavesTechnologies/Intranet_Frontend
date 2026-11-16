import { useAuth } from "../../../../contexts/AuthContext";

// Role → permission flags for the Campaign feature, mirroring exactly what
// the backend enforces via require_roles(...) on every /campaigns endpoint
// (Ai_Hiring_Module/app/api/routes/campaign_routes.py). Components consume
// these flags instead of calling hasRole() ad hoc, so the frontend can never
// drift from one page to the next on the same rule — and restricted API
// calls are simply never attempted for roles the backend would 403 anyway.
//
// Follows the pipeline module's hooks/ convention (usePipelineBoard).
export default function useCampaignPermissions() {
  const { hasRole } = useAuth();

  const isHRAdmin = hasRole(["HR_ADMIN"]);
  const isRecruiter = hasRole(["RECRUITER"]);
  const isHiringManager = hasRole(["HIRING_MANAGER"]);

  return {
    isHRAdmin,
    isRecruiter,
    isHiringManager,

    // ── HR_ADMIN only ────────────────────────────────────────────────
    // create / edit / pause / resume / close / reopen / duplicate
    canManageCampaigns: isHRAdmin,
    // scoring edit, reset, presets, platform defaults
    canManageScoring: isHRAdmin,
    canViewTimeline: isHRAdmin,

    // ── HR_ADMIN + RECRUITER + HIRING_MANAGER ────────────────────────
    // pipeline-summary, processing-status, dead-letter-queue
    // NOTE: backend require_roles on these endpoints must also allow
    // HIRING_MANAGER, or this will 403 despite being visible here.
    canViewPipeline: isHRAdmin || isRecruiter || isHiringManager,

    // ── any campaign role (backend scopes HIRING_MANAGER to own) ────
    canViewCampaigns: isHRAdmin || isRecruiter || isHiringManager,
  };
}
