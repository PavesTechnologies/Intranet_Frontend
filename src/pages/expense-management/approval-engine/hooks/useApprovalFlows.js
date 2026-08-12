import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approvalFlowApi } from "../api/approvalFlowApi";

export const APPROVAL_FLOWS_KEY = ["approvalFlows"];
export const APPROVAL_FLOW_KEY = (flowId) => ["approvalFlow", flowId];
export const CATCH_ALL_FLOW_KEY = ["approvalFlowCatchAll"];

const unwrap = (res) => res.data?.data;

export const useApprovalFlows = () =>
  useQuery({
    queryKey: APPROVAL_FLOWS_KEY,
    queryFn: () => approvalFlowApi.getAll().then(unwrap),
    staleTime: 30_000,
  });

export const useApprovalFlow = (flowId) =>
  useQuery({
    queryKey: APPROVAL_FLOW_KEY(flowId),
    queryFn: () => approvalFlowApi.getById(flowId).then(unwrap),
    enabled: !!flowId,
  });

export const useCatchAllFlow = () =>
  useQuery({
    queryKey: CATCH_ALL_FLOW_KEY,
    queryFn: () => approvalFlowApi.getCatchAll().then(unwrap),
    staleTime: 30_000,
  });

export const useSaveApprovalFlow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ flowId, payload }) =>
      (flowId ? approvalFlowApi.update(flowId, payload) : approvalFlowApi.create(payload)).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPROVAL_FLOWS_KEY }),
  });
};

export const useDeleteApprovalFlow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (flowId) => approvalFlowApi.delete(flowId),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPROVAL_FLOWS_KEY }),
  });
};

export const useSaveCatchAllFlow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => approvalFlowApi.updateCatchAll(payload).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATCH_ALL_FLOW_KEY }),
  });
};
