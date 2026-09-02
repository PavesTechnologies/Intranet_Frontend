import { useQuery } from "@tanstack/react-query";
import procurementService from "../services/procurementService";

export const PR_QUOTATIONS_KEY = (prId) => ["accountsPayable", "procurement", "quotations", prId];
export const QUOTATION_DETAIL_KEY = (quotationId) => [
  "accountsPayable",
  "procurement",
  "quotation",
  quotationId,
];

export const useQuotationsForPr = (prId) =>
  useQuery({
    queryKey: PR_QUOTATIONS_KEY(prId),
    queryFn: () => procurementService.getQuotationsForPr(prId),
    enabled: !!prId,
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

export const useQuotationDetail = (quotationId) =>
  useQuery({
    queryKey: QUOTATION_DETAIL_KEY(quotationId),
    queryFn: () => procurementService.getQuotationById(quotationId),
    enabled: !!quotationId,
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

export default useQuotationsForPr;
