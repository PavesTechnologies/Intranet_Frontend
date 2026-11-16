import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, Info, RefreshCw } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getApiErrorMessage } from "../../utils/apiError";
import useDepartments from "../../system-configuration/hooks/useDepartments";
import usePurchaseCategories from "../../system-configuration/hooks/usePurchaseCategories";
import useVendorDetail from "../../vendor/hooks/useVendorDetail";
import { useRunPreScreen } from "../hooks/useVendorIntakeMutations";
import { useVendorEngagementsByVendor } from "../hooks/useVendorIntake";
import {
  PRE_SCREEN_CHECK,
  PRE_SCREEN_CHECK_TITLE,
  PRE_SCREEN_RESULT,
  PRE_SCREEN_RESULT_LABEL,
  PRE_SCREEN_RESULT_TONE,
  checkStatusLabel,
  checkTone,
  findCheck,
  readEligibilityFacts,
} from "../constants/vendorIntake";
import PreScreenCheckCard, { PreScreenDetailRow } from "./PreScreenCheckCard";
import PreScreenStatusBadge from "./PreScreenStatusBadge";
import NdaDecisionPanel from "./NdaDecisionPanel";

/**
 * Step 2 of the Register Vendor flow: runs POST /apm/vendor-intake/{id}/pre-screen and renders
 * exactly what comes back. The overall PASS / NEED_INFORMATION / FAIL verdict, each check's own
 * status, the reasons, the NDA recommendation and the NDA document status are all the
 * backend's — this component only chooses how to display them.
 *
 * `autoRun` false leaves the run to the caller — used by the Vendor Onboarding workspace,
 * where POST /vendor-onboarding-requests/{id}/pre-screen is the authoritative action (it also
 * advances the onboarding request) and this panel is mounted afterwards purely for the
 * per-check breakdown. `showNdaDecision` false hides the intake-level NDA decision, because
 * that flow drives the NDA through the Stage 2 NDA APIs instead.
 *
 * @param {{ engagementId: number|string, engagement: object|null, intakeResult: object|null,
 *   onRefreshEngagement?: () => void, onContinue?: () => void, autoRun?: boolean,
 *   showNdaDecision?: boolean }} props
 */
export default function PreScreenPanel({
  engagementId,
  engagement,
  intakeResult,
  onRefreshEngagement,
  onContinue,
  autoRun = true,
  showNdaDecision = true,
}) {
  const runMutation = useRunPreScreen(engagementId);
  const autoRunRef = useRef(false);

  // Both masters unfiltered: the cards resolve names for this engagement and for whichever
  // other departments/categories the vendor is already engaged under.
  const { data: departments = [] } = useDepartments();
  const { data: categories = [] } = usePurchaseCategories();
  const { vendor } = useVendorDetail(engagement?.vendor_id);
  const { data: vendorEngagements = [] } = useVendorEngagementsByVendor(engagement?.vendor_id);

  const result = runMutation.data || null;
  const checks = result?.checks || [];

  // Overall verdict: the run's result while it is in hand, otherwise whatever the backend
  // last stored on the engagement.
  const overallResult = result?.result || engagement?.pre_screen_status || PRE_SCREEN_RESULT.PENDING;
  const overallReason = result?.reason ?? engagement?.pre_screen_result_reason ?? null;
  const hasRun = Boolean(result) || overallResult !== PRE_SCREEN_RESULT.PENDING;

  // Run once automatically when the step opens. The engagement row stores only the overall
  // verdict, not the per-check breakdown, so arriving with a saved engagement would otherwise
  // show a result with no checks behind it. Further runs are explicit, and the ref guard keeps
  // StrictMode's double-effect (and any re-render) from posting twice.
  useEffect(() => {
    if (!autoRun) return;
    if (!engagementId || !engagement) return;
    if (autoRunRef.current) return;

    autoRunRef.current = true;
    runMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId, Boolean(engagement), autoRun]);

  const departmentName = (id) =>
    departments.find((d) => d.id === id)?.name || (id ? `Department #${id}` : "—");
  const categoryName = (id) =>
    categories.find((c) => c.id === id)?.name || (id ? `Category #${id}` : "—");

  const departmentLabel = departmentName(engagement?.department_id);
  const categoryLabel = categoryName(engagement?.category_id);

  const duplicateCheck = findCheck(checks, PRE_SCREEN_CHECK.DUPLICATE);
  const eligibilityCheck = findCheck(checks, PRE_SCREEN_CHECK.ELIGIBILITY);
  const businessRuleCheck = findCheck(checks, PRE_SCREEN_CHECK.BUSINESS_RULE);

  const knownCheckNames = Object.values(PRE_SCREEN_CHECK);
  const extraChecks = checks.filter((check) => !knownCheckNames.includes(check.name));

  const eligibility = readEligibilityFacts(eligibilityCheck);

  // The run's recommendation while it is in hand, otherwise the one stored on the engagement.
  const ndaRecommended = result?.nda_recommended ?? engagement?.nda_recommended ?? null;

  // Other engagements already on file for this vendor, straight from
  // GET /apm/vendor-intake/vendor/{vendor_id} — the current one is not an "existing" one.
  const otherEngagements = vendorEngagements.filter(
    (e) => String(e.engagement_id) !== String(engagementId),
  );

  const existingEngagementText = otherEngagements.length
    ? otherEngagements
        .map((e) => `${departmentName(e.department_id)} / ${categoryName(e.category_id)}`)
        .join(" • ")
    : "None on file";

  const duplicateResultLabel = !duplicateCheck
    ? "Not run"
    : duplicateCheck.passed
      ? otherEngagements.length > 0
        ? "New Engagement Allowed"
        : "No Duplicate"
      : "Existing Engagement";

  const vendorMasterLabel = vendor?.vendor_name
    ? vendor.vendor_name
    : engagement?.vendor_id
      ? `Vendor #${engagement.vendor_id}`
      : "—";

  // vendor_created is only known from the save that started this flow — after a reload the
  // engagement alone can't say whether the vendor was new, so the row is simply omitted.
  const vendorOriginLabel =
    intakeResult?.vendor_created === true
      ? "New Vendor Created"
      : intakeResult?.vendor_created === false
        ? "Existing Vendor Found"
        : null;

  const isRunning = runMutation.isPending;

  const summaryTone = PRE_SCREEN_RESULT_TONE[overallResult] || "neutral";
  const summaryClasses = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-rose-200 bg-rose-50 text-rose-800",
    neutral: "border-gray-200 bg-gray-50 text-gray-700",
  }[summaryTone];

  const SummaryIcon = {
    success: CheckCircle2,
    warning: Info,
    danger: AlertTriangle,
    neutral: Info,
  }[summaryTone];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Pre-Screen Checks</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Essential checks performed before the vendor proceeds further.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="small"
          onClick={() => runMutation.mutate()}
          loading={isRunning}
          loadingText="Running Pre-Screen checks..."
          className="w-full sm:w-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" /> {hasRun ? "Re-run Pre-Screen" : "Run Pre-Screen"}
        </Button>
      </div>

      {isRunning && <LoadingSpinner text="Running Pre-Screen checks..." />}

      {runMutation.isError && !isRunning && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Pre-Screen could not be completed</p>
            <p className="mt-0.5">
              {getApiErrorMessage(runMutation.error, "Failed to run the Pre-Screen checks.")}
            </p>
          </div>
        </div>
      )}

      {/* Overall, backend-decided verdict */}
      {hasRun && !isRunning && (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${summaryClasses}`}>
          <SummaryIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">Pre-Screen Result</span>
              <PreScreenStatusBadge
                label={PRE_SCREEN_RESULT_LABEL[overallResult] || overallResult}
                tone={summaryTone}
                size="md"
              />
            </div>
            {overallReason ? <p className="mt-1 text-xs">{overallReason}</p> : null}
            {overallResult === PRE_SCREEN_RESULT.NEED_INFORMATION && (
              <p className="mt-1 text-xs">
                Additional information is required before this engagement can proceed. Complete
                the missing details on the vendor record, then re-run the Pre-Screen.
              </p>
            )}
            {overallResult === PRE_SCREEN_RESULT.FAIL && (
              <p className="mt-1 text-xs">
                This engagement cannot continue while the failed check above stands.
              </p>
            )}
          </div>
        </div>
      )}

      {!hasRun && !isRunning && !runMutation.isError && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
          The Pre-Screen checks have not been run for this engagement yet.
        </div>
      )}

      {/* ── 1. Duplicate / Existing Engagement ─────────────────────────── */}
      <PreScreenCheckCard
        index={1}
        title={PRE_SCREEN_CHECK_TITLE[PRE_SCREEN_CHECK.DUPLICATE]}
        statusLabel={checkStatusLabel(duplicateCheck)}
        statusTone={checkTone(duplicateCheck)}
        reason={duplicateCheck?.reason}
        reasonTone={checkTone(duplicateCheck)}
      >
        <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          <PreScreenDetailRow label="Vendor Master" value={vendorMasterLabel} />
          {vendorOriginLabel ? (
            <PreScreenDetailRow
              label="Vendor Record"
              value={vendorOriginLabel}
              badge
              tone={intakeResult?.vendor_created ? "info" : "neutral"}
            />
          ) : null}
          <PreScreenDetailRow
            label="Requested Engagement"
            value={`${departmentLabel} / ${categoryLabel}`}
          />
          <PreScreenDetailRow label="Existing Engagement" value={existingEngagementText} />
          <PreScreenDetailRow
            label="Result"
            value={duplicateResultLabel}
            badge
            tone={checkTone(duplicateCheck)}
          />
        </div>
      </PreScreenCheckCard>

      {/* ── 2. Basic Eligibility ───────────────────────────────────────── */}
      <PreScreenCheckCard
        index={2}
        title={PRE_SCREEN_CHECK_TITLE[PRE_SCREEN_CHECK.ELIGIBILITY]}
        statusLabel={checkStatusLabel(eligibilityCheck)}
        statusTone={checkTone(eligibilityCheck)}
        reason={eligibilityCheck?.reason}
        reasonTone={checkTone(eligibilityCheck)}
      >
        <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          <PreScreenDetailRow
            label="Vendor Status"
            value={
              eligibility.vendorBlocked === null
                ? "—"
                : eligibility.vendorBlocked
                  ? "Blocked"
                  : "Not Blocked"
            }
            badge
            tone={
              eligibility.vendorBlocked === null
                ? "neutral"
                : eligibility.vendorBlocked
                  ? "danger"
                  : "success"
            }
          />
          <PreScreenDetailRow
            label="Required Intake Data"
            value={
              eligibility.intakeDataComplete === null
                ? "—"
                : eligibility.intakeDataComplete
                  ? "Complete"
                  : "Incomplete"
            }
            badge
            tone={
              eligibility.intakeDataComplete === null
                ? "neutral"
                : eligibility.intakeDataComplete
                  ? "success"
                  : "warning"
            }
          />
          <PreScreenDetailRow
            label="Overall Eligibility"
            value={
              !eligibilityCheck ? "—" : eligibilityCheck.passed ? "Eligible" : "Not Eligible"
            }
            badge
            tone={checkTone(eligibilityCheck)}
          />
        </div>
      </PreScreenCheckCard>

      {/* ── 3. Category / Business Rule ────────────────────────────────── */}
      <PreScreenCheckCard
        index={3}
        title={PRE_SCREEN_CHECK_TITLE[PRE_SCREEN_CHECK.BUSINESS_RULE]}
        statusLabel={checkStatusLabel(businessRuleCheck)}
        statusTone={checkTone(businessRuleCheck)}
        reason={businessRuleCheck?.reason}
        reasonTone="neutral"
      >
        <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          <PreScreenDetailRow label="Department" value={departmentLabel} />
          <PreScreenDetailRow label="Purchase Category" value={categoryLabel} />
          <PreScreenDetailRow
            label="Rule Evaluation"
            value={businessRuleCheck ? "Rule Evaluated" : "Not run"}
            badge
            tone={businessRuleCheck ? "success" : "neutral"}
          />
          <PreScreenDetailRow
            label="NDA Required"
            value={ndaRecommended === null ? "—" : ndaRecommended ? "YES" : "NO"}
            badge
            tone={ndaRecommended === null ? "neutral" : ndaRecommended ? "warning" : "success"}
          />
        </div>
      </PreScreenCheckCard>

      {/* Any further check the backend starts returning (e.g. an Existing Onboarding Check)
          is rendered as-is rather than dropped — and nothing is invented when it is absent. */}
      {extraChecks.map((check, index) => (
        <PreScreenCheckCard
          key={check.name}
          index={4 + index}
          title={check.name}
          statusLabel={checkStatusLabel(check)}
          statusTone={checkTone(check)}
          reason={check.reason}
          reasonTone={checkTone(check)}
        >
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <PreScreenDetailRow
              label="Result"
              value={checkStatusLabel(check)}
              badge
              tone={checkTone(check)}
            />
          </div>
        </PreScreenCheckCard>
      ))}

      {/* ── NDA decision (intake-level; the onboarding flow uses the NDA APIs) ── */}
      {showNdaDecision && (
        <NdaDecisionPanel
          engagementId={engagementId}
          engagement={engagement}
          ndaRecommended={result?.nda_recommended ?? null}
          ndaDocumentStatus={result?.nda_document_status ?? null}
          onUpdated={onRefreshEngagement}
        />
      )}

      {/* ── Continue ───────────────────────────────────────────────────── */}
      {onContinue && (
        <div className="flex flex-col gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
          {overallResult !== PRE_SCREEN_RESULT.PASS && hasRun ? (
            <p className="text-xs text-gray-500 sm:mr-auto">
              {overallResult === PRE_SCREEN_RESULT.FAIL
                ? "Continuation is blocked until the Pre-Screen passes."
                : "Resolve the missing information and re-run the Pre-Screen to continue."}
            </p>
          ) : null}
          <Button
            type="button"
            onClick={onContinue}
            disabled={overallResult !== PRE_SCREEN_RESULT.PASS}
            className="w-full sm:w-auto"
          >
            Continue to Vendor Record
          </Button>
        </div>
      )}
    </div>
  );
}
