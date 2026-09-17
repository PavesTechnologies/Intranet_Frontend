import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import approvalPolicyService from "../services/approvalPolicyService";

export const DEPARTMENT_APPROVERS_KEY = (departmentId) => ["accountsPayable", "departmentApprovers", departmentId];

/** @param {number|null} departmentId - the DAO requires a department_id; pass null/undefined
 *   to leave the query disabled until one is selected. */
export function useDepartmentApprovers(departmentId) {
  return useQuery({
    queryKey: DEPARTMENT_APPROVERS_KEY(departmentId),
    queryFn: () => approvalPolicyService.getDepartmentApprovers(departmentId),
    enabled: Boolean(departmentId),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useAddDepartmentApprover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => approvalPolicyService.addDepartmentApprover(data),
    onSuccess: (_, { departmentId }) =>
      qc.invalidateQueries({ queryKey: DEPARTMENT_APPROVERS_KEY(departmentId) }),
  });
}

export function useRemoveDepartmentApprover(departmentId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mappingId) => approvalPolicyService.removeDepartmentApprover(mappingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: DEPARTMENT_APPROVERS_KEY(departmentId) }),
  });
}
