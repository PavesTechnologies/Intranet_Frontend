import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import invoiceService from "../services/invoiceService";

export const INVOICE_LIST_KEY = (filters = {}) => ["accountsPayable", "invoices", "list", filters];
export const INVOICE_INBOX_KEY = ["accountsPayable", "invoices", "inbox"];

export const useInvoices = (filters = {}) =>
  useQuery({
    queryKey: INVOICE_LIST_KEY(filters),
    queryFn: () => invoiceService.getInvoices(filters),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

export const useInboxInvoices = () =>
  useQuery({
    queryKey: INVOICE_INBOX_KEY,
    queryFn: invoiceService.getInboxInvoices,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

export const useCreateInvoice = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload) => invoiceService.createInvoice(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accountsPayable", "invoices"] });
    },
  });
};

export default useInvoices;
