import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceService } from "../services/invoiceService";
import { INVOICE_ACTIONS, INVOICE_ACTION_RESULT_STATUS } from "../../constants/invoiceActions";
import { INVOICE_DETAIL_KEY } from "./useInvoiceDetail";

function invalidateInvoices(queryClient, invoiceId) {
  queryClient.invalidateQueries({ queryKey: ["accountsPayable", "invoices"] });
  if (invoiceId) queryClient.invalidateQueries({ queryKey: INVOICE_DETAIL_KEY(invoiceId) });
}

/** @param {File} file */
export function useUploadInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file) => invoiceService.uploadInvoice(file),
    onSuccess: () => invalidateInvoices(queryClient),
  });
}

/** Saves corrected OCR fields and transitions the invoice into the Validation queue. */
export function useSaveOcrCorrectionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, ocrFields }) =>
      invoiceService.updateInvoice(invoiceId, {
        ocrFields,
        status: INVOICE_ACTION_RESULT_STATUS[INVOICE_ACTIONS.SAVE_OCR_CORRECTIONS],
      }),
    onSuccess: (_, variables) => invalidateInvoices(queryClient, variables.invoiceId),
  });
}

/** Sends a failed-OCR invoice back through OCR processing. */
export function useResubmitOcrMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId }) =>
      invoiceService.updateInvoice(invoiceId, {
        status: INVOICE_ACTION_RESULT_STATUS[INVOICE_ACTIONS.RESUBMIT_OCR],
      }),
    onSuccess: (_, variables) => invalidateInvoices(queryClient, variables.invoiceId),
  });
}

/** Marks an invoice as validated — moves it to Ready for Payment. */
export function useValidateInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId }) =>
      invoiceService.updateInvoice(invoiceId, {
        status: INVOICE_ACTION_RESULT_STATUS[INVOICE_ACTIONS.VALIDATE],
      }),
    onSuccess: (_, variables) => invalidateInvoices(queryClient, variables.invoiceId),
  });
}

/** Rejects validation — moves the invoice to Validation Failed for correction. */
export function useRejectValidationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId }) =>
      invoiceService.updateInvoice(invoiceId, {
        status: INVOICE_ACTION_RESULT_STATUS[INVOICE_ACTIONS.REJECT_VALIDATION],
      }),
    onSuccess: (_, variables) => invalidateInvoices(queryClient, variables.invoiceId),
  });
}

/** @param {{issueId: string, invoiceId: string, resolvedBy?: string}} variables */
export function useResolveInvoiceIssueMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ issueId, resolvedBy }) => invoiceService.resolveInvoiceIssue(issueId, { resolvedBy }),
    onSuccess: (_, variables) => invalidateInvoices(queryClient, variables.invoiceId),
  });
}
