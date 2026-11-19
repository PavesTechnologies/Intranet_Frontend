import { useMutation, useQueryClient } from "@tanstack/react-query";
import goodsReceiptService from "../services/goodsReceiptService";
import { GRN_LIST_KEY } from "./useGoodsReceipts";
// The Vendor Detail > GRN tab reads the vendor-scoped collection endpoint, so a new GRN or a
// newly uploaded GRN document has to invalidate that key too.
import { VENDOR_GRNS_KEY, VENDOR_DOCUMENTS_KEY } from "../../vendor/hooks/useVendorCollections";

export const useCreateGoodsReceipt = (vendorId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => goodsReceiptService.createGoodsReceipt(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GRN_LIST_KEY(vendorId) });
      qc.invalidateQueries({ queryKey: VENDOR_GRNS_KEY(vendorId) });
    },
  });
};

/**
 * Uploads a GRN document for an existing goods receipt (Vendor Detail > GRN tab, per-row "Upload"
 * action) — additional to manual GRN entry, not a replacement for useCreateGoodsReceipt.
 * @param {string|number} vendorId
 */
export const useUploadGoodsReceiptDocument = (vendorId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ grnId, file }) => goodsReceiptService.uploadGoodsReceiptDocument(grnId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GRN_LIST_KEY(vendorId) });
      qc.invalidateQueries({ queryKey: VENDOR_GRNS_KEY(vendorId) });
      // A newly attached file also changes the vendor's Documents list.
      qc.invalidateQueries({ queryKey: VENDOR_DOCUMENTS_KEY(vendorId) });
    },
  });
};

export default useCreateGoodsReceipt;
