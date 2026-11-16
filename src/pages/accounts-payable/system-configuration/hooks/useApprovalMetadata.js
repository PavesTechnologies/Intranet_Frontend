import { useQuery } from "@tanstack/react-query";
import approvalPolicyService from "../services/approvalPolicyService";

// Master data changes rarely — cache aggressively, mirrors useApLookups.js's MASTER_DATA_OPTIONS.
const MASTER_DATA_OPTIONS = { staleTime: 10 * 60_000, gcTime: 30 * 60_000, retry: 1 };

export const APPROVAL_ROLES_KEY = ["accountsPayable", "approvalRoles"];
export const APPROVERS_KEY = (roleCode) => ["accountsPayable", "approvers", roleCode ?? null];

/** Distinct role codes eligible for a policy level's ROLE approver type. */
export const useApprovalRoles = () =>
  useQuery({
    queryKey: APPROVAL_ROLES_KEY,
    queryFn: approvalPolicyService.getApprovalRoles,
    ...MASTER_DATA_OPTIONS,
  });

/**
 * CDC-synced approver identity records for the USER approver-type selector. No name/email
 * field exists on these — only user_uuid/employee_uuid/department_uuid/department_name — so
 * any UI listing these must render a truncated-uuid label (see ApproverLabel.jsx), not a name.
 * @param {string} [roleCode] - optional server-side filter to approvers holding this role
 */
export const useApprovers = (roleCode) =>
  useQuery({
    queryKey: APPROVERS_KEY(roleCode),
    queryFn: () => approvalPolicyService.getApprovers({ roleCode }),
    ...MASTER_DATA_OPTIONS,
  });
