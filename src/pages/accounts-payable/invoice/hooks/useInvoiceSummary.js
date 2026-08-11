import { useQuery } from "@tanstack/react-query";
import { invoiceService } from "../services/invoiceService";

export const INVOICE_SUMMARY_KEY = ["accountsPayable", "invoiceSummary"];

/** KPI summary for the Invoice Management header cards — see invoiceService.getInvoiceSummary. */
export function useInvoiceSummary() {
  return useQuery({
    queryKey: INVOICE_SUMMARY_KEY,
    queryFn: () => invoiceService.getInvoiceSummary(),
  });
}
