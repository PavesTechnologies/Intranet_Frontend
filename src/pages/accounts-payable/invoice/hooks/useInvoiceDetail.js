import { useQuery } from "@tanstack/react-query";
import { invoiceService } from "../services/invoiceService";

// Normalized to a number regardless of caller type — InvoiceDetailPage fetches with the route
// param (a string from useParams()), while every mutation elsewhere (InvoiceApprovalPanel,
// InvoicePaymentPanel, InvoiceTdsPanel) invalidates with invoice.id (a number, from
// mapInvoiceRecord). React Query keys are structurally matched, so "125" and 125 previously
// hashed to different cache entries — invalidateQueries silently never refetched this page's own
// invoice query after any of those actions, even though sibling queries keyed consistently by
// invoice.id (approval, TDS) refreshed fine. Do not drop this coercion.
export const INVOICE_DETAIL_KEY = (invoiceId) => ["accountsPayable", "invoice", Number(invoiceId)];

/** @param {string} invoiceId */
export function useInvoiceDetail(invoiceId) {
  return useQuery({
    queryKey: INVOICE_DETAIL_KEY(invoiceId),
    queryFn: () => invoiceService.getInvoice(invoiceId),
    enabled: Boolean(invoiceId),
    retry: false,
  });
}
