import { useQuery } from "@tanstack/react-query";
import { invoiceService } from "../services/invoiceService";

// Normalized to a number — see useInvoiceDetail.js's INVOICE_DETAIL_KEY for why this matters:
// a string/number id mismatch between where a query is fetched and where it's invalidated
// silently breaks invalidateQueries.
export const INVOICE_HISTORY_KEY = (invoiceId) => ["accountsPayable", "invoiceHistory", Number(invoiceId)];

/** @param {string|number} invoiceId */
export function useInvoiceHistory(invoiceId) {
  return useQuery({
    queryKey: INVOICE_HISTORY_KEY(invoiceId),
    queryFn: () => invoiceService.getInvoiceHistory(invoiceId),
    enabled: Boolean(invoiceId),
    retry: false,
  });
}
