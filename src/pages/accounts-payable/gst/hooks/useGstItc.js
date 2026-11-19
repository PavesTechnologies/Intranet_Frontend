import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import gstItcService from "../services/gstItcService";
import gstr2bService from "../services/gstr2bService";

/** Every GST query sits under this key, so one invalidation refreshes summary, lists and details. */
export const GST_ITC_KEY = ["accountsPayable", "gstItc"];
export const GSTR2B_KEY = [...GST_ITC_KEY, "gstr2b"];
const ITC_DETAIL_KEY = (invoiceId) => [...GST_ITC_KEY, "detail", Number(invoiceId)];
const FILINGS_KEY = [...GST_ITC_KEY, "filings"];

function useGstMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GST_ITC_KEY });
      queryClient.invalidateQueries({ queryKey: ["accountsPayable", "actionCenter"] });
    },
  });
}

// ---------------------------------------------------------------- consolidated workflow
/**
 * GET /itc/workflow for one return period - the primary summary of the six stages and the backend's next_step.
 * It sits under GST_ITC_KEY, so every GST mutation (upload, rematch, eligibility, approval, filing, verification)
 * refreshes it.
 */
export function useGstWorkflow(returnPeriod) {
  return useQuery({
    queryKey: [...GST_ITC_KEY, "workflow", returnPeriod],
    queryFn: () => gstItcService.workflow(returnPeriod),
    enabled: Boolean(returnPeriod),
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------- ITC register / invoice credit
export function useGstRegister(month) {
  return useQuery({
    queryKey: [...GST_ITC_KEY, "register", month || "current"],
    queryFn: () => gstItcService.register(month),
    staleTime: 30_000,
  });
}

export function useItcDetail(invoiceId) {
  return useQuery({
    queryKey: ITC_DETAIL_KEY(invoiceId),
    queryFn: () => gstItcService.detail(invoiceId),
    enabled: Boolean(invoiceId),
  });
}

/** ITC detail for several invoices at once (approved amounts for a filing's allocations). */
export function useItcDetails(invoiceIds) {
  return useQueries({
    queries: invoiceIds.map((invoiceId) => ({
      queryKey: ITC_DETAIL_KEY(invoiceId),
      queryFn: () => gstItcService.detail(invoiceId),
    })),
  });
}

export function useItcHistory(invoiceId) {
  return useQuery({
    queryKey: [...GST_ITC_KEY, "history", Number(invoiceId)],
    queryFn: () => gstItcService.history(invoiceId),
    enabled: Boolean(invoiceId),
  });
}

export const useSetIrn = () => useGstMutation(({ invoiceId, irn, ackNo }) => gstItcService.setIrn(invoiceId, irn, ackNo));
export const useSetEligibility = () =>
  useGstMutation(({ invoiceId, ...body }) => gstItcService.setEligibility(invoiceId, body));
export const useDecideApproval = () =>
  useGstMutation(({ invoiceId, ...body }) => gstItcService.decideApproval(invoiceId, body));
export const useReverseItc = () =>
  useGstMutation(({ invoiceIds, period, reason }) => gstItcService.reverse(invoiceIds, period, { reason }));
export const useReclaimItc = () => useGstMutation(({ invoiceIds, period }) => gstItcService.reclaim(invoiceIds, period));

// ---------------------------------------------------------------- GSTR-3B filings
export function useGstr3bFilings(financialYear) {
  return useQuery({
    queryKey: [...FILINGS_KEY, financialYear || "all"],
    queryFn: () => gstItcService.filings({ financialYear, pageSize: 200 }),
    staleTime: 30_000,
  });
}

export function useGstr3bFiling(filingId) {
  return useQuery({
    queryKey: [...FILINGS_KEY, "detail", Number(filingId)],
    queryFn: () => gstItcService.filing(filingId),
    enabled: Boolean(filingId),
  });
}

export const useRecordFiling = () => useGstMutation((body) => gstItcService.recordFiling(body));
export const useVerifyFiling = () => useGstMutation((filingId) => gstItcService.verifyFiling(filingId));

// ---------------------------------------------------------------- GSTR-2B reconciliation
export function useGstPeriods() {
  return useQuery({ queryKey: [...GSTR2B_KEY, "periods"], queryFn: () => gstr2bService.periods(), staleTime: 60_000 });
}

export function useGstr2bSummary(returnPeriod, importMode = "OFFICIAL") {
  return useQuery({
    queryKey: [...GSTR2B_KEY, "summary", returnPeriod, importMode],
    queryFn: () => gstr2bService.summary(returnPeriod, importMode),
    enabled: Boolean(returnPeriod),
    staleTime: 30_000,
  });
}

export function useGstr2bMatches({
  returnPeriod, status, matchGroup, search, page = 1, pageSize = 25, importMode = "OFFICIAL", enabled = true,
}) {
  return useQuery({
    queryKey: [...GSTR2B_KEY, "matches", returnPeriod, status || "", matchGroup || "", search || "", page, pageSize, importMode],
    queryFn: () => gstr2bService.matches({ returnPeriod, status, matchGroup, search, page, pageSize, importMode }),
    enabled: Boolean(returnPeriod) && enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useGstr2bMatchDetail(matchId) {
  return useQuery({
    queryKey: [...GSTR2B_KEY, "match", Number(matchId)],
    queryFn: () => gstr2bService.matchDetail(matchId),
    enabled: Boolean(matchId),
  });
}

export function useGstr2bImports({ returnPeriod, financialYear, importMode, enabled = true } = {}) {
  return useQuery({
    queryKey: [...GSTR2B_KEY, "imports", returnPeriod || "", financialYear || "", importMode || ""],
    queryFn: () => gstr2bService.imports({ returnPeriod, financialYear, importMode }),
    enabled,
  });
}

/** Validates an upload without importing it - writes nothing, so nothing is invalidated. */
export const usePreviewGstr2b = () => useMutation({ mutationFn: (body) => gstr2bService.previewImport(body) });
export const useImportGstr2b = () => useGstMutation((body) => gstr2bService.importFile(body));
/**
 * Re-matching is scoped to one return period by the backend, so only that period's queries are refreshed: its
 * reconciliation summary / records, its workflow and its ITC register month ("YYYY-MM" or "YYYY-MM-01" in the key).
 */
export const isPeriodQuery = (queryKey, returnPeriod) =>
  queryKey[0] === GST_ITC_KEY[0] && queryKey[1] === GST_ITC_KEY[1]
  && queryKey.some((k) => typeof k === "string" && k.slice(0, 7) === returnPeriod && /^\d{4}-\d{2}/.test(k));

export function useRematchGstr2b() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (returnPeriod) => gstr2bService.rematch(returnPeriod),
    onSuccess: (_data, returnPeriod) => {
      queryClient.invalidateQueries({ predicate: (q) => isPeriodQuery(q.queryKey, returnPeriod) });
      queryClient.invalidateQueries({ queryKey: [...GST_ITC_KEY, "detail"] });
      queryClient.invalidateQueries({ queryKey: ["accountsPayable", "actionCenter"] });
    },
  });
}
export const useMapGstr2bMatch = () => useGstMutation(({ matchId, ...body }) => gstr2bService.mapMatch(matchId, body));
export const useReviewGstr2bMatch = () => useGstMutation(({ matchId, ...body }) => gstr2bService.reviewMatch(matchId, body));
