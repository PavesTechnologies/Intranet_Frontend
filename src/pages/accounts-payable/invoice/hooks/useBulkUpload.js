import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bulkUploadService, emailIntakeService } from "../services/bulkUploadService";
import { invalidateInvoices } from "./useInvoiceMutations";

export const BULK_BATCHES_KEY = ["accountsPayable", "bulkUpload", "batches"];
export const BULK_BATCH_KEY = (batchId) => ["accountsPayable", "bulkUpload", "batch", String(batchId)];

const POLL_MS = 3000;

/** True while the backend still has files of this batch queued / processing. */
export function isBatchRunning(batch) {
  return Boolean(batch && (batch.status === "QUEUED" || batch.status === "PROCESSING" || batch.counts?.queued > 0));
}

export function useBulkUploadLimits() {
  return useQuery({
    queryKey: ["accountsPayable", "bulkUpload", "limits"],
    queryFn: () => bulkUploadService.getLimits(),
    staleTime: Infinity,
  });
}

export function useBulkBatches({ mine = true, sourceType, page = 1, pageSize = 10 } = {}) {
  return useQuery({
    queryKey: [...BULK_BATCHES_KEY, { mine, sourceType, page, pageSize }],
    queryFn: () => bulkUploadService.listBatches({ mine, sourceType, page, pageSize }),
    // Keep the history's progress counts moving while any listed batch is still running.
    refetchInterval: (query) => (query.state.data?.items?.some(isBatchRunning) ? POLL_MS : false),
  });
}

/** Polls every few seconds until every file has a final result. */
export function useBulkBatch(batchId) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: BULK_BATCH_KEY(batchId),
    queryFn: async () => {
      const previous = queryClient.getQueryData(BULK_BATCH_KEY(batchId));
      const batch = await bulkUploadService.getBatch(batchId);
      // Newly created invoices should show up in Invoice Management / the review queue at once.
      if (previous && (batch.counts?.created ?? 0) > (previous.counts?.created ?? 0)) {
        invalidateInvoices(queryClient);
      }
      return batch;
    },
    enabled: Boolean(batchId),
    refetchInterval: (query) => (isBatchRunning(query.state.data) ? POLL_MS : false),
  });
}

export const EMAIL_INTAKE_KEY = ["accountsPayable", "emailIntake", "status"];

export function useEmailIntakeStatus() {
  return useQuery({ queryKey: EMAIL_INTAKE_KEY, queryFn: () => emailIntakeService.getStatus(), refetchInterval: 60000 });
}

export function useSetEmailIntakeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled) => emailIntakeService.setEnabled(enabled),
    onSuccess: (status) => queryClient.setQueryData(EMAIL_INTAKE_KEY, status),
  });
}

function useBatchMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (batch) => {
      queryClient.setQueryData(BULK_BATCH_KEY(batch.batch_id), batch);
      queryClient.invalidateQueries({ queryKey: BULK_BATCHES_KEY });
    },
  });
}

export function useUploadBatchMutation() {
  return useBatchMutation(({ files, onProgress }) => bulkUploadService.uploadBatch(files, onProgress));
}

export function useRetryBatchMutation() {
  return useBatchMutation((batchId) => bulkUploadService.retryBatch(batchId));
}

export function useRetryItemMutation() {
  return useBatchMutation((itemId) => bulkUploadService.retryItem(itemId));
}

export function useSkipItemMutation() {
  return useBatchMutation((itemId) => bulkUploadService.skipItem(itemId));
}
