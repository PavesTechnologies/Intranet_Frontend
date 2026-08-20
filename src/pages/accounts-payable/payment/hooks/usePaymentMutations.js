import { useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentService } from "../services/paymentService";
import { PAYMENT_DETAIL_KEY } from "./usePaymentDetail";
import { INVOICE_DETAIL_KEY } from "../../invoice/hooks/useInvoiceDetail";
import { INVOICE_SUMMARY_KEY } from "../../invoice/hooks/useInvoiceSummary";

function invalidatePaymentsAndInvoices(queryClient, invoiceIds = []) {
  queryClient.invalidateQueries({ queryKey: ["accountsPayable", "payments"] });
  queryClient.invalidateQueries({ queryKey: ["accountsPayable", "invoices"] });
  queryClient.invalidateQueries({ queryKey: INVOICE_SUMMARY_KEY });
  invoiceIds.forEach((id) => queryClient.invalidateQueries({ queryKey: INVOICE_DETAIL_KEY(id) }));
}

/** @param {Object} payload - PaymentCreateRequest */
export function useCreatePaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => paymentService.createPayment(payload),
    onSuccess: (_, variables) => {
      const invoiceIds = (variables.allocations || []).map((a) => a.invoice_id);
      invalidatePaymentsAndInvoices(queryClient, invoiceIds);
    },
  });
}

/** @param {{paymentId: string|number, payload: {status_code: string, payment_date?: string, reference_number?: string}}} variables */
export function useUpdatePaymentStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, payload }) => paymentService.updatePaymentStatus(paymentId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["accountsPayable", "payments"] });
      queryClient.invalidateQueries({ queryKey: PAYMENT_DETAIL_KEY(variables.paymentId) });
    },
  });
}
