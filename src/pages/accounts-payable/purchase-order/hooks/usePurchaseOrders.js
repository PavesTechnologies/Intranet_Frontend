import { useQuery } from "@tanstack/react-query";
import purchaseOrderService from "../services/purchaseOrderService";

export const PO_LIST_KEY = (vendorId) => ["accountsPayable", "purchaseOrder", "list", vendorId];
export const PO_DETAIL_KEY = (poId) => ["accountsPayable", "purchaseOrder", "detail", poId];

/**
 * Purchase orders for one vendor — backs the Vendor Detail > PO tab.
 * @param {string|number} vendorId
 */
export const usePurchaseOrders = (vendorId) => {
  const query = useQuery({
    queryKey: PO_LIST_KEY(vendorId),
    queryFn: () => purchaseOrderService.getPurchaseOrders({ vendorId: Number(vendorId) }),
    enabled: !!vendorId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  return {
    purchaseOrders: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
};

/**
 * A single PO with its lines — used by the GRN form's "PO Line" selector,
 * which must only offer lines belonging to the selected PO.
 * @param {string|number|null} poId
 */
export const usePurchaseOrderDetail = (poId) => {
  const query = useQuery({
    queryKey: PO_DETAIL_KEY(poId),
    queryFn: () => purchaseOrderService.getPurchaseOrderById(poId),
    enabled: !!poId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  return {
    purchaseOrder: query.data,
    poLines: query.data?.purchase_order_line || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
};

export default usePurchaseOrders;
