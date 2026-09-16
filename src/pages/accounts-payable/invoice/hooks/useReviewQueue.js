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

/**
 * Saves OCR field corrections for one inbound document (Path A or Path B). No separate status
 * transition is fired here — Backend/Business_Layer/services/invoice_process_service.py's
 * apply_ocr_review already unconditionally advances the invoice to Pending Approval (or straight
 * to Approved, if it qualifies for auto-approval) as part of this same save. A prior version of
 * this hook additionally called PUT /invoice/status-update/{id} to do that client-side — besides
 * being redundant, that endpoint doesn't actually exist in the backend, so every save was
 * silently throwing after the review had already been persisted successfully.
 */
export function useSaveOcrReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inboundDocumentId, payload }) => reviewQueueService.saveOcrReview(inboundDocumentId, payload),
    // Returning this (rather than firing invalidation and moving on) keeps the mutation pending
    // until the review queue/invoice list have actually refetched, so callers that close a
    // modal/dialog on success don't do so before the underlying table has reloaded.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["accountsPayable", "reviewQueue"] }),
        queryClient.invalidateQueries({ queryKey: ["accountsPayable", "invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["accountsPayable", "invoice"] }),
        queryClient.invalidateQueries({ queryKey: INVOICE_SUMMARY_KEY }),
      ]),
  });
}
