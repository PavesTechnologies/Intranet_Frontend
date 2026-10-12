import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reviewWorkbenchService } from "../services/reviewWorkbenchService";
import { invalidateInvoices } from "./useInvoiceMutations";

export const REVIEW_WORKBENCH_KEY = ["accountsPayable", "reviewWorkbench"];

export function useReviewWorkbench(stage) {
  return useQuery({
    queryKey: [...REVIEW_WORKBENCH_KEY, stage],
    queryFn: () => reviewWorkbenchService.getWorkbench(stage),
  });
}

function useWorkbenchMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: REVIEW_WORKBENCH_KEY }),
        queryClient.invalidateQueries({ queryKey: ["accountsPayable", "reviewQueue"] }),
        invalidateInvoices(queryClient),
      ]),
  });
}

export function useBulkReviewMutation() {
  return useWorkbenchMutation(({ items, sendForApproval }) => reviewWorkbenchService.bulkReview(items, sendForApproval));
}

export function useBulkSendMutation() {
  return useWorkbenchMutation((invoiceIds) => reviewWorkbenchService.bulkSend(invoiceIds));
}
