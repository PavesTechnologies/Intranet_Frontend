import { useQuery } from "@tanstack/react-query";
import { invoiceService } from "../services/invoiceService";

export const INVOICE_HISTORY_KEY = (invoiceId) => ["accountsPayable", "invoiceHistory", invoiceId];

/** @param {string|number} invoiceId */
export function useInvoiceHistory(invoiceId) {
  return useQuery({
    queryKey: INVOICE_HISTORY_KEY(invoiceId),
    queryFn: () => invoiceService.getInvoiceHistory(invoiceId),
    enabled: Boolean(invoiceId),
    retry: false,
  });
}
