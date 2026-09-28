import { useMutation, useQueryClient } from "@tanstack/react-query";
import purchaseOrderService from "../services/purchaseOrderService";
import { PO_LIST_KEY, PO_DETAIL_KEY } from "./usePurchaseOrders";
// The Vendor Detail > PO tab reads the vendor-scoped collection endpoint, so a new or updated
// PO has to invalidate that key too - otherwise the tab keeps showing the pre-write list.
import { VENDOR_PURCHASE_ORDERS_KEY } from "../../vendor/hooks/useVendorCollections";

export const useCreatePurchaseOrder = (vendorId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => purchaseOrderService.createPurchaseOrder(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PO_LIST_KEY(vendorId) });
      qc.invalidateQueries({ queryKey: VENDOR_PURCHASE_ORDERS_KEY(vendorId) });
    },
  });
};

/**
 * Uploads a PO document for an existing purchase order (Vendor Detail > PO tab, per-row "Upload"
 * action) — additional to manual PO entry, not a replacement for useCreatePurchaseOrder.
 * @param {string|number} vendorId
 */
export const useUploadPurchaseOrderDocument = (vendorId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, file }) => purchaseOrderService.uploadPurchaseOrderDocument(poId, file),
    onSuccess: (_data, { poId }) => {
      qc.invalidateQueries({ queryKey: PO_LIST_KEY(vendorId) });
      qc.invalidateQueries({ queryKey: PO_DETAIL_KEY(poId) });
      qc.invalidateQueries({ queryKey: VENDOR_PURCHASE_ORDERS_KEY(vendorId) });
    },
  });
};

export default useCreatePurchaseOrder;
