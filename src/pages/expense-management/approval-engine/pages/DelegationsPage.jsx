import React, { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import Modal from "@/components/Modal/modal";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import FormInput from "@/components/forms/FormInput";
import { showStatusToast } from "@/components/toastfy/toast";
import {
  useApprovalDelegations,
  useSaveApprovalDelegation,
  useDeleteApprovalDelegation,
} from "../hooks/useApprovalDelegations";

const emptyForm = { delegationId: null, delegatorId: "", delegateId: "", startDate: "", endDate: "", status: "ACTIVE" };

/**
 * Admin oversight table of every delegation, for any delegator - the self-service counterpart
 * (any approver setting their own) lives on PendingApprovalsPage's MyDelegateCard, not here, since
 * that needs to be reachable without ADMIN access (§1.5). Same backend authorization either way:
 * ADMIN may act on anyone's delegation.
 */
export default function DelegationsPage() {
  const { data: delegations, isLoading, isError, refetch } = useApprovalDelegations();
  const saveDelegation = useSaveApprovalDelegation();
  const deleteDelegation = useDeleteApprovalDelegation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [toDelete, setToDelete] = useState(null);

  const openCreate = () => {
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setForm({ delegationId: row.delegationId, delegatorId: row.delegatorId, delegateId: row.delegateId, startDate: row.startDate, endDate: row.endDate, status: row.status });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.delegatorId.trim() || !form.delegateId.trim() || !form.startDate || !form.endDate) {
      showStatusToast("Delegator, delegate, start date, and end date are all required.", "error");
      return;
    }
    saveDelegation.mutate(
      {
        id: form.delegationId,
        payload: { delegatorId: form.delegatorId.trim(), delegateId: form.delegateId.trim(), startDate: form.startDate, endDate: form.endDate, status: form.status },
      },
      {
        onSuccess: () => {
          showStatusToast(form.delegationId ? "Updated" : "Created", "success");
          setIsModalOpen(false);
        },
        onError: (err) => showStatusToast(err.response?.data?.message || "Failed to save", "error"),
      },
    );
  };

  const handleDeleteConfirm = () => {
    deleteDelegation.mutate(toDelete.delegationId, {
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
          { label: "Delegations" },
        ]}
      />

      <div className="flex items-center justify-between mt-3 mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Delegations</h1>
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
      {!isLoading && !isError && (delegations || []).length === 0 && <p className="text-sm text-gray-500">No delegations configured yet.</p>}

      {(delegations || []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Delegator</th>
                <th className="px-4 py-3">Delegate</th>
                <th className="px-4 py-3">Window</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {delegations.map((row) => (
                <tr key={row.delegationId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{row.delegatorId}</td>
                  <td className="px-4 py-3 text-gray-900">{row.delegateId}</td>
                  <td className="px-4 py-3 text-gray-600">{row.startDate} → {row.endDate}</td>
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
        title={form.delegationId ? "Edit Delegation" : "Add Delegation"}
        size="md"
        closeOnBackdrop={false}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saveDelegation.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="delegation-form" variant="primary" loading={saveDelegation.isPending} loadingText="Saving...">
              Save
            </Button>
          </div>
        }
      >
        <form id="delegation-form" onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Delegator Employee ID"
            name="delegatorId"
            value={form.delegatorId}
            onChange={(e) => setForm((f) => ({ ...f, delegatorId: e.target.value }))}
            requiredMark
          />
          <FormInput
            label="Delegate Employee ID"
            name="delegateId"
            value={form.delegateId}
            onChange={(e) => setForm((f) => ({ ...f, delegateId: e.target.value }))}
            requiredMark
          />
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Start Date"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              requiredMark
            />
            <FormInput
              label="End Date"
              name="endDate"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              requiredMark
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-2"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="ACTIVE">Active</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!toDelete}
        title="Delete Delegation"
        message={`Delete the delegation from ${toDelete?.delegatorId} to ${toDelete?.delegateId}?`}
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setToDelete(null)}
        isLoading={deleteDelegation.isPending}
        variant="danger"
      />
    </div>
  );
}
