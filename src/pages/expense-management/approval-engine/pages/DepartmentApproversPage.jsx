import React, { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import Modal from "@/components/Modal/modal";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import FormInput from "@/components/forms/FormInput";
import { showStatusToast } from "@/components/toastfy/toast";
import {
  useDepartmentApprovers,
  useSaveDepartmentApprover,
  useDeleteDepartmentApprover,
} from "../hooks/useDepartmentApprovers";

const emptyForm = { departmentApproverId: null, departmentUuid: "", approverEmployeeId: "", status: "ACTIVE" };

/**
 * Admin config backing ApproverSourceType.DEPARTMENT_OWNER resolution - a plain CRUD table, no
 * builder needed. departmentUuid is a raw UUID input rather than a department-name picker: no
 * existing department lookup endpoint/component was found reused elsewhere in this app to wire up
 * (see Masters pages for department-adjacent lookups if one surfaces later - this is a deliberate,
 * narrow scope choice, not an oversight).
 */
export default function DepartmentApproversPage() {
  const { data: approvers, isLoading, isError, refetch } = useDepartmentApprovers();
  const saveApprover = useSaveDepartmentApprover();
  const deleteApprover = useDeleteDepartmentApprover();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [toDelete, setToDelete] = useState(null);

  const openCreate = () => {
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setForm({ departmentApproverId: row.departmentApproverId, departmentUuid: row.departmentUuid, approverEmployeeId: row.approverEmployeeId, status: row.status });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.departmentUuid.trim() || !form.approverEmployeeId.trim()) {
      showStatusToast("Department and Approver Employee ID are required.", "error");
      return;
    }
    saveApprover.mutate(
      {
        id: form.departmentApproverId,
        payload: { departmentUuid: form.departmentUuid.trim(), approverEmployeeId: form.approverEmployeeId.trim(), status: form.status },
      },
      {
        onSuccess: () => {
          showStatusToast(form.departmentApproverId ? "Updated" : "Created", "success");
          setIsModalOpen(false);
        },
        onError: (err) => showStatusToast(err.response?.data?.message || "Failed to save", "error"),
      },
    );
  };

  const handleDeleteConfirm = () => {
    deleteApprover.mutate(toDelete.departmentApproverId, {
      onSuccess: () => {
        showStatusToast("Deleted", "success");
        setToDelete(null);
      },
      onError: (err) => {
        showStatusToast(err.response?.data?.message || "Failed to delete", "error");
        setToDelete(null);
      },
    });
  };

  return (
    <div className="p-6">
      <Breadcrumb
        items={[
          { label: "Expense Management", to: "/expense-management/dashboard" },
          { label: "Approval Rules" },
          { label: "Department Approvers" },
        ]}
      />

      <div className="flex items-center justify-between mt-3 mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Department Approvers</h1>
        <Button size="small" variant="primary" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {isError && (
        <p className="text-sm text-rose-600">
          Failed to load. <button className="underline" onClick={() => refetch()}>Retry</button>
        </p>
      )}
      {!isLoading && !isError && (approvers || []).length === 0 && <p className="text-sm text-gray-500">No department approvers configured yet.</p>}

      {(approvers || []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Department UUID</th>
                <th className="px-4 py-3">Approver Employee ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {approvers.map((row) => (
                <tr key={row.departmentApproverId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.departmentUuid}</td>
                  <td className="px-4 py-3 text-gray-900">{row.approverEmployeeId}</td>
                  <td className="px-4 py-3 text-gray-600">{row.status}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button size="small" variant="outline" onClick={() => openEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="small" variant="danger" onClick={() => setToDelete(row)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={form.departmentApproverId ? "Edit Department Approver" : "Add Department Approver"}
        size="md"
        closeOnBackdrop={false}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saveApprover.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="department-approver-form" variant="primary" loading={saveApprover.isPending} loadingText="Saving...">
              Save
            </Button>
          </div>
        }
      >
        <form id="department-approver-form" onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Department UUID"
            name="departmentUuid"
            value={form.departmentUuid}
            onChange={(e) => setForm((f) => ({ ...f, departmentUuid: e.target.value }))}
            requiredMark
          />
          <FormInput
            label="Approver Employee ID"
            name="approverEmployeeId"
            value={form.approverEmployeeId}
            onChange={(e) => setForm((f) => ({ ...f, approverEmployeeId: e.target.value }))}
            requiredMark
          />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-2"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!toDelete}
        title="Delete Department Approver"
        message={`Delete this mapping for department ${toDelete?.departmentUuid}?`}
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setToDelete(null)}
        isLoading={deleteApprover.isPending}
        variant="danger"
      />
    </div>
  );
}
