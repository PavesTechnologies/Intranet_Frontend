import { useEmployeeDirectory, resolveEmployeeName } from "../../../expense-management/approval-engine/hooks/useEmployeeDirectory";

/**
 * Displays an approver/user by name where possible. Approval backend records (ApproverLookupDTO,
 * DepartmentApproverDTO, InvoiceApprovalStepApproverDTO) carry only opaque identity ids
 * (user_uuid/employee_uuid) — no name or email field exists anywhere in that data (CDC-synced
 * identity only). There's no AP-local user directory to resolve them, so this reuses the same
 * Employee Onboarding directory RequesterLabel.jsx already resolves Procurement's analogous
 * UUID-only `created_by` against (employee_uuid and user_uuid are confirmed to be the same
 * underlying identity per the CDC sync design — either can be used as the lookup key).
 * Falls back to a truncated uuid (never the raw full uuid) if the directory can't resolve it,
 * so the UI never looks broken even when a name genuinely isn't available.
 * @param {{ userUuid?: string, employeeUuid?: string, className?: string }} props
 */
export default function ApproverLabel({ userUuid, employeeUuid, className = "" }) {
  const { data: directory } = useEmployeeDirectory();
  const id = employeeUuid || userUuid;

  if (!id) {
    return <span className={`text-sm text-gray-400 ${className}`}>—</span>;
  }

  const resolved = resolveEmployeeName(directory, id);
  // resolveEmployeeName falls back to the raw id itself when unresolved — truncate that case
  // rather than leaking a full uuid into the UI.
  const displayName = resolved === id ? `User ${id.slice(0, 8)}` : resolved;

  return <span className={`text-sm font-medium text-gray-900 ${className}`} title={id}>{displayName}</span>;
}
