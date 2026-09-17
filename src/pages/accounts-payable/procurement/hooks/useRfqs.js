import { useQuery } from "@tanstack/react-query";
import rfqService from "../services/rfqService";

/**
 * Shared base key for all RFQ list queries.
 * Invalidating this key refreshes all RFQ list/filter variants.
 */
export const RFQ_LISTS_KEY = [
  "accountsPayable",
  "procurement",
  "rfqs",
];

export const RFQ_LIST_KEY = (filters = {}) => [
  ...RFQ_LISTS_KEY,
  filters,
];

export const RFQ_DETAIL_KEY = (rfqId) => [
  "accountsPayable",
  "procurement",
  "rfq",
  String(rfqId),
];

export const RFQ_VENDORS_KEY = (rfqId) => [
  "accountsPayable",
  "procurement",
  "rfqVendors",
  String(rfqId),
];

export const RFQ_QUOTATIONS_KEY = (rfqId) => [
  "accountsPayable",
  "procurement",
  "rfqQuotations",
  String(rfqId),
];

/**
 * RFQs belonging to a PR.
 */
export const useRfqsForPr = (prId) =>
  useQuery({
    queryKey: RFQ_LIST_KEY({ prId }),
    queryFn: () =>
      rfqService.getRfqs({
        prId,
        limit: 200,
      }),
    enabled: Boolean(prId),
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: 1,
  });

/**
 * Single RFQ detail.
 *
 * staleTime is intentionally 0 because RFQ workflow actions
 * can change the status/vendor relationship immediately.
 */
export const useRfqDetail = (rfqId) => {
  const normalizedRfqId = String(rfqId || "");

  return useQuery({
    queryKey: RFQ_DETAIL_KEY(normalizedRfqId),
    queryFn: () => rfqService.getRfqById(normalizedRfqId),
    enabled: Boolean(normalizedRfqId),
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: 1,
  });
};

/**
 * Vendors invited to an RFQ.
 */
export const useRfqVendors = (rfqId) => {
  const normalizedRfqId = String(rfqId || "");

  return useQuery({
    queryKey: RFQ_VENDORS_KEY(normalizedRfqId),
    queryFn: () =>
      rfqService.getRfqVendors(normalizedRfqId),
    enabled: Boolean(normalizedRfqId),
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: 1,
  });
};

/**
 * Quotations belonging to an RFQ.
 */
export const useQuotationsForRfq = (rfqId) => {
  const normalizedRfqId = String(rfqId || "");

  return useQuery({
    queryKey: RFQ_QUOTATIONS_KEY(normalizedRfqId),
    queryFn: () =>
      rfqService.getQuotationsForRfq(normalizedRfqId),
    enabled: Boolean(normalizedRfqId),
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: 1,
  });
};

export default useRfqsForPr;