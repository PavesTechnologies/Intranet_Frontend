import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import approvalPolicyService from "../services/approvalPolicyService";

export const APPROVAL_POLICIES_KEY = (filters) => ["accountsPayable", "approvalPolicies", filters];
export const APPROVAL_POLICY_DETAIL_KEY = (policyId) => ["accountsPayable", "approvalPolicy", policyId];

const invalidatePolicyLists = (qc) =>
  qc.invalidateQueries({ queryKey: ["accountsPayable", "approvalPolicies"] });

/** @param {{departmentId?: number, purchaseCategoryId?: number, isActive?: boolean}} [filters] */
export function useApprovalPolicies(filters = {}) {
  return useQuery({
    queryKey: APPROVAL_POLICIES_KEY(filters),
    queryFn: () => approvalPolicyService.getPolicies(filters),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** @param {string|number} policyId */
export function useApprovalPolicyDetail(policyId) {
  return useQuery({
    queryKey: APPROVAL_POLICY_DETAIL_KEY(policyId),
    queryFn: () => approvalPolicyService.getPolicy(policyId),
    enabled: Boolean(policyId),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useCreateApprovalPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => approvalPolicyService.createPolicy(payload),
    onSuccess: () => invalidatePolicyLists(qc),
  });
}

export function useUpdateApprovalPolicy(policyId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => approvalPolicyService.updatePolicy(policyId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: APPROVAL_POLICY_DETAIL_KEY(policyId) });
      invalidatePolicyLists(qc);
    },
  });
}

export function useSetApprovalPolicyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ policyId, isActive }) => approvalPolicyService.setPolicyStatus(policyId, isActive),
    onSuccess: (_, { policyId }) => {
      qc.invalidateQueries({ queryKey: APPROVAL_POLICY_DETAIL_KEY(policyId) });
      invalidatePolicyLists(qc);
    },
  });
}

export function useDeleteApprovalPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (policyId) => approvalPolicyService.deletePolicy(policyId),
    onSuccess: () => invalidatePolicyLists(qc),
  });
}
