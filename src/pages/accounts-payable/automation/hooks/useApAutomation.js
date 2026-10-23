import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apAutomationService } from "../services/apAutomationService";
import { REVIEW_WORKBENCH_KEY } from "../../invoice/hooks/useReviewWorkbench";
import { invalidateInvoices } from "../../invoice/hooks/useInvoiceMutations";

export const AP_AUTOMATION_KEY = ["accountsPayable", "apAutomation"];

export function useAutomationSettings() {
  return useQuery({ queryKey: [...AP_AUTOMATION_KEY, "settings"], queryFn: () => apAutomationService.getSettings() });
}

export function useAutomationStats(days = 30) {
  return useQuery({ queryKey: [...AP_AUTOMATION_KEY, "stats", days], queryFn: () => apAutomationService.getStats(days) });
}

export function useUpdateAutomationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes) => apAutomationService.updateSettings(changes),
    onSuccess: (settings) => queryClient.setQueryData([...AP_AUTOMATION_KEY, "settings"], settings),
  });
}

function useRefreshAfter(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: AP_AUTOMATION_KEY }),
        queryClient.invalidateQueries({ queryKey: REVIEW_WORKBENCH_KEY }),
        invalidateInvoices(queryClient),
      ]),
  });
}

export function useSharePointImport() {
  return useQuery({ queryKey: [...AP_AUTOMATION_KEY, "sharepoint"], queryFn: () => apAutomationService.getSharePointImport() });
}

export function useSetSharePointImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled) => apAutomationService.setSharePointImport(enabled),
    onSuccess: (status) => queryClient.setQueryData([...AP_AUTOMATION_KEY, "sharepoint"], status),
  });
}

export function useSegregationOfDuties() {
  return useQuery({ queryKey: [...AP_AUTOMATION_KEY, "sod"], queryFn: () => apAutomationService.getSegregationOfDuties() });
}

export function useSetSegregationOfDuties() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rules) => apAutomationService.setSegregationOfDuties(rules),
    onSuccess: (rules) => queryClient.setQueryData([...AP_AUTOMATION_KEY, "sod"], rules),
  });
}

export function useRunAutomationNow() {
  return useRefreshAfter(() => apAutomationService.runNow());
}

export function useRecheckInvoice() {
  return useRefreshAfter((invoiceId) => apAutomationService.recheckInvoice(invoiceId));
}
