import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { approvalService } from "../services/approvalService";
import { INVOICE_DETAIL_KEY } from "./useInvoiceDetail";

export const INVOICE_APPROVALS_KEY = (invoiceId) => ["accountsPayable", "invoiceApprovals", invoiceId];

/** @param {string|number} invoiceId */
export function useInvoiceApprovals(invoiceId) {
  return useQuery({
    queryKey: INVOICE_APPROVALS_KEY(invoiceId),
    queryFn: () => approvalService.getApprovalHistory(invoiceId),
    enabled: Boolean(invoiceId),
    retry: false,
  });
}

function invalidateAfterDecision(queryClient, invoiceId) {
  queryClient.invalidateQueries({ queryKey: INVOICE_DETAIL_KEY(invoiceId) });
  queryClient.invalidateQueries({ queryKey: INVOICE_APPROVALS_KEY(invoiceId) });
  queryClient.invalidateQueries({ queryKey: ["accountsPayable", "invoices"] });
}

/** @param {{invoiceId: string|number, comments?: string}} variables */
export function useApproveInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, comments }) => approvalService.approve(invoiceId, comments),
    onSuccess: (_, variables) => invalidateAfterDecision(queryClient, variables.invoiceId),
  });
}

/** @param {{invoiceId: string|number, comments: string}} variables - comments is required */
export function useRejectInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, comments }) => approvalService.reject(invoiceId, comments),
    onSuccess: (_, variables) => invalidateAfterDecision(queryClient, variables.invoiceId),
  });
}
