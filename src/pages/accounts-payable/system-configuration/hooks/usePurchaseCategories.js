import { useQuery } from "@tanstack/react-query";
import purchaseCategoryService from "../services/purchaseCategoryService";

export const PURCHASE_CATEGORIES_KEY = ["accountsPayable", "systemConfig", "purchaseCategories"];

export const usePurchaseCategories = () =>
  useQuery({
    queryKey: PURCHASE_CATEGORIES_KEY,
    queryFn: purchaseCategoryService.getPurchaseCategories,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

export default usePurchaseCategories;
