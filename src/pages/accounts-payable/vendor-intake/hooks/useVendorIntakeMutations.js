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

/**
 * PUT /apm/vendor-intake/{engagement_id} - the Edit Engagement save.
 *
 * `vendorId` is taken as an argument so the vendor's engagement list (which is what Vendor
 * Details renders) is refreshed alongside the engagement itself; without it the table would
 * keep showing the pre-edit department/category until a full reload.
 *
 * Only department/category/purpose travel here. A changed NDA decision is a SEPARATE call
 * through useUpdateNdaDecision below - the existing endpoint - so no NDA logic is duplicated.
 */
export const useUpdateVendorEngagement = (engagementId, vendorId) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload) => vendorIntakeService.updateVendorEngagement(engagementId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENDOR_ENGAGEMENT_KEY(engagementId) });
      qc.invalidateQueries({ queryKey: VENDOR_ENGAGEMENTS_BY_VENDOR_KEY(vendorId) });
    },
  });
};

/** PATCH /apm/vendor-intake/{engagement_id}/nda-decision. */
export const useUpdateNdaDecision = (engagementId, vendorId) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (decision) => vendorIntakeService.updateNdaDecision(engagementId, decision),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENDOR_ENGAGEMENT_KEY(engagementId) });
      // Optional: only the Vendor Details caller knows which vendor's list is on screen.
      if (vendorId) {
        qc.invalidateQueries({ queryKey: VENDOR_ENGAGEMENTS_BY_VENDOR_KEY(vendorId) });
      }
    },
  });
};
