import { useMutation, useQueryClient } from "@tanstack/react-query";
import vendorOnboardingService from "../services/vendorOnboardingService";
import { PR_DETAIL_KEY, PR_TIMELINE_KEY } from "./usePurchaseRequisitionDetail";
import {
  ONBOARDING_REQUESTS_KEY,
  ONBOARDING_REQUEST_KEY,
  VENDOR_AVAILABILITY_KEY,
} from "./useVendorOnboarding";
import { RFQ_ELIGIBILITY_KEY } from "./useRfqEligibility";
import { VENDOR_ENGAGEMENT_KEY } from "../../vendor-intake/hooks/useVendorIntake";

/**
 * Everything an onboarding state change can invalidate. Onboarding drives the PR's own
 * workflow (the backend records PR history events and can free the vendor for RFQ), so a
 * transition has to refresh the PR, its timeline, the availability answer, the engagement
 * behind the intake and every RFQ-eligibility verdict — not just the request row.
 */
const invalidateOnboardingGraph = (qc, { prId, requestId, engagementId } = {}) => {
  qc.invalidateQueries({ queryKey: ONBOARDING_REQUESTS_KEY });

  if (requestId) qc.invalidateQueries({ queryKey: ONBOARDING_REQUEST_KEY(requestId) });

  if (prId) {
    qc.invalidateQueries({ queryKey: PR_DETAIL_KEY(prId) });
    qc.invalidateQueries({ queryKey: PR_TIMELINE_KEY(prId) });
    qc.invalidateQueries({ queryKey: VENDOR_AVAILABILITY_KEY(prId) });
  }

  if (engagementId) qc.invalidateQueries({ queryKey: VENDOR_ENGAGEMENT_KEY(engagementId) });

  // Eligibility depends on onboarding/pre-screen/NDA state — always re-ask the backend.
  qc.invalidateQueries({ queryKey: RFQ_ELIGIBILITY_KEY });
  qc.invalidateQueries({ queryKey: ["accountsPayable", "procurement", "vendorOptions"] });
  qc.invalidateQueries({ queryKey: ["accountsPayable", "vendors"] });
  qc.invalidateQueries({ queryKey: ["accountsPayable", "procurement", "purchaseRequisitions"] });
};

/** POST /apm/vendor-onboarding-requests */
export const useCreateOnboardingRequest = (prId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => vendorOnboardingService.createOnboardingRequest(payload),
    onSuccess: (data) => invalidateOnboardingGraph(qc, { prId, requestId: data?.id }),
  });
};

/** PATCH /{request_id}/assign */
export const useAssignOnboardingRequest = (requestId, prId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignedTo) =>
      vendorOnboardingService.assignOnboardingRequest(requestId, assignedTo),
    onSuccess: () => invalidateOnboardingGraph(qc, { prId, requestId }),
  });
};

/** PATCH /{request_id}/status */
export const useUpdateOnboardingStatus = (requestId, prId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (decision) => vendorOnboardingService.updateOnboardingStatus(requestId, decision),
    onSuccess: () => invalidateOnboardingGraph(qc, { prId, requestId }),
  });
};

/** POST /{request_id}/start — runs the Vendor Intake behind this onboarding request. */
export const useStartOnboarding = (requestId, prId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => vendorOnboardingService.startOnboarding(requestId, payload),
    onSuccess: (data) =>
      invalidateOnboardingGraph(qc, { prId, requestId, engagementId: data?.engagement_id }),
  });
};

/** POST /{request_id}/pre-screen */
export const useRunOnboardingPreScreen = (requestId, prId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => vendorOnboardingService.runPreScreen(requestId),
    onSuccess: (data) =>
      invalidateOnboardingGraph(qc, { prId, requestId, engagementId: data?.engagement_id }),
  });
};

/** POST /{request_id}/complete — the vendor becomes available to the waiting PR. */
export const useCompleteOnboarding = (requestId, prId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => vendorOnboardingService.completeOnboarding(requestId),
    onSuccess: () => invalidateOnboardingGraph(qc, { prId, requestId }),
  });
};
