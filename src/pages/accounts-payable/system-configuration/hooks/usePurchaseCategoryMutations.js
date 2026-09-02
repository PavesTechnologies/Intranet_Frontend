import { useMutation, useQueryClient } from "@tanstack/react-query";
import purchaseCategoryService from "../services/purchaseCategoryService";
import { PURCHASE_CATEGORIES_KEY } from "./usePurchaseCategories";

const invalidatePurchaseCategories = (qc) =>
  qc.invalidateQueries({ queryKey: PURCHASE_CATEGORIES_KEY });

export const useCreatePurchaseCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => purchaseCategoryService.createPurchaseCategory(payload),
    onSuccess: () => invalidatePurchaseCategories(qc),
  });
};

export const useUpdatePurchaseCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, payload }) =>
      purchaseCategoryService.updatePurchaseCategory(categoryId, payload),
    onSuccess: () => invalidatePurchaseCategories(qc),
  });
};

export const useDeletePurchaseCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categoryId) => purchaseCategoryService.deletePurchaseCategory(categoryId),
    onSuccess: () => invalidatePurchaseCategories(qc),
  });
};
