import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceService } from "../services/invoiceService";
import { INVOICE_DETAIL_KEY } from "./useInvoiceDetail";
import { INVOICE_SUMMARY_KEY } from "./useInvoiceSummary";

/**
 * Returns the invalidation promise so callers can `await` it in `onSuccess` — invalidateQueries
 * resolves once its matching *active* queries have actually refetched, not just when they're
 * marked stale. Awaiting it there keeps the mutation pending until the invoice list/detail have
 * genuinely reloaded, instead of letting the UI (e.g. closing a confirm dialog) move on first.
 */
function invalidateInvoices(queryClient, invoiceId) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["accountsPayable", "invoices"] }),
    queryClient.invalidateQueries({ queryKey: INVOICE_SUMMARY_KEY }),
    invoiceId ? queryClient.invalidateQueries({ queryKey: INVOICE_DETAIL_KEY(invoiceId) }) : null,
  ]);
}

/**
 * The only invoice mutation with a real, direct backend endpoint outside the OCR review,
 * matching and approval flows (see useReviewQueue.js, useInvoiceMatching.js,
 * useInvoiceApprovals.js for those). Everything previously stubbed here (OCR corrections,
 * resubmit, validate, reject-validation) has either moved to a real endpoint or been retired as
 * backend-dependent — see the AP Integration Ledger.
 * @param {File} file
 */
export function useUploadInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file) => invoiceService.uploadInvoice(file),
    onSuccess: () => invalidateInvoices(queryClient),
  });
}

/**
 * Direct status transition via PUT /apm/invoice/status-update/{invoice_id}?status_id={status_id}.
 * Used by the Invoice Management row action that moves an invoice from OCR Review Pending to
 * Pending Approval without going through the OCR Review Queue's field-correction flow.
 */
export function useUpdateInvoiceStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, statusId }) => invoiceService.updateInvoiceStatus(invoiceId, statusId),
    onSuccess: (_data, { invoiceId }) => invalidateInvoices(queryClient, invoiceId),
  });
}
