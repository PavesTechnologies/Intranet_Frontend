import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tdsChallanService } from "../services/tdsChallanService";

const KEY = ["accountsPayable", "tdsChallans"];
const TRACKING_KEY = ["accountsPayable", "tdsTracking"];

export const useChallanList = (page) => useQuery({ queryKey: [...KEY, "challans", page], queryFn: () => tdsChallanService.listChallans(page) });
export const useFilingList = (page) => useQuery({ queryKey: [...KEY, "filings", page], queryFn: () => tdsChallanService.listFilings(page) });
export const useChallanDetail = (id) =>
  useQuery({ queryKey: [...KEY, "challan", id], queryFn: () => tdsChallanService.getChallan(id), enabled: Boolean(id) });
export const useFilingDetail = (id) =>
  useQuery({ queryKey: [...KEY, "filing", id], queryFn: () => tdsChallanService.getFiling(id), enabled: Boolean(id) });

export const useChallanCandidates = (filters) =>
  useQuery({ queryKey: [...KEY, "challanCandidates", filters], queryFn: () => tdsChallanService.challanCandidates(filters) });
export const useFilingCandidates = (filters, enabled = true) =>
  useQuery({
    queryKey: [...KEY, "filingCandidates", filters],
    queryFn: () => tdsChallanService.filingCandidates(filters),
    enabled: enabled && Boolean(filters.financialYear && filters.quarter),
  });

export const useExtractChallan = () => useMutation({ mutationFn: (file) => tdsChallanService.extractChallan(file) });
export const useExtractFiling = () => useMutation({ mutationFn: (file) => tdsChallanService.extractFiling(file) });
export const useValidateChallan = () =>
  useMutation({ mutationFn: ({ header, allocations, hasDocument }) => tdsChallanService.validateChallan(header, allocations, hasDocument) });
export const useValidateFiling = () =>
  useMutation({ mutationFn: ({ header, invoiceIds, hasDocument }) => tdsChallanService.validateFiling(header, invoiceIds, hasDocument) });

function useConfirm(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([queryClient.invalidateQueries({ queryKey: KEY }), queryClient.invalidateQueries({ queryKey: TRACKING_KEY })]),
  });
}

export const useCreateChallan = () => useConfirm(({ header, allocations, file }) => tdsChallanService.createChallan(header, allocations, file));
export const useCreateFiling = () => useConfirm(({ header, invoiceIds, file }) => tdsChallanService.createFiling(header, invoiceIds, file));
