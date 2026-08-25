import { useQuery } from "@tanstack/react-query";
import { paymentService } from "../services/paymentService";

export const PAYMENT_DETAIL_KEY = (paymentId) => ["accountsPayable", "payment", paymentId];

/** @param {string|number} paymentId */
export function usePaymentDetail(paymentId) {
  return useQuery({
    queryKey: PAYMENT_DETAIL_KEY(paymentId),
    queryFn: () => paymentService.getPaymentById(paymentId),
    enabled: Boolean(paymentId),
    retry: false,
  });
}
