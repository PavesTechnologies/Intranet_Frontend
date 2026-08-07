import { useQuery } from "@tanstack/react-query";
import { invoiceService } from "../services/invoiceService";

export const INVOICE_DETAIL_KEY = (invoiceId) => ["accountsPayable", "invoice", invoiceId];

/** @param {string} invoiceId */
export function useInvoiceDetail(invoiceId) {
  return useQuery({
    queryKey: INVOICE_DETAIL_KEY(invoiceId),
    queryFn: () => invoiceService.getInvoice(invoiceId),
    enabled: Boolean(invoiceId),
    retry: false,
  });
}
