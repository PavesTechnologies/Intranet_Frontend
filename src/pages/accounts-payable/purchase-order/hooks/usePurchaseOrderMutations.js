import { useMutation, useQueryClient } from "@tanstack/react-query";
import purchaseOrderService from "../services/purchaseOrderService";
import { PO_LIST_KEY } from "./usePurchaseOrders";

export const useCreatePurchaseOrder = (vendorId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => purchaseOrderService.createPurchaseOrder(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PO_LIST_KEY(vendorId) }),
  });
};

export default useCreatePurchaseOrder;
