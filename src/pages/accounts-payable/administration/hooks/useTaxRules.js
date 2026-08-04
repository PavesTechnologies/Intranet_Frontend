import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apConfigService from "../services/apConfigService";

export const TAX_RULES_KEY = ["accountsPayable", "administration", "taxRules"];

export const useTaxRules = () =>
  useQuery({
    queryKey: TAX_RULES_KEY,
    queryFn: apConfigService.getTaxRules,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

export const useSaveTaxRule = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload) => apConfigService.saveTaxRule(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TAX_RULES_KEY });
    },
  });
};

export const useDeleteTaxRule = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id) => apConfigService.deleteTaxRule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TAX_RULES_KEY });
    },
  });
};

export default useTaxRules;
