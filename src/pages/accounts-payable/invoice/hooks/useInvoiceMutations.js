import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceService } from "../services/invoiceService";
import { INVOICE_DETAIL_KEY } from "./useInvoiceDetail";
import { INVOICE_SUMMARY_KEY } from "./useInvoiceSummary";

function invalidateInvoices(queryClient, invoiceId) {
  queryClient.invalidateQueries({ queryKey: ["accountsPayable", "invoices"] });
  queryClient.invalidateQueries({ queryKey: INVOICE_SUMMARY_KEY });
  if (invoiceId) queryClient.invalidateQueries({ queryKey: INVOICE_DETAIL_KEY(invoiceId) });
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
