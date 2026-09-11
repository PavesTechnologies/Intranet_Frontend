import { useQuery } from "@tanstack/react-query";
import procurementService from "../services/procurementService";

export const PENDING_APPROVALS_KEY = (departmentId) => [
  "accountsPayable",
  "procurement",
  "pendingApprovals",
  departmentId ?? null,
];

export const usePendingApprovals = (departmentId) =>
  useQuery({
    queryKey: PENDING_APPROVALS_KEY(departmentId),
    queryFn: () => procurementService.getPendingApprovalPurchaseRequisitions(departmentId),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

export default usePendingApprovals;
