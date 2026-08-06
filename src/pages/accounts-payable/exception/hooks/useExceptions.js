import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import exceptionService from "../services/exceptionService";

export const EXCEPTION_LIST_KEY = (filters = {}) => ["accountsPayable", "exceptions", "list", filters];

export const useExceptions = (filters = {}) =>
  useQuery({
    queryKey: EXCEPTION_LIST_KEY(filters),
    queryFn: () => exceptionService.getExceptions(filters),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

export const useResolveException = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, resolutionAction, notes }) =>
      exceptionService.resolveException(invoiceId, resolutionAction, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accountsPayable", "exceptions"] });
    },
  });
};

export default useExceptions;
