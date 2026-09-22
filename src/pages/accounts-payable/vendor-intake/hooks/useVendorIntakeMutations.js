import { useMutation, useQueryClient } from "@tanstack/react-query";
import vendorIntakeService from "../services/vendorIntakeService";
import {
  VENDOR_ENGAGEMENT_KEY,
  VENDOR_ENGAGEMENTS_BY_VENDOR_KEY,
} from "./useVendorIntake";

/** Saving an intake can also create a vendor master record, so the vendor lists go stale too. */
const invalidateVendorLists = (qc) =>
  qc.invalidateQueries({ queryKey: ["accountsPayable", "vendors"] });

/** POST /apm/vendor-intake — step 1 of the flow. */
export const useCreateVendorIntake = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload) => vendorIntakeService.createVendorIntake(payload),
    onSuccess: (data) => {
      invalidateVendorLists(qc);
      qc.invalidateQueries({ queryKey: VENDOR_ENGAGEMENTS_BY_VENDOR_KEY(data?.vendor_id) });
    },
  });
};

/**
 * POST /apm/vendor-intake/{engagement_id}/pre-screen — step 2. The run also writes the
 * result onto the engagement, so the engagement query is invalidated afterwards.
 */
export const useRunPreScreen = (engagementId) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => vendorIntakeService.runPreScreen(engagementId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENDOR_ENGAGEMENT_KEY(engagementId) });
    },
  });
};

/** PATCH /apm/vendor-intake/{engagement_id}/nda-decision. */
export const useUpdateNdaDecision = (engagementId) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (decision) => vendorIntakeService.updateNdaDecision(engagementId, decision),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENDOR_ENGAGEMENT_KEY(engagementId) });
    },
  });
};
