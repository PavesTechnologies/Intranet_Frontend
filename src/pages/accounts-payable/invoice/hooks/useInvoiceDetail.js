import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import invoiceService from "../services/invoiceService";

export const INVOICE_DETAIL_KEY = (invoiceId) => ["accountsPayable", "invoices", "detail", invoiceId];

export const useInvoiceDetail = (invoiceId) =>
  useQuery({
    queryKey: INVOICE_DETAIL_KEY(invoiceId),
    queryFn: () => invoiceService.getInvoiceById(invoiceId),
    enabled: !!invoiceId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

export const useSubmitForValidation = (invoiceId) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => invoiceService.submitInvoiceForValidation(invoiceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVOICE_DETAIL_KEY(invoiceId) });
      qc.invalidateQueries({ queryKey: ["accountsPayable", "invoices"] });
    },
  });
};

export default useInvoiceDetail;
