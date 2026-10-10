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

export function useRunAutomationNow() {
  return useRefreshAfter(() => apAutomationService.runNow());
}

export function useRecheckInvoice() {
  return useRefreshAfter((invoiceId) => apAutomationService.recheckInvoice(invoiceId));
}
