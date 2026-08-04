import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import paymentService from "../services/paymentService";
import { PAYMENT_QUEUE_KEY } from "./usePaymentQueue";

export const PAYMENT_BATCHES_KEY = ["accountsPayable", "payments", "batches"];
export const PAYMENT_BATCH_KEY = (id) => ["accountsPayable", "payments", "batch", id];

export const usePaymentBatches = () =>
  useQuery({
    queryKey: PAYMENT_BATCHES_KEY,
    queryFn: paymentService.getPaymentBatches,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

export const usePaymentBatch = (id) =>
  useQuery({
    queryKey: PAYMENT_BATCH_KEY(id),
    queryFn: () => paymentService.getPaymentBatchById(id),
    enabled: Boolean(id),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

export const useCreatePaymentBatch = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: paymentService.createPaymentBatch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYMENT_BATCHES_KEY });
      qc.invalidateQueries({ queryKey: PAYMENT_QUEUE_KEY });
    },
  });
};

export default usePaymentBatches;
