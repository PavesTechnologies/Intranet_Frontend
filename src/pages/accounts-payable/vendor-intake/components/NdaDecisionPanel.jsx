import { useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, FileSignature } from "lucide-react";
import Button from "../../../../components/Button/Button";
import FormTextArea from "../../../../components/forms/FormTextArea";
import { getApiErrorMessage } from "../../utils/apiError";
import { useApPermissions } from "../../hooks/useApPermissions";
import { useUpdateNdaDecision } from "../hooks/useVendorIntakeMutations";
import PreScreenStatusBadge from "./PreScreenStatusBadge";

const YES_NO = (value) => (value ? "YES" : "NO");

/**
 * NDA outcome of the Pre-Screen, plus the override control.
 *
 * Whether an NDA is required is decided entirely by the backend's screening rules — this
 * panel displays `nda_recommended` / `nda_final_required` / `nda_document_status` as returned
 * and, when a user overrides, sends their explicit choice plus a reason to
 * PATCH /apm/vendor-intake/{engagement_id}/nda-decision. Nothing is recomputed here.
 *
 * @param {{ engagementId: number|string, engagement: object|null, ndaRecommended: boolean|null,
 *   ndaDocumentStatus: string|null, onUpdated?: () => void }} props
 */
export default function NdaDecisionPanel({
  engagementId,
  engagement,
  ndaRecommended,
  ndaDocumentStatus,
  onUpdated,
}) {
  // Overriding is gated on the vendor-onboarding capability — the closest existing AP
  // permission. This is UX only; the backend remains the authority on who may do this.
  const { canOnboardVendor } = useApPermissions();

  const [isOverriding, setIsOverriding] = useState(false);
  const [overrideRequired, setOverrideRequired] = useState("yes");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const updateMutation = useUpdateNdaDecision(engagementId);

  // Recommendation from the latest Pre-Screen run, falling back to the value stored on the
  // engagement (a deep link or refresh has no in-memory run result).
  const recommended = ndaRecommended ?? engagement?.nda_recommended ?? null;
  const finalRequired = engagement?.nda_final_required ?? null;
  const hasDecision = finalRequired !== null && finalRequired !== undefined;

  // Until a decision is recorded, the recommendation is what stands.
  const effectiveRequired = hasDecision ? finalRequired : recommended;

  // Derived and returned by the backend (PENDING / NOT_REQUIRED) — the engagement's value is
  // already computed against the effective decision, so it wins over the run's snapshot.
  const documentStatus = engagement?.nda_document_status ?? ndaDocumentStatus ?? "—";

  if (recommended === null && !hasDecision) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-sm">
        Run the Pre-Screen checks to see the NDA recommendation for this engagement.
      </div>
    );
  }

  const submitDecision = async (payload, successMessage) => {
    try {
      await updateMutation.mutateAsync(payload);
      toast.success(successMessage);
      setIsOverriding(false);
      setReason("");
      setReasonError("");
      onUpdated?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to record the NDA decision."));
    }
  };

  const handleAccept = () =>
    // override_required null tells the backend to keep its own recommendation.
    submitDecision({ overrideRequired: null, reason: null }, "NDA recommendation accepted.");

  const handleOverride = () => {
    if (!reason.trim()) {
      setReasonError("A reason is required to override the NDA recommendation.");
      return;
    }

    submitDecision(
      { overrideRequired: overrideRequired === "yes", reason: reason.trim() },
      "NDA recommendation overridden.",
    );
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-[#0A0082]" />
          <h3 className="text-sm font-semibold text-gray-900">NDA Decision</h3>
        </div>
        <PreScreenStatusBadge
          label={`NDA ${YES_NO(effectiveRequired)}`}
          tone={effectiveRequired ? "warning" : "success"}
          size="md"
        />
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {[
          { label: "Recommended", value: recommended === null ? "—" : YES_NO(recommended) },
          { label: "NDA Required", value: YES_NO(effectiveRequired) },
          { label: "NDA Document Status", value: documentStatus },
          {
            label: "Decision",
            value: hasDecision
              ? engagement?.nda_override === null || engagement?.nda_override === undefined
                ? "Recommendation accepted"
                : "Overridden"
              : "Not recorded yet",
          },
        ].map((row) => (
          <div
            key={row.label}
            className="flex justify-between gap-4 border-b border-gray-100 py-2 last:border-0"
          >
            <dt className="text-xs font-medium text-gray-500">{row.label}</dt>
            <dd className="text-xs font-semibold text-gray-900">{row.value}</dd>
          </div>
        ))}
      </dl>

      {engagement?.nda_override_reason ? (
        <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <span className="font-semibold text-gray-700">Override reason: </span>
          {engagement.nda_override_reason}
        </p>
      ) : null}

      {canOnboardVendor ? (
        <div className="mt-4 border-t border-gray-100 pt-4">
          {!isOverriding ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="small"
                onClick={() => {
                  // Default the override to the opposite of what stands today.
                  setOverrideRequired(effectiveRequired ? "no" : "yes");
                  setIsOverriding(true);
                }}
                className="w-full sm:w-auto"
              >
                Override Recommendation
              </Button>
              <Button
                type="button"
                size="small"
                onClick={handleAccept}
                loading={updateMutation.isPending}
                loadingText="Saving..."
                className="w-full sm:w-auto"
              >
                {hasDecision ? "Reset to Recommendation" : "Accept Recommendation"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-gray-700">
                  Override NDA requirement to
                </legend>
                <div className="flex gap-6">
                  {[
                    { value: "yes", label: "YES" },
                    { value: "no", label: "NO" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <input
                        type="radio"
                        name="nda_override_required"
                        value={option.value}
                        checked={overrideRequired === option.value}
                        onChange={() => setOverrideRequired(option.value)}
                        className="h-4 w-4 border-gray-300 text-[#0A0082] focus:ring-[#0A0082]/20"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <FormTextArea
                  label="Override Reason *"
                  name="nda_override_reason"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setReasonError("");
                  }}
                  placeholder="Why is the recommendation being overridden?"
                  rows={3}
                />
                {reasonError ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                    <AlertTriangle className="h-3.5 w-3.5" /> {reasonError}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={() => {
                    setIsOverriding(false);
                    setReason("");
                    setReasonError("");
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="small"
                  onClick={handleOverride}
                  loading={updateMutation.isPending}
                  loadingText="Saving..."
                  disabled={!reason.trim()}
                  className="w-full sm:w-auto"
                >
                  Save Override
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
