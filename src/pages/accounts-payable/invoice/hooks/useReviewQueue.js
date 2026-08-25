import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewQueueService } from "../services/reviewQueueService";
import { invoiceService } from "../services/invoiceService";
import { INVOICE_SUMMARY_KEY } from "./useInvoiceSummary";
import { INVOICE_STATUS_ID } from "../../constants/invoiceStatus";

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
 * Saves OCR field corrections for one inbound document (Path A or Path B), then — for Path A
 * items, which carry an `invoiceId` because the invoice already exists — advances that invoice
 * from OCR Review Pending to Pending Approval via the status-update endpoint. Path B items have
 * no invoiceId yet at this point, so no status transition is fired for them.
 */
export function useSaveOcrReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ inboundDocumentId, payload, invoiceId }) => {
      const result = await reviewQueueService.saveOcrReview(inboundDocumentId, payload);
      if (invoiceId) {
        await invoiceService.updateInvoiceStatus(invoiceId, INVOICE_STATUS_ID.PENDING_APPROVAL);
      }
      return result;
    },
    // Returning this (rather than firing invalidation and moving on) keeps the mutation pending
    // until the review queue/invoice list have actually refetched, so callers that close a
    // modal/dialog on success don't do so before the underlying table has reloaded.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["accountsPayable", "reviewQueue"] }),
        queryClient.invalidateQueries({ queryKey: ["accountsPayable", "invoices"] }),
        queryClient.invalidateQueries({ queryKey: INVOICE_SUMMARY_KEY }),
      ]),
  });
}
