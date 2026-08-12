import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approvalDelegationApi } from "../api/approvalDelegationApi";

export const APPROVAL_DELEGATIONS_KEY = ["approvalDelegations"];

const unwrap = (res) => res.data?.data;

export const useApprovalDelegations = () =>
  useQuery({
    queryKey: APPROVAL_DELEGATIONS_KEY,
    queryFn: () => approvalDelegationApi.getAll().then(unwrap),
    staleTime: 30_000,
  });

export const useSaveApprovalDelegation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      (id ? approvalDelegationApi.update(id, payload) : approvalDelegationApi.create(payload)).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPROVAL_DELEGATIONS_KEY }),
  });
};

export const useDeleteApprovalDelegation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => approvalDelegationApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPROVAL_DELEGATIONS_KEY }),
  });
};
