import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeVerificationApi } from "../api/financeVerificationApi";

// ── Query keys ──────────────────────────────────────────────────────────────
export const FINANCE_QUEUE_KEY = (page, size) => ["financeQueue", page, size];
export const FINANCE_STATUS_KEY = (reportId) => ["financeStatus", reportId];
export const FINANCE_REVIEWS_KEY = (reportId) => ["financeReviews", reportId];
export const FINANCE_HISTORY_KEY = (status, page, size) => ["financeHistory", status, page, size];

const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

// ── Queries ─────────────────────────────────────────────────────────────────

/** PageResponse<FinanceQueueItemResponse> */
export const useFinanceQueue = (page = 0, size = 20) =>
  useQuery({
    queryKey: FINANCE_QUEUE_KEY(page, size),
    queryFn: () => financeVerificationApi.getMyQueue(page, size).then(unwrap),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

/** ApprovalStatusResponse */
export const useFinanceStatus = (reportId) =>
  useQuery({
    queryKey: FINANCE_STATUS_KEY(reportId),
    queryFn: () => financeVerificationApi.getStatus(reportId).then(unwrap),
    enabled: !!reportId,
    staleTime: 15_000,
  });

/** FinanceLineItemReviewResponse[] */
export const useFinanceReviews = (reportId) =>
  useQuery({
    queryKey: FINANCE_REVIEWS_KEY(reportId),
    queryFn: () => financeVerificationApi.getReviews(reportId).then(unwrap),
    enabled: !!reportId,
    staleTime: 15_000,
  });

/** PageResponse<FinanceHistoryItemResponse> - status is "VERIFIED" or "QUERIED" */
export const useFinanceHistory = (status, page = 0, size = 20) =>
  useQuery({
    queryKey: FINANCE_HISTORY_KEY(status, page, size),
    queryFn: () => financeVerificationApi.getHistory(status, page, size).then(unwrap),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

/** FinancePaymentSummaryResponse - verified reports still with AP vs. already paid. */
export const useFinancePaymentSummary = () =>
  useQuery({
    queryKey: ["financePaymentSummary"],
    queryFn: () => financeVerificationApi.getPaymentSummary().then(unwrap),
    staleTime: 30_000,
  });

// ── Mutations ───────────────────────────────────────────────────────────────

const invalidateFinanceCaches = (qc, reportId) => {
  qc.invalidateQueries({ queryKey: ["financeQueue"] });
  qc.invalidateQueries({ queryKey: ["financeHistory"] });
  qc.invalidateQueries({ queryKey: ["financePaymentSummary"] });
  if (reportId) {
    qc.invalidateQueries({ queryKey: FINANCE_STATUS_KEY(reportId) });
    qc.invalidateQueries({ queryKey: FINANCE_REVIEWS_KEY(reportId) });
  }
};

export const useVerifyLineItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, lineItemId, taxChecked }) =>
      financeVerificationApi.verifyLineItem(reportId, lineItemId, taxChecked).then(unwrap),
    // Refresh on failure too - a rejected verify (e.g. eligibility changed since this queue was
    // last fetched) means the row shown was already stale, so re-fetch clears it immediately.
    onSettled: (_data, _err, { reportId }) => invalidateFinanceCaches(qc, reportId),
  });
};

export const useAdjustLineTax = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, lineItemId, payload }) =>
      financeVerificationApi.adjustLineTax(reportId, lineItemId, payload).then(unwrap),
    onSettled: (_data, _err, { reportId }) => {
      invalidateFinanceCaches(qc, reportId);
      // The panel reads line tax from the full line-item list.
      qc.invalidateQueries({ queryKey: ["expenseReviewLineItems", reportId] });
    },
  });
};

export const useQueryLineItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, lineItemId, reason }) =>
      financeVerificationApi.queryLineItem(reportId, lineItemId, reason).then(unwrap),
    onSettled: (_data, _err, { reportId }) => invalidateFinanceCaches(qc, reportId),
  });
};
