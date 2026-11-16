import { Check, X } from "lucide-react";
import { PROCUREMENT_STAGES, getProcurementStageIndex } from "../constants/procurementStages";
import {
  ONBOARDING_STATUS,
  ONBOARDING_STATUS_LABEL,
  ONBOARDING_STATUS_TONE,
  isOnboardingOpen,
} from "../constants/vendorOnboarding";
import StatusPill from "../../vendor-intake/components/PreScreenStatusBadge";

/** The onboarding detour, shown only when a PR actually took it. */
const ONBOARDING_BRANCH_STEPS = [
  { key: "INTAKE", label: "Vendor Intake" },
  { key: "PRE_SCREEN", label: "Pre-Screen" },
  { key: "NDA", label: "NDA" },
  { key: "AVAILABLE", label: "Vendor Available" },
];

/**
 * How far along the onboarding detour a request has got, from its backend status alone.
 * Returns the number of completed branch steps — never a judgement about what should
 * happen next, which is the backend's.
 */
function onboardingBranchProgress(statusCode) {
  switch (statusCode) {
    case ONBOARDING_STATUS.CREATED:
    case ONBOARDING_STATUS.ASSIGNED:
      return 0;
    case ONBOARDING_STATUS.IN_PROGRESS:
    case ONBOARDING_STATUS.NEED_INFORMATION:
      return 1;
    case ONBOARDING_STATUS.PRE_SCREEN_PENDING:
      return 1;
    case ONBOARDING_STATUS.PASSED:
      return 2;
    case ONBOARDING_STATUS.COMPLETED:
      return ONBOARDING_BRANCH_STEPS.length;
    default:
      return 0;
  }
}

/**
 * Horizontal progress indicator showing where one purchase requisition sits across the six
 * procurement stages. Purely derived from the PR's existing status_code — see
 * getProcurementStageIndex for the mapping. PO Acknowledged is always rendered inactive: the
 * backend doesn't expose a vendor-acknowledgement step yet, so it can never be "completed" here.
 *
 * When the PR took the vendor-onboarding detour (no vendor was available at RFQ time), the
 * onboarding branch is drawn underneath, hanging off the RFQ / Quotations stage it interrupts,
 * so both paths read as one workflow. The branch appears only when an onboarding request
 * exists for the PR; its progress comes from that request's backend status.
 *
 * @param {{ prStatusCode?: string, onboardingRequests?: object[] }} props
 */
export default function ProcurementWorkflowStepper({ prStatusCode, onboardingRequests = [] }) {
  const stage = getProcurementStageIndex(prStatusCode);
  if (!stage) return null;

  const { index: currentIndex, terminal } = stage;

  // The request that matters is the open one; failing that, the most recent closed one.
  const activeRequest =
    onboardingRequests.find((request) => isOnboardingOpen(request.status_code)) ||
    onboardingRequests[onboardingRequests.length - 1] ||
    null;

  const branchProgress = activeRequest ? onboardingBranchProgress(activeRequest.status_code) : 0;
  const branchFailed =
    activeRequest?.status_code === ONBOARDING_STATUS.FAILED ||
    activeRequest?.status_code === ONBOARDING_STATUS.CANCELLED;

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white px-4 py-4 sm:px-6">
      <div className="overflow-x-auto">
        <ol className="flex min-w-max items-start">
          {PROCUREMENT_STAGES.map((s, i) => {
            const isCompleted = i < currentIndex;
            const isCurrent = i === currentIndex;
            const isHalted = isCurrent && terminal;
            const isLast = i === PROCUREMENT_STAGES.length - 1;

            const circleClasses = isHalted
              ? "border-rose-500 bg-rose-500 text-white"
              : isCompleted
                ? "border-[#0A0082] bg-[#0A0082] text-white"
                : isCurrent
                  ? "border-[#0A0082] bg-white text-[#0A0082]"
                  : "border-gray-300 bg-white text-gray-400";

            const labelClasses = isHalted
              ? "text-rose-700 font-semibold"
              : isCompleted || isCurrent
                ? "text-gray-900 font-semibold"
                : "text-gray-400";

            return (
              <li key={s.key} className="flex items-start">
                <div className="flex w-20 flex-col items-center sm:w-24">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${circleClasses}`}
                  >
                    {isHalted ? <X className="h-3.5 w-3.5" /> : isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={`mt-2 text-center text-[11px] leading-tight sm:text-xs ${labelClasses}`}>
                    {s.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={`mt-3.5 h-0.5 w-6 shrink-0 sm:w-10 ${isCompleted ? "bg-[#0A0082]" : "bg-gray-200"}`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── Vendor onboarding detour ──────────────────────────────────── */}
      {activeRequest && (
        <div className="mt-4 border-t border-dashed border-gray-200 pt-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {/* The elbow ties the branch back to the RFQ stage it interrupts. */}
            <span className="ml-1 text-xs text-gray-400" aria-hidden="true">
              └─
            </span>
            <span className="text-xs font-semibold text-gray-700">
              Vendor Unavailable — Onboarding Branch
            </span>
            <StatusPill
              label={
                ONBOARDING_STATUS_LABEL[activeRequest.status_code] ||
                activeRequest.status_code ||
                "—"
              }
              tone={ONBOARDING_STATUS_TONE[activeRequest.status_code] || "neutral"}
            />
          </div>

          <div className="overflow-x-auto">
            <ol className="flex min-w-max items-start pl-6">
              {ONBOARDING_BRANCH_STEPS.map((step, i) => {
                const isCompleted = i < branchProgress;
                const isCurrent = i === branchProgress && !branchFailed;
                const isHalted = branchFailed && i === branchProgress;
                const isLast = i === ONBOARDING_BRANCH_STEPS.length - 1;

                const circleClasses = isHalted
                  ? "border-rose-500 bg-rose-500 text-white"
                  : isCompleted
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : isCurrent
                      ? "border-emerald-600 bg-white text-emerald-700"
                      : "border-gray-300 bg-white text-gray-400";

                return (
                  <li key={step.key} className="flex items-start">
                    <div className="flex w-20 flex-col items-center sm:w-24">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-semibold ${circleClasses}`}
                      >
                        {isHalted ? (
                          <X className="h-3 w-3" />
                        ) : isCompleted ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span
                        className={`mt-1.5 text-center text-[10px] leading-tight sm:text-[11px] ${
                          isCompleted || isCurrent ? "font-medium text-gray-800" : "text-gray-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div
                        className={`mt-3 h-0.5 w-6 shrink-0 sm:w-10 ${
                          isCompleted ? "bg-emerald-600" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </li>
                );
              })}
              {/* Rejoins the main path. */}
              <li className="flex items-start">
                <div className="mt-3 h-0.5 w-6 shrink-0 bg-gray-200 sm:w-10" />
                <span className="ml-2 mt-1 whitespace-nowrap text-[10px] text-gray-500 sm:text-[11px]">
                  → back to RFQ
                </span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
