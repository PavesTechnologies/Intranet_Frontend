import { useMutation, useQueryClient } from "@tanstack/react-query";
import goodsReceiptService from "../services/goodsReceiptService";
import { GRN_LIST_KEY } from "./useGoodsReceipts";

export const useCreateGoodsReceipt = (vendorId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => goodsReceiptService.createGoodsReceipt(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: GRN_LIST_KEY(vendorId) }),
  });
};

export default useCreateGoodsReceipt;
