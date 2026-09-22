import { useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, ArrowRight, CheckCircle2, PlayCircle } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getApiErrorMessage } from "../../utils/apiError";
import { useApPermissions } from "../../hooks/useApPermissions";
import PreScreenPanel from "../../vendor-intake/components/PreScreenPanel";
import StatusPill from "../../vendor-intake/components/PreScreenStatusBadge";
import { useVendorEngagement } from "../../vendor-intake/hooks/useVendorIntake";
import { PRE_SCREEN_RESULT } from "../../vendor-intake/constants/vendorIntake";
import {
  useCompleteOnboarding,
  useRunOnboardingPreScreen,
} from "../hooks/useVendorOnboardingMutations";
import {
  ONBOARDING_STATUS,
  ONBOARDING_STATUS_LABEL,
  ONBOARDING_STATUS_TONE,
} from "../constants/vendorOnboarding";

/**
 * Step 2 of the Vendor Intaker's workspace: Pre-Screen -> NDA -> Complete, for one vendor
 * onboarding request whose intake has already run.
 *
 * Division of responsibility with the backend:
 *  - POST /vendor-onboarding-requests/{id}/pre-screen is the authoritative Pre-Screen action:
 *    it runs the checks AND moves the onboarding request to PASSED / NEED_INFORMATION / FAILED.
 *  - That response carries the verdict but not the per-check breakdown, so PreScreenPanel is
 *    mounted afterwards to read the three checks back for the same engagement. Once
 *    VendorOnboardingPreScreenResponse includes `checks`, that second read can be dropped.
 *  - Completion is only offered once the backend has put the request in PASSED; the transition
 *    is re-validated server-side regardless (ONBOARDING_TRANSITIONS).
 *
 * @param {{ request:object, onCompleted?:()=>void }} props
 */
export default function VendorOnboardingProcessPanel({ request, onCompleted }) {
  const { canProcessOnboarding } = useApPermissions();
  const [hasRunPreScreen, setHasRunPreScreen] = useState(false);

  const preScreenMutation = useRunOnboardingPreScreen(request?.id, request?.pr_id);
  const completeMutation = useCompleteOnboarding(request?.id, request?.pr_id);

  const {
    data: engagement,
    isLoading: engagementLoading,
    refetch: refetchEngagement,
  } = useVendorEngagement(request?.engagement_id);

  const statusCode = request?.status_code;
  const preScreenResult = preScreenMutation.data?.result || engagement?.pre_screen_status || null;
  const hasPreScreenRun =
    hasRunPreScreen ||
    Boolean(preScreenMutation.data) ||
    (Boolean(preScreenResult) && preScreenResult !== PRE_SCREEN_RESULT.PENDING);

  // The recorded NDA requirement, with the backend's own precedence: an explicit decision
  // (nda_final_required) wins over the screening-rule recommendation. Same order
  // rfq_eligibility_service._check_nda applies — nothing is recomputed here.
  const ndaRequired =
    engagement?.nda_final_required ??
    engagement?.nda_recommended ??
    preScreenMutation.data?.nda_recommended ??
    null;

  const canComplete = statusCode === ONBOARDING_STATUS.PASSED;

  const handleRunPreScreen = async () => {
    try {
      const result = await preScreenMutation.mutateAsync();
      setHasRunPreScreen(true);
      refetchEngagement();

      if (result?.result === PRE_SCREEN_RESULT.PASS) toast.success("Pre-Screen passed.");
      else if (result?.result === PRE_SCREEN_RESULT.NEED_INFORMATION) {
        toast.warning(result.reason || "Pre-Screen needs more information.");
      } else toast.error(result?.reason || "Pre-Screen failed.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not run Pre-Screen for this request."));
    }
  };

  const handleComplete = async () => {
    try {
      const result = await completeMutation.mutateAsync();
      toast.success(result?.message || "Vendor onboarding completed.");
      onCompleted?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not complete this onboarding request."));
    }
  };

  if (!request?.engagement_id) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
        Complete the Vendor Intake above to continue to Pre-Screen.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Onboarding Request #{request.id}</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Vendor #{request.vendor_id} · Engagement #{request.engagement_id}
          </p>
        </div>
        <StatusPill
          label={ONBOARDING_STATUS_LABEL[statusCode] || statusCode || "—"}
          tone={ONBOARDING_STATUS_TONE[statusCode] || "neutral"}
          size="md"
        />
      </div>

      {/* ── Pre-Screen ─────────────────────────────────────────────────── */}
      {!hasPreScreenRun ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Pre-Screen Checks</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Essential checks performed before the vendor proceeds further.
          </p>
          <Button
            variant="primary"
            size="small"
            className="mt-3"
            onClick={handleRunPreScreen}
            disabled={!canProcessOnboarding}
            loading={preScreenMutation.isPending}
            loadingText="Running Pre-Screen checks..."
          >
            <PlayCircle className="h-3.5 w-3.5" /> Run Pre-Screen
          </Button>
        </div>
      ) : (
        <>
          {preScreenMutation.isPending && <LoadingSpinner text="Running Pre-Screen checks..." />}

          <PreScreenPanel
            engagementId={request.engagement_id}
            engagement={engagement}
            intakeResult={null}
            // The onboarding endpoint above already ran and recorded the verdict; this read
            // only fetches the per-check detail for display.
            autoRun
            // The NDA requirement itself is decided here, exactly as it is in the direct
            // Register Vendor flow — a request that arrived from an Internal Request must not
            // lose the ability to set it. Executing the NDA (generate/send/sign) still happens
            // later through the Stage 2 NDA APIs at the RFQ step.
            showNdaDecision
            onRefreshEngagement={refetchEngagement}
          />

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="small"
              onClick={handleRunPreScreen}
              disabled={!canProcessOnboarding}
              loading={preScreenMutation.isPending}
              loadingText="Running..."
            >
              Re-run Pre-Screen (updates onboarding status)
            </Button>
          </div>
        </>
      )}

      {/* ── NDA requirement (decided here, executed at RFQ) ─────────────── */}
      {hasPreScreenRun && !engagementLoading && ndaRequired !== null && (
        <div
          className={`rounded-xl border p-4 ${
            ndaRequired
              ? "border-amber-200 bg-amber-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <p
            className={`text-xs ${ndaRequired ? "text-amber-700" : "text-emerald-700"}`}
          >
            {ndaRequired
              ? "Pre-Screen recorded that this engagement needs an NDA. The NDA is generated, sent, signed and reviewed during the RFQ step - onboarding can still be completed now."
              : "The screening rules for this department and purchase category do not require an NDA."}
          </p>
        </div>
      )}

      {/* ── Completion ─────────────────────────────────────────────────── */}
      {statusCode === ONBOARDING_STATUS.COMPLETED ? (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Onboarding Completed</p>
            <p className="mt-1 text-xs text-emerald-700">
              The vendor is now available to purchase requisition #{request.pr_id}. The Vendor
              Officer can resume it and continue with RFQ — no new requisition is needed.
            </p>
          </div>
        </div>
      ) : (
        canProcessOnboarding && (
          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              {!canComplete && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
              <p className="text-xs text-gray-600">
                {canComplete
                  ? "Pre-Screen passed. Completing onboarding makes this vendor available to the requisition."
                  : "Onboarding can be completed once the backend has recorded a passed Pre-Screen for this request."}
              </p>
            </div>
            <Button
              variant="primary"
              size="small"
              onClick={handleComplete}
              disabled={!canComplete}
              loading={completeMutation.isPending}
              loadingText="Completing..."
              className="w-full sm:w-auto"
            >
              Complete Onboarding <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      )}
    </div>
  );
}
