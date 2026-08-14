import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewQueueService } from "../services/reviewQueueService";
import { INVOICE_SUMMARY_KEY } from "./useInvoiceSummary";

export const REVIEW_QUEUE_KEY = (params) => ["accountsPayable", "reviewQueue", params];

/** @param {{skip?: number, limit?: number}} [params] */
export function useReviewQueue(params = {}) {
  const { skip = 0, limit = 50 } = params;
  return useQuery({
    queryKey: REVIEW_QUEUE_KEY({ skip, limit }),
    queryFn: () => reviewQueueService.getReviewQueue({ skip, limit }),
    staleTime: 30_000,
    retry: 1,
  });
}

/** Saves OCR field corrections for one inbound document (Path A or Path B). */
export function useSaveOcrReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inboundDocumentId, payload }) =>
      reviewQueueService.saveOcrReview(inboundDocumentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountsPayable", "reviewQueue"] });
      queryClient.invalidateQueries({ queryKey: ["accountsPayable", "invoices"] });
      queryClient.invalidateQueries({ queryKey: INVOICE_SUMMARY_KEY });
    },
  });
}
