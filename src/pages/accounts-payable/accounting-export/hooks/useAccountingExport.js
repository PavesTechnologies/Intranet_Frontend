import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import accountingExportService from "../services/accountingExportService";

export const ACCOUNTING_EXPORT_KEY = ["accountsPayable", "accountingExport"];

export function useLedgers() {
  return useQuery({ queryKey: [...ACCOUNTING_EXPORT_KEY, "ledgers"], queryFn: accountingExportService.ledgers, staleTime: 60_000 });
}

export function useExportPreview(filters) {
  return useQuery({
    queryKey: [...ACCOUNTING_EXPORT_KEY, "preview", filters],
    queryFn: () => accountingExportService.preview(filters),
    enabled: Boolean(filters.dateFrom && filters.dateTo && filters.types?.length),
    staleTime: 15_000,
  });
}

export function useExportHistory() {
  return useQuery({ queryKey: [...ACCOUNTING_EXPORT_KEY, "history"], queryFn: accountingExportService.history, staleTime: 30_000 });
}

function useExportMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCOUNTING_EXPORT_KEY }) });
}

export const useUpdateLedgers = () => useExportMutation((body) => accountingExportService.updateLedgers(body));
export const useRunExport = () => useExportMutation((args) => accountingExportService.exportFile(args));
