import { useQuery } from "@tanstack/react-query";
import rfqService from "../services/rfqService";
import { asId } from "../constants/vendorOnboarding";

/** Base key — every eligibility verdict hangs off this so one invalidate refreshes them all. */
export const RFQ_ELIGIBILITY_KEY = ["accountsPayable", "procurement", "rfqEligibility"];

export const RFQ_ELIGIBILITY_VENDOR_KEY = (prId, vendorId) => [
  ...RFQ_ELIGIBILITY_KEY,
  asId(prId),
  asId(vendorId),
];

export const RFQ_ELIGIBILITY_BATCH_KEY = (prId, vendorIds) => [
  ...RFQ_ELIGIBILITY_KEY,
  "batch",
  asId(prId),
  // Sorted so the same set of vendors always hits the same cache entry regardless of the
  // order the caller happened to build the list in.
  (vendorIds || []).map(Number).sort((a, b) => a - b).join(","),
];

/**
 * Whether one vendor may take part in a PR's RFQ. The verdict, the per-gate breakdown and the
 * blocking reason all come from the backend (rfq_eligibility_service.py) — nothing is derived
 * here. staleTime 0 because onboarding/NDA transitions change the answer.
 */
export const useRfqEligibility = (prId, vendorId, { enabled = true } = {}) =>
  useQuery({
    queryKey: RFQ_ELIGIBILITY_VENDOR_KEY(prId, vendorId),
    queryFn: () => rfqService.getRfqEligibility(prId, vendorId),
    enabled: Boolean(prId) && Boolean(vendorId) && enabled,
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: 1,
  });

/**
 * One call for a list of vendors (POST /apm/rfq/eligibility/check) — used by Invite Vendors so
 * picking from a long vendor list doesn't fan out into one request per row.
 * @returns the query plus `eligibilityByVendorId`, keyed by the numeric vendor id.
 */
export const useRfqEligibilityBatch = (prId, vendorIds = [], { enabled = true } = {}) => {
  const ids = (vendorIds || []).map(Number).filter(Boolean);

  const query = useQuery({
    queryKey: RFQ_ELIGIBILITY_BATCH_KEY(prId, ids),
    queryFn: () => rfqService.checkRfqEligibility(prId, ids),
    enabled: Boolean(prId) && ids.length > 0 && enabled,
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  const eligibilityByVendorId = new Map(
    (query.data?.results || []).map((result) => [Number(result.vendor_id), result]),
  );

  return { ...query, eligibilityByVendorId };
};

export default useRfqEligibility;
