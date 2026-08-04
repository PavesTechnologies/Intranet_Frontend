import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import invoiceService from "../services/invoiceService";
import { INVOICE_DETAIL_KEY } from "./useInvoiceDetail";

export const INVOICE_LINE_ITEMS_KEY = (invoiceId) => ["accountsPayable", "invoices", "lineItems", invoiceId];

export const useInvoiceMatching = (invoiceId) => {
  const qc = useQueryClient();

  const lineItemsQuery = useQuery({
    queryKey: INVOICE_LINE_ITEMS_KEY(invoiceId),
    queryFn: () => invoiceService.getInvoiceLineItems(invoiceId),
    enabled: !!invoiceId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

  const markMatched = useMutation({
    mutationFn: () => invoiceService.markInvoiceMatched(invoiceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVOICE_DETAIL_KEY(invoiceId) });
      qc.invalidateQueries({ queryKey: ["accountsPayable", "invoices"] });
    },
  });

  return { ...lineItemsQuery, markMatched };
};

export default useInvoiceMatching;
