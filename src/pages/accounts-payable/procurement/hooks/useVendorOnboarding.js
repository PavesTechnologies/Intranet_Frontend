import { useQuery } from "@tanstack/react-query";
import vendorOnboardingService from "../services/vendorOnboardingService";
import { asId } from "../constants/vendorOnboarding";

// Every id in these keys goes through asId() — PR ids arrive as route-param strings in
// PrDetailPage and as numeric `pr.id` from fetched objects, and the two must not produce
// separate cache entries (same reasoning as PR_DETAIL_KEY in usePurchaseRequisitionDetail.js).

export const VENDOR_AVAILABILITY_KEY = (prId) => [
  "accountsPayable",
  "procurement",
  "vendorAvailability",
  asId(prId),
];

export const ONBOARDING_REQUESTS_KEY = ["accountsPayable", "procurement", "onboardingRequests"];

export const ONBOARDING_REQUESTS_LIST_KEY = (filters = {}) => [...ONBOARDING_REQUESTS_KEY, filters];

export const ONBOARDING_REQUEST_KEY = (requestId) => [
  "accountsPayable",
  "procurement",
  "onboardingRequest",
  asId(requestId),
];

/**
 * Vendor availability for a PR's department/category. Not run automatically: the PR Officer
 * triggers it with "Check Vendor Availability", after which the result is cached under the PR.
 * `enabled` therefore defaults to false and the panel flips it on.
 */
export const useVendorAvailability = (prId, { enabled = false } = {}) =>
  useQuery({
    queryKey: VENDOR_AVAILABILITY_KEY(prId),
    queryFn: () => vendorOnboardingService.checkVendorAvailability(prId),
    enabled: Boolean(prId) && enabled,
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: 1,
  });

/** Onboarding requests raised against one PR — normally zero or one open request. */
export const useOnboardingRequestsForPr = (prId) =>
  useQuery({
    queryKey: ONBOARDING_REQUESTS_LIST_KEY({ prId: asId(prId) }),
    queryFn: () => vendorOnboardingService.listOnboardingRequests({ prId }),
    enabled: Boolean(prId),
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: 1,
  });

/** The Vendor Intaker's queue. `assignedTo` omitted lists every request they may view. */
export const useOnboardingRequests = ({ assignedTo, statusId, vendorId } = {}) =>
  useQuery({
    queryKey: ONBOARDING_REQUESTS_LIST_KEY({ assignedTo: assignedTo || null, statusId: statusId || null, vendorId: vendorId || null }),
    queryFn: () => vendorOnboardingService.listOnboardingRequests({ assignedTo, statusId, vendorId }),
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: 1,
  });

export const useOnboardingRequest = (requestId) =>
  useQuery({
    queryKey: ONBOARDING_REQUEST_KEY(requestId),
    queryFn: () => vendorOnboardingService.getOnboardingRequest(requestId),
    enabled: Boolean(requestId),
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: 1,
  });

export default useOnboardingRequest;
