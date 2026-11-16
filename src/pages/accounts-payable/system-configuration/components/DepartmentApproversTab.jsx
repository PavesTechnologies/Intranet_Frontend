import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Trash2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import FormSelect from "../../../../components/forms/FormSelect";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import StatusBadge from "../../../../components/status/statusbadge";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import ApproverLabel from "./ApproverLabel";
import useDepartments from "../hooks/useDepartments";
import { useApprovers } from "../hooks/useApprovalMetadata";
import { useDepartmentApprovers, useAddDepartmentApprover, useRemoveDepartmentApprover } from "../hooks/useDepartmentApprovers";
import { useEmployeeDirectory, resolveEmployeeName } from "../../../expense-management/approval-engine/hooks/useEmployeeDirectory";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatDate } from "../../utils/formatters";

/**
 * Manages who resolves for the DEPARTMENT_APPROVER approver type in a policy level — a plain
 * department -> approver-user list, backed by GET/POST/DELETE .../approval/department-approvers
 * (Backend/API_Layer/interface/approval_policy_interface.py: DepartmentApproverDTO has no
 * name/email, only user_uuid — resolved the same way as everywhere else via ApproverLabel).
 */
export default function DepartmentApproversTab() {
  const { data: departmentData } = useDepartments();
  const departments = departmentData || [];
  const [departmentId, setDepartmentId] = useState("");

  const { data: approversData, isLoading, isError, error } = useDepartmentApprovers(departmentId || null);
  const approvers = approversData || [];

  const { data: allApproverLookups } = useApprovers();
  const { data: directory } = useEmployeeDirectory();

  const addApprover = useAddDepartmentApprover();
  const removeApprover = useRemoveDepartmentApprover(departmentId || null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUserUuid, setSelectedUserUuid] = useState("");
  const [removeTarget, setRemoveTarget] = useState(null);

  const departmentOptions = departments.map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` }));

  const existingUserUuids = useMemo(() => new Set(approvers.map((a) => a.user_uuid)), [approvers]);

  const availableApprovers = useMemo(
    () => (allApproverLookups || []).filter((a) => !existingUserUuids.has(a.user_uuid)),
    [allApproverLookups, existingUserUuids],
  );

  const availableApproverOptions = availableApprovers.map((a) => {
    const id = a.employee_uuid || a.user_uuid;
    const resolved = resolveEmployeeName(directory, id);
    const label = resolved === id ? `User ${String(id).slice(0, 8)}` : resolved;
    return { value: a.user_uuid, label: a.is_user_active ? label : `${label} (inactive)` };
  });

  const openAdd = () => {
    setSelectedUserUuid("");
    setIsAddOpen(true);
  };

  const handleAdd = async () => {
    if (!selectedUserUuid || !departmentId) return;
    try {
      await addApprover.mutateAsync({ departmentId: Number(departmentId), userUuid: selectedUserUuid });
      toast.success("Approver added.");
      setIsAddOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to add department approver."));
    }
  };

  const handleRemoveConfirm = async () => {
    if (!removeTarget) return;
    try {
      await removeApprover.mutateAsync(removeTarget.id);
      toast.success("Approver removed.");
      setRemoveTarget(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to remove department approver."));
    }
  };

  const selectedDepartment = departments.find((d) => d.id === Number(departmentId));

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <FormSelect
          label="Department"
          name="departmentId"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          options={[{ value: "", label: "Select a department" }, ...departmentOptions]}
          placeholder="Select a department"
        />
      </div>

      {!departmentId ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          Select a department to manage its approvers.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              Approvers for {selectedDepartment?.name || "this department"}
            </h3>
            <Button variant="primary" size="small" onClick={openAdd}>
              <Plus size={14} /> Add Approver
            </Button>
          </div>

          {isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {getApiErrorMessage(error, "Failed to load department approvers.")}
            </div>
          ) : isLoading ? (
            <LoadingSpinner text="Loading approvers..." />
          ) : approvers.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
              No approvers configured for this department yet. Any DEPARTMENT_APPROVER policy level for it will
              have no eligible approver until one is added here.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <ul className="divide-y divide-gray-100">
                {approvers.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ApproverLabel userUuid={a.user_uuid} />
                      <StatusBadge label={a.is_active ? "Active" : "Inactive"} size="sm" />
                      <span className="text-xs text-gray-400">Added {formatDate(a.created_at)}</span>
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      size="icon"
                      title="Remove Approver"
                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
                      onClick={() => setRemoveTarget(a)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Department Approver"
        subtitle={`Add a user eligible to approve as the ${selectedDepartment?.name || "selected department"}'s approver.`}
        size="sm"
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="w-full sm:w-auto" disabled={addApprover.isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="w-full sm:w-auto"
              onClick={handleAdd}
              disabled={!selectedUserUuid}
              loading={addApprover.isPending}
              loadingText="Adding..."
            >
              Add Approver
            </Button>
          </div>
        }
      >
        <div className="py-2">
          {availableApproverOptions.length === 0 ? (
            <p className="text-sm text-gray-500">No eligible users available to add.</p>
          ) : (
            <FormSelect
              label="User"
              name="userUuid"
              value={selectedUserUuid}
              onChange={(e) => setSelectedUserUuid(e.target.value)}
              options={[{ value: "", label: "Select user" }, ...availableApproverOptions]}
              placeholder="Select user"
            />
          )}
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={!!removeTarget}
        title="Remove Approver"
        message="Are you sure you want to remove this approver from the department? Any policy level relying on this department's approvers will no longer resolve to them."
        confirmText="Remove"
        cancelText="Cancel"
        isLoading={removeApprover.isPending}
        onConfirm={handleRemoveConfirm}
        onCancel={() => setRemoveTarget(null)}
        variant="danger"
      />
    </div>
  );
}
