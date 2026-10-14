import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import gstItcService from "../services/gstItcService";
import gstr2bService from "../services/gstr2bService";

export const GST_ITC_KEY = ["accountsPayable", "gstItc"];

export function useGstRegister(month) {
  return useQuery({ queryKey: [...GST_ITC_KEY, month || "current"], queryFn: () => gstItcService.register(month), staleTime: 30_000 });
}

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

export const useClaimItc = () => useGstMutation((period) => gstItcService.claim(period));
export const useSetIrn = () => useGstMutation(({ invoiceId, irn, ackNo }) => gstItcService.setIrn(invoiceId, irn, ackNo));
export const useSetEligibility = () =>
  useGstMutation(({ invoiceId, eligibility, reason }) => gstItcService.setEligibility(invoiceId, eligibility, reason));
export const useReverseItc = () => useGstMutation(({ invoiceIds, period }) => gstItcService.reverse(invoiceIds, period));
export const useReclaimItc = () => useGstMutation(({ invoiceIds, period }) => gstItcService.reclaim(invoiceIds, period));

export const GSTR2B_KEY = [...GST_ITC_KEY, "gstr2b"];

export function useGstr2b(period) {
  return useQuery({ queryKey: [...GSTR2B_KEY, period || "latest"], queryFn: () => gstr2bService.reconciliation(period), staleTime: 30_000 });
}

export const useImportGstr2b = () => useGstMutation(({ file, period }) => gstr2bService.importFile(file, period));
