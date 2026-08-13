import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceService } from "../services/invoiceService";
import { INVOICE_ACTIONS, INVOICE_ACTION_RESULT_STATUS } from "../../constants/invoiceActions";
import { INVOICE_DETAIL_KEY } from "./useInvoiceDetail";
import { INVOICE_SUMMARY_KEY } from "./useInvoiceSummary";

function invalidateInvoices(queryClient, invoiceId) {
  queryClient.invalidateQueries({ queryKey: ["accountsPayable", "invoices"] });
  queryClient.invalidateQueries({ queryKey: INVOICE_SUMMARY_KEY });
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
        historyNote: "OCR corrections saved — submitted for validation",
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
        historyNote: "Re-queued for OCR processing",
      }),
    onSuccess: (_, variables) => invalidateInvoices(queryClient, variables.invoiceId),
  });
}

/** Marks an invoice as validated — moves it to Pending Approval (validation never auto-approves). */
export function useValidateInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId }) =>
      invoiceService.updateInvoice(invoiceId, {
        status: INVOICE_ACTION_RESULT_STATUS[INVOICE_ACTIONS.VALIDATE],
        historyNote: "Validation passed — submitted for approval",
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
        historyNote: "Sent back for correction — validation failed",
      }),
    onSuccess: (_, variables) => invalidateInvoices(queryClient, variables.invoiceId),
  });
}

/** Approves a pending invoice — moves it straight to Ready for Payment (Approved is transient). */
export function useApproveInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, approvedBy }) =>
      invoiceService.updateInvoice(invoiceId, {
        status: INVOICE_ACTION_RESULT_STATUS[INVOICE_ACTIONS.APPROVE_INVOICE],
        approval: { required: true, approvedBy, approvedAt: new Date().toISOString(), rejectionReason: "" },
        historyNote: `Approved by ${approvedBy} — moved to Ready for Payment`,
      }),
    onSuccess: (_, variables) => invalidateInvoices(queryClient, variables.invoiceId),
  });
}

/** Rejects a pending invoice — requires a reason, moves it to Rejected. */
export function useRejectInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, rejectedBy, reason }) =>
      invoiceService.updateInvoice(invoiceId, {
        status: INVOICE_ACTION_RESULT_STATUS[INVOICE_ACTIONS.REJECT_INVOICE],
        approval: { required: true, approvedBy: rejectedBy, approvedAt: "", rejectionReason: reason },
        historyNote: `Rejected by ${rejectedBy} — ${reason}`,
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
