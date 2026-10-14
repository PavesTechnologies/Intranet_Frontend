import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import workAssignmentService from "../services/workAssignmentService";

export const WORK_ASSIGNMENT_KEY = ["accountsPayable", "workAssignment"];

export const useApTeam = () => useQuery({ queryKey: [...WORK_ASSIGNMENT_KEY, "team"], queryFn: () => workAssignmentService.team(), staleTime: 5 * 60_000 });
export const useWorkload = () => useQuery({ queryKey: [...WORK_ASSIGNMENT_KEY, "workload"], queryFn: () => workAssignmentService.workload(), staleTime: 30_000 });

/** Ownership changes move work between queues: refresh assignment, workbench, dashboards. */
function useAssignmentMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of [WORK_ASSIGNMENT_KEY, ["accountsPayable", "reviewWorkbench"], ["accountsPayable", "actionCenter"],
        ["accountsPayable", "roleDashboard"]]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export const useClaimInvoices = () => useAssignmentMutation((invoiceIds) => workAssignmentService.claim(invoiceIds));
export const useSetRule = () => useAssignmentMutation(({ scope, targetId, assigneeUserId }) => workAssignmentService.setRule(scope, targetId, assigneeUserId));
export const useRemoveRule = () => useAssignmentMutation((ruleId) => workAssignmentService.removeRule(ruleId));
export const useReassign = () => useAssignmentMutation(({ invoiceIds, toUserId, note }) => workAssignmentService.reassign(invoiceIds, toUserId, note));
export const useReassignAll = () => useAssignmentMutation(({ fromUserId, toUserId, note }) => workAssignmentService.reassignAll(fromUserId, toUserId, note));
