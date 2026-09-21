import { useQuery } from "@tanstack/react-query";
import vendorIntakeService from "../services/vendorIntakeService";

export const VENDOR_INTAKE_KEY = ["accountsPayable", "vendorIntake"];

export const VENDOR_ENGAGEMENT_KEY = (engagementId) => [
  ...VENDOR_INTAKE_KEY,
  "engagement",
  engagementId,
];

export const VENDOR_ENGAGEMENTS_BY_VENDOR_KEY = (vendorId) => [
  ...VENDOR_INTAKE_KEY,
  "engagementsByVendor",
  vendorId,
];

/**
 * One vendor engagement (GET /apm/vendor-intake/{engagement_id}) — the saved intake plus
 * its current pre_screen_status / NDA decision. Re-read on every mount so a deep link or a
 * refresh of the Pre-Screen step shows the backend's current state, not a cached one.
 */
export const useVendorEngagement = (engagementId) =>
  useQuery({
    queryKey: VENDOR_ENGAGEMENT_KEY(engagementId),
    queryFn: () => vendorIntakeService.getVendorIntake(engagementId),
    enabled: !!engagementId,
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: 1,
  });

/**
 * Every engagement already on file for a vendor — the Duplicate/Existing Engagement card
 * shows the other ones next to the requested engagement.
 */
export const useVendorEngagementsByVendor = (vendorId) =>
  useQuery({
    queryKey: VENDOR_ENGAGEMENTS_BY_VENDOR_KEY(vendorId),
    queryFn: () => vendorIntakeService.getVendorEngagementsByVendor(vendorId),
    enabled: !!vendorId,
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: 1,
  });

export default useVendorEngagement;
