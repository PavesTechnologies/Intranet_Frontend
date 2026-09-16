import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { approvalService } from "../services/approvalService";
import { INVOICE_DETAIL_KEY } from "./useInvoiceDetail";

export const INVOICE_APPROVAL_KEY = (invoiceId) => ["accountsPayable", "invoiceApproval", invoiceId];
export const INVOICE_APPROVAL_STEPS_KEY = (invoiceId) => ["accountsPayable", "invoiceApprovalSteps", invoiceId];

function invalidateApproval(queryClient, invoiceId) {
  queryClient.invalidateQueries({ queryKey: INVOICE_DETAIL_KEY(invoiceId) });
  queryClient.invalidateQueries({ queryKey: INVOICE_APPROVAL_KEY(invoiceId) });
  queryClient.invalidateQueries({ queryKey: INVOICE_APPROVAL_STEPS_KEY(invoiceId) });
  queryClient.invalidateQueries({ queryKey: ["accountsPayable", "invoices"] });
}

/**
 * The invoice's latest approval instance — status, policy id, timestamps, and steps (each with
 * their approvers). This is the authoritative snapshot for both the live timeline and the
 * Approval History section; nothing here is reconstructed from current UMS roles/permissions.
 * A 404 ("Invoice N has no approval history") means send-for-approval hasn't been called yet —
 * treated as "no approval instance" by the caller, not a hard error.
 * @param {string|number} invoiceId
 */
export function useInvoiceApproval(invoiceId) {
  return useQuery({
    queryKey: INVOICE_APPROVAL_KEY(invoiceId),
    queryFn: () => approvalService.getApproval(invoiceId),
    enabled: Boolean(invoiceId),
    retry: false,
  });
}

/**
 * Standalone steps fetch — same data as useInvoiceApproval(...).data.steps, kept separate since
 * the backend exposes it as its own endpoint and some callers only need the step list.
 * @param {string|number} invoiceId
 */
export function useInvoiceApprovalSteps(invoiceId) {
  return useQuery({
    queryKey: INVOICE_APPROVAL_STEPS_KEY(invoiceId),
    queryFn: () => approvalService.getApprovalSteps(invoiceId),
    enabled: Boolean(invoiceId),
    retry: false,
  });
}

/** @param {string|number} invoiceId */
export function useSendForApprovalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId) => approvalService.sendForApproval(invoiceId),
    onSuccess: (_, invoiceId) => invalidateApproval(queryClient, invoiceId),
  });
}

/** @param {{invoiceId: string|number, comments?: string}} variables */
export function useApproveInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, comments }) => approvalService.approve(invoiceId, comments),
    onSuccess: (_, variables) => invalidateApproval(queryClient, variables.invoiceId),
  });
}

/** @param {{invoiceId: string|number, comments: string}} variables - comments is required */
export function useRejectInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, comments }) => approvalService.reject(invoiceId, comments),
    onSuccess: (_, variables) => invalidateApproval(queryClient, variables.invoiceId),
  });
}
