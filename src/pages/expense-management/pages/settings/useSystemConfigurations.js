import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { systemConfigurationApi } from "./systemConfigurationApi";

export const SYSTEM_CONFIGURATIONS_KEY = ["xmsSystemConfigurations"];

const unwrap = (res) => res.data?.data;

export const useSystemConfigurations = () =>
  useQuery({
    queryKey: SYSTEM_CONFIGURATIONS_KEY,
    queryFn: () => systemConfigurationApi.getAll().then(unwrap),
    staleTime: 30_000,
  });

export const useSaveSystemConfiguration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      (id ? systemConfigurationApi.update(id, payload) : systemConfigurationApi.create(payload)).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: SYSTEM_CONFIGURATIONS_KEY }),
  });
};

export const useDeleteSystemConfiguration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => systemConfigurationApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SYSTEM_CONFIGURATIONS_KEY }),
  });
};
