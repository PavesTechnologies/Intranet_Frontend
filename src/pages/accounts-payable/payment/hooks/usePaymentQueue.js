import { useQuery } from "@tanstack/react-query";
import paymentService from "../services/paymentService";

export const PAYMENT_QUEUE_KEY = ["accountsPayable", "payments", "queue"];

export const usePaymentQueue = () =>
  useQuery({
    queryKey: PAYMENT_QUEUE_KEY,
    queryFn: paymentService.getApprovedInvoicesForPayment,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

export default usePaymentQueue;
