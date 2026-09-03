import { useQuery } from "@tanstack/react-query";
import goodsReceiptService from "../services/goodsReceiptService";

export const GRN_LIST_KEY = (vendorId) => ["accountsPayable", "goodsReceipt", "list", vendorId];

/**
 * Goods receipts for one vendor — backs the Vendor Detail > GRN tab.
 * @param {string|number} vendorId
 */
export const useGoodsReceipts = (vendorId) => {
  const query = useQuery({
    queryKey: GRN_LIST_KEY(vendorId),
    queryFn: () => goodsReceiptService.getGoodsReceipts({ vendorId: Number(vendorId) }),
    enabled: !!vendorId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  return {
    goodsReceipts: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
};

export default useGoodsReceipts;
