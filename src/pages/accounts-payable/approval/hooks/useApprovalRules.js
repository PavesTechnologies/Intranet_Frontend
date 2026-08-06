import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import approvalService from "../services/approvalService";

export const APPROVAL_RULES_KEY = ["accountsPayable", "approvals", "rules"];

/**
 * Approval routing rules (tiers) + update mutation for admins.
 */
export const useApprovalRules = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: APPROVAL_RULES_KEY,
    queryFn: approvalService.getApprovalRules,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => approvalService.updateApprovalRule(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: APPROVAL_RULES_KEY });
    },
  });

  return {
    ...query,
    updateRule: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};

export default useApprovalRules;
