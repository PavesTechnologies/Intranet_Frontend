import { useQuery } from "@tanstack/react-query";
import { invoiceService } from "../services/invoiceService";

const POLL_INTERVAL_MS = 1500;
const TERMINAL_STATUSES = ["COMPLETED", "FAILED"];

export const INVOICE_VALIDATION_STATUS_KEY = (jobId) => ["accountsPayable", "invoiceValidationStatus", jobId];

export function isValidationTerminal(status) {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Polls GET /invoice/validate-fields/{jobId}/status (Redis-backed) every ~1500ms until the job
 * reaches a terminal status. A definitive 404 (expired/missing job) is treated as terminal too;
 * any other poll failure is transient, so polling keeps retrying on the same interval rather than
 * failing the whole pipeline on one blip.
 * @param {string|null} jobId
 * @param {{enabled?: boolean}} [options]
 */
export function useInvoiceValidationProgress(jobId, { enabled = true } = {}) {
  return useQuery({
    queryKey: INVOICE_VALIDATION_STATUS_KEY(jobId),
    queryFn: () => invoiceService.getInvoiceValidationStatus(jobId),
    enabled: Boolean(jobId) && enabled,
    retry: false,
    refetchIntervalInBackground: true,
    refetchInterval: (query) => {
      if (isValidationTerminal(query.state.data?.status)) return false;
      if (query.state.error?.status === 404) return false;
      return POLL_INTERVAL_MS;
    },
  });
}
