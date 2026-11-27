import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bulkImportService } from "../services/bulkImportService";

const KEY = ["accountsPayable", "bulkImport"];
const POLL_MS = 3000;
const RUNNING = new Set(["VALIDATING", "RECORDING"]);

export const isJobRunning = (job) => Boolean(job && RUNNING.has(job.status));

export function useImportJobs(type, page) {
  return useQuery({
    queryKey: [...KEY, "jobs", type, page],
    queryFn: () => bulkImportService.listJobs(type, page),
    enabled: Boolean(type),
    refetchInterval: (query) => (query.state.data?.items?.some(isJobRunning) ? POLL_MS : false),
  });
}

export function useImportJob(jobId) {
  return useQuery({
    queryKey: [...KEY, "job", String(jobId)],
    queryFn: () => bulkImportService.getJob(jobId),
    enabled: Boolean(jobId),
    refetchInterval: (query) => (isJobRunning(query.state.data) ? POLL_MS : false),
  });
}

function useJobMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (job) => {
      if (job?.job_id) queryClient.setQueryData([...KEY, "job", String(job.job_id)], job);
      queryClient.invalidateQueries({ queryKey: [...KEY, "jobs"] });
      // recorded rows change payments / TDS screens
      queryClient.invalidateQueries({ queryKey: ["accountsPayable", "payments"] });
      queryClient.invalidateQueries({ queryKey: ["accountsPayable", "tdsTracking"] });
      queryClient.invalidateQueries({ queryKey: ["accountsPayable", "tdsChallans"] });
    },
  });
}

export const useUploadImport = () =>
  useJobMutation(({ type, workbook, documents, onProgress, receiptsOnly }) =>
    receiptsOnly
      ? bulkImportService.uploadReceipts(documents, onProgress)
      : bulkImportService.upload(type, workbook, documents, onProgress));
export const useRecordImport = () => useJobMutation(({ jobId, rowIds, acceptReview }) => bulkImportService.record(jobId, { rowIds, acceptReview }));
export const useSkipImportRow = () => useJobMutation((rowId) => bulkImportService.skipRow(rowId));
