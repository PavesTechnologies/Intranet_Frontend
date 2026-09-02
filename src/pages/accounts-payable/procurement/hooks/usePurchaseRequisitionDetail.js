import { useQuery } from "@tanstack/react-query";
import procurementService from "../services/procurementService";

export const PR_DETAIL_KEY = (prId) => ["accountsPayable", "procurement", "purchaseRequisition", prId];

export const usePurchaseRequisitionDetail = (prId) =>
  useQuery({
    queryKey: PR_DETAIL_KEY(prId),
    queryFn: () => procurementService.getPurchaseRequisitionById(prId),
    enabled: !!prId,
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

export default usePurchaseRequisitionDetail;
