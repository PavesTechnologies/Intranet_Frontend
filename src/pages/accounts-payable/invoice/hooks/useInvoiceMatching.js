import { useQuery } from "@tanstack/react-query";
import { matchingService } from "../services/matchingService";

export const INVOICE_MATCHING_KEY = (invoiceId) => ["accountsPayable", "invoiceMatching", invoiceId];

/** @param {string|number} invoiceId */
export function useInvoiceMatching(invoiceId) {
  return useQuery({
    queryKey: INVOICE_MATCHING_KEY(invoiceId),
    queryFn: () => matchingService.getMatching(invoiceId),
    enabled: Boolean(invoiceId),
    retry: false,
  });
}
