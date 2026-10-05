import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tdsService } from "../services/tdsService";
import { INVOICE_DETAIL_KEY } from "./useInvoiceDetail";
import { INVOICE_HISTORY_KEY } from "./useInvoiceHistory";

// Normalized to a number — see useInvoiceDetail.js's INVOICE_DETAIL_KEY for why this matters.
export const INVOICE_TDS_KEY = (invoiceId) => ["accountsPayable", "invoiceTds", Number(invoiceId)];

function invalidateTds(queryClient, invoiceId) {
  queryClient.invalidateQueries({ queryKey: INVOICE_DETAIL_KEY(invoiceId) });
  queryClient.invalidateQueries({ queryKey: INVOICE_TDS_KEY(invoiceId) });
  queryClient.invalidateQueries({ queryKey: INVOICE_HISTORY_KEY(invoiceId) });
  queryClient.invalidateQueries({ queryKey: ["accountsPayable", "invoices"] });
}

/**
 * The invoice's TDS determination — payment nature, rule, calculated amounts, and
 * determination_status (PENDING/DETERMINED/VERIFIED). A 404 ("TDS not yet determined") is a
 * normal empty state, not an error — see tdsService.getTds and InvoiceTdsPanel's use of
 * error?.status === 404, same convention useInvoiceApproval already uses for its own 404.
 * @param {string|number} invoiceId
 */
export function useInvoiceTds(invoiceId) {
  return useQuery({
    queryKey: INVOICE_TDS_KEY(invoiceId),
    queryFn: () => tdsService.getTds(invoiceId),
    enabled: Boolean(invoiceId),
    retry: false,
  });
}

/** @param {string|number} invoiceId */
export function useDetermineTdsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId) => tdsService.determineTds(invoiceId),
    onSuccess: (_, invoiceId) => invalidateTds(queryClient, invoiceId),
  });
}

/** @param {{invoiceId: string|number, paymentNatureCode: string}} variables */
export function useUpdateTdsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, paymentNatureCode }) => tdsService.updateTds(invoiceId, paymentNatureCode),
    onSuccess: (_, variables) => invalidateTds(queryClient, variables.invoiceId),
  });
}

/** @param {{invoiceId: string|number, remarks?: string}} variables */
export function useVerifyTdsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, remarks }) => tdsService.verifyTds(invoiceId, remarks),
    onSuccess: (_, variables) => invalidateTds(queryClient, variables.invoiceId),
  });
}
