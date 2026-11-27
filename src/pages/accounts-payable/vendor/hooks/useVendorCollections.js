import { useQuery } from "@tanstack/react-query";
import vendorService from "../services/vendorService";

/**
 * The vendor-scoped collection endpoints (GET /apm/vendor/{id}/purchase-orders | /ndas | /grns |
 * /documents). Each backend response is `{ vendor_id, count, items, ... }`, so `count` is read
 * straight off the response rather than re-derived from the array — the Vendor Activity cards
 * and the per-tab counts show exactly what the API reported, never a hardcoded or guessed value.
 *
 * One query key per collection per vendor means the Overview cards and the matching tab share a
 * single cached request instead of each firing their own.
 */

// vendorId is normalized to a string, same as VENDOR_DETAIL_KEY — the tabs pass the route
// param while PO/GRN mutations may pass a numeric id, and both must match one cache entry.
export const VENDOR_PURCHASE_ORDERS_KEY = (vendorId) => [
  "accountsPayable",
  "vendor-purchase-orders",
  String(vendorId),
];
export const VENDOR_NDAS_KEY = (vendorId) => ["accountsPayable", "vendor-ndas", String(vendorId)];
export const VENDOR_GRNS_KEY = (vendorId) => ["accountsPayable", "vendor-grns", String(vendorId)];
export const VENDOR_DOCUMENTS_KEY = (vendorId) => ["accountsPayable", "vendor-documents", String(vendorId)];

// Matches the caching the other vendor-detail queries already use.
const COLLECTION_OPTIONS = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  retry: 1,
};

/** Shared unwrapping so every collection hook exposes the same surface to its consumer. */
const collectionResult = (query) => ({
  items: query.data?.items || [],
  // `count` is the backend's own number. An empty collection is a normal 200 with count 0.
  count: query.data?.count ?? 0,
  isLoading: query.isLoading,
  isFetching: query.isFetching,
  isError: query.isError,
  error: query.error,
  refetch: query.refetch,
});

/** Purchase orders raised against this vendor. */
export const useVendorPurchaseOrders = (vendorId) => {
  const query = useQuery({
    queryKey: VENDOR_PURCHASE_ORDERS_KEY(vendorId),
    queryFn: () => vendorService.getVendorPurchaseOrders(vendorId),
    enabled: !!vendorId,
    ...COLLECTION_OPTIONS,
  });

  return collectionResult(query);
};

/** Every NDA on file for this vendor, newest first (VendorNdaDTO, without the content body). */
export const useVendorNdas = (vendorId) => {
  const query = useQuery({
    queryKey: VENDOR_NDAS_KEY(vendorId),
    queryFn: () => vendorService.getVendorNdas(vendorId),
    enabled: !!vendorId,
    ...COLLECTION_OPTIONS,
  });

  return collectionResult(query);
};

/** Goods receipts recorded against this vendor (GoodsReceiptDTO). */
export const useVendorGrns = (vendorId) => {
  const query = useQuery({
    queryKey: VENDOR_GRNS_KEY(vendorId),
    queryFn: () => vendorService.getVendorGrns(vendorId),
    enabled: !!vendorId,
    ...COLLECTION_OPTIONS,
  });

  return collectionResult(query);
};

/**
 * Documents attached to this vendor's records. Adds `countsByType` — the response's own
 * `counts_by_type` breakdown ({ PURCHASE_ORDER: 2, NDA: 1, ... }), so per-type counts need no
 * second pass over the items.
 */
export const useVendorDocuments = (vendorId) => {
  const query = useQuery({
    queryKey: VENDOR_DOCUMENTS_KEY(vendorId),
    queryFn: () => vendorService.getVendorDocuments(vendorId),
    enabled: !!vendorId,
    ...COLLECTION_OPTIONS,
  });

  return {
    ...collectionResult(query),
    countsByType: query.data?.counts_by_type || {},
  };
};

/**
 * Total PO value for a vendor — the sum of the PurchaseOrderDTO's own `total_amount`, which is
 * the order total the backend already computed (subtotal + tax_amount). POs with no total yet
 * contribute 0 rather than breaking the sum.
 * @param {Array<{total_amount?: number|string|null}>} purchaseOrders
 * @returns {number}
 */
export const sumPurchaseOrderValue = (purchaseOrders = []) =>
  purchaseOrders.reduce((total, po) => {
    const amount = Number(po?.total_amount);
    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);

export default useVendorPurchaseOrders;
