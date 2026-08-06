import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import approvalService from "../services/approvalService";

export const APPROVALS_PENDING_KEY = ["accountsPayable", "approvals", "pending"];
export const APPROVALS_HISTORY_KEY = ["accountsPayable", "approvals", "history"];

/**
 * Pending approval queue + the decide (approve/reject/return) mutation.
 * Invalidates both the pending queue and the history list on success so
 * a decided invoice moves between workspaces immediately.
 */
export const useApprovals = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: APPROVALS_PENDING_KEY,
    queryFn: approvalService.getPendingApprovals,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

  const decideMutation = useMutation({
    mutationFn: ({ invoiceId, decision, comment }) => approvalService.decideInvoice(invoiceId, decision, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: APPROVALS_PENDING_KEY });
      qc.invalidateQueries({ queryKey: APPROVALS_HISTORY_KEY });
    },
  });

  return {
    ...query,
    decideInvoice: decideMutation.mutateAsync,
    isDeciding: decideMutation.isPending,
  };
};

/**
 * Decided invoices (approved / rejected) for the history page.
 */
export const useApprovalHistory = () =>
  useQuery({
    queryKey: APPROVALS_HISTORY_KEY,
    queryFn: approvalService.getApprovalHistory,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

export default useApprovals;
