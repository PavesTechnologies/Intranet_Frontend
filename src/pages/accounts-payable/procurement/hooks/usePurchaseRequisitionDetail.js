import { useQuery } from "@tanstack/react-query";
import procurementService from "../services/procurementService";

// prId must be normalized to a string: PrDetailPage reads it as a string route param, but
// PrLineEditor's line mutations receive the numeric `pr.id` from the fetched PR object. Without
// coercion those two callers would produce different-typed (and therefore non-matching) cache
// keys, so invalidating from a line mutation would silently miss the active detail query — the
// PR Lines table would then only reflect the new/edited line after a manual page refresh.
export const PR_DETAIL_KEY = (prId) => ["accountsPayable", "procurement", "purchaseRequisition", String(prId)];

export const usePurchaseRequisitionDetail = (prId) =>
  useQuery({
    queryKey: PR_DETAIL_KEY(prId),
    queryFn: () => procurementService.getPurchaseRequisitionById(prId),
    enabled: !!prId,
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

// Same string-normalization reason as PR_DETAIL_KEY above — keep the two keys' prId typing
// consistent so a mutation that invalidates both always hits the same cache entries.
export const PR_TIMELINE_KEY = (prId) => ["accountsPayable", "procurement", "purchaseRequisitionTimeline", String(prId)];

/** Persisted workflow history (GET /purchase-requisitions/{pr_id}/timeline) — never fabricated client-side. */
export const usePrTimeline = (prId) =>
  useQuery({
    queryKey: PR_TIMELINE_KEY(prId),
    queryFn: () => procurementService.getPrTimeline(prId),
    enabled: !!prId,
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

export default usePurchaseRequisitionDetail;
