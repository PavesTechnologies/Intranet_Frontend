import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apConfigService from "../services/apConfigService";

export const AP_CONFIG_KEY = ["accountsPayable", "administration", "apConfig"];

export const useAPConfig = () =>
  useQuery({
    queryKey: AP_CONFIG_KEY,
    queryFn: apConfigService.getAPConfig,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

export const useUpdateAPConfig = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload) => apConfigService.updateAPConfig(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AP_CONFIG_KEY });
    },
  });
};

export default useAPConfig;
