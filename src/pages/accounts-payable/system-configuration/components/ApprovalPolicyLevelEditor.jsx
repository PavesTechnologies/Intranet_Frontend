import { ArrowUp, ArrowDown, Trash2, Info } from "lucide-react";
import FormSelect from "../../../../components/forms/FormSelect";
import { useEmployeeDirectory, resolveEmployeeName } from "../../../expense-management/approval-engine/hooks/useEmployeeDirectory";

const APPROVER_TYPE_OPTIONS = [
  { value: "DEPARTMENT_APPROVER", label: "Department Approver" },
  { value: "ROLE", label: "Role" },
  { value: "USER", label: "User" },
];

const APPROVAL_RULE_OPTIONS = [
  { value: "ANY_ONE", label: "Any One" },
  { value: "ALL", label: "All" },
];

/**
 * One row of the policy builder's Approval Levels list. Only shows the fields relevant to the
 * selected approver_type (Backend/Business_Layer/services/approval_policy_service.py:
 * ROLE requires role_code, USER requires user_uuid, DEPARTMENT_APPROVER uses neither — the
 * department is implicit from the policy's own department_id, managed separately under the
 * Department Approvers tab).
 *
 * @param {Object} props
 * @param {Object} props.level - {level_number, approver_type, approval_rule, role_code, user_uuid}
 * @param {number} props.index
 * @param {number} props.total
 * @param {(field: string, value: any) => void} props.onChange
 * @param {() => void} props.onRemove
 * @param {() => void} props.onMoveUp
 * @param {() => void} props.onMoveDown
 * @param {Array<{value:string,label:string}>} props.roleOptions
 * @param {Array<Object>} props.approvers - ApproverLookupDTO[]
 * @param {boolean} props.disableRemove
 * @param {string|null} [props.departmentName]
 */
export default function ApprovalPolicyLevelEditor({
  level,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  roleOptions,
  approvers,
  disableRemove,
  departmentName,
}) {
  const { data: directory } = useEmployeeDirectory();

  const userOptions = (approvers || []).map((a) => {
    const id = a.employee_uuid || a.user_uuid;
    const resolved = resolveEmployeeName(directory, id);
    const label = resolved === id ? `User ${String(id).slice(0, 8)}` : resolved;
    return { value: a.user_uuid, label: a.is_user_active ? label : `${label} (inactive)` };
  });

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">Level {level.level_number}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Move level up"
            title="Move up"
          >
            <ArrowUp size={16} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Move level down"
            title="Move down"
          >
            <ArrowDown size={16} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={disableRemove}
            className="rounded p-1 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Remove level"
            title={disableRemove ? "A policy needs at least one level" : "Remove level"}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormSelect
          label="Approver Type"
          name="approver_type"
          value={level.approver_type}
          onChange={(e) => onChange("approver_type", e.target.value)}
          options={APPROVER_TYPE_OPTIONS}
        />
        <FormSelect
          label="Approval Rule"
          name="approval_rule"
          value={level.approval_rule}
          onChange={(e) => onChange("approval_rule", e.target.value)}
          options={APPROVAL_RULE_OPTIONS}
        />
      </div>

      {level.approver_type === "ROLE" && (
        <div className="mt-4">
          <FormSelect
            label="Role"
            name="role_code"
            value={level.role_code || ""}
            onChange={(e) => onChange("role_code", e.target.value)}
            options={[{ value: "", label: "Select role" }, ...roleOptions]}
            placeholder="Select role"
          />
        </div>
      )}

      {level.approver_type === "USER" && (
        <div className="mt-4">
          <FormSelect
            label="User"
            name="user_uuid"
            value={level.user_uuid || ""}
            onChange={(e) => onChange("user_uuid", e.target.value)}
            options={[{ value: "", label: "Select user" }, ...userOptions]}
            placeholder="Select user"
          />
        </div>
      )}

      {level.approver_type === "DEPARTMENT_APPROVER" && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            Resolves to whoever is configured as an approver for{" "}
            <strong>{departmentName || "this policy's department"}</strong> — manage that list under
            the "Department Approvers" tab.
          </span>
        </div>
      )}
    </div>
  );
}
