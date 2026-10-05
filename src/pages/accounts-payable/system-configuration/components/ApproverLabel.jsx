import { useEmployeeDirectory, resolveEmployeeName } from "../../../expense-management/approval-engine/hooks/useEmployeeDirectory";

/**
 * Displays an approver/user by name where possible. Approval backend records (ApproverLookupDTO,
 * DepartmentApproverDTO, InvoiceApprovalStepApproverDTO) carry only opaque identity ids
 * (user_uuid/employee_uuid) — no name or email field exists anywhere in that data (CDC-synced
 * identity only). There's no AP-local user directory to resolve them, so this reuses the same
 * Employee Onboarding directory RequesterLabel.jsx resolves Procurement's numeric `created_by`
 * against — useEmployeeDirectory now indexes that directory by BOTH the numeric employee_id and
 * the employee_uuid every record also carries, so a uuid lookup resolves too (it previously
 * didn't: this component always fell back to a truncated uuid until that indexing was added).
 * Falls back to a truncated uuid (never the raw full uuid) if the directory genuinely can't
 * resolve it, so the UI never looks broken even when a name isn't available.
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
