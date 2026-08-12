import React, { useState } from "react";
import { UserRoundCog } from "lucide-react";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import { useAuth } from "@/contexts/AuthContext";
import { useApprovalDelegations, useSaveApprovalDelegation, useDeleteApprovalDelegation } from "../hooks/useApprovalDelegations";
import EmployeeLabel from "./EmployeeLabel";
import { formatDate } from "../constants/approvalLabels";

/**
 * Self-service delegation, deliberately placed where an approver naturally lands (the queue page),
 * not buried in an admin-only screen - any employee can be a resolved approver (§1.5), so any
 * employee needs a way to set their own delegate without needing ADMIN access. The Admin
 * "Approval Rules" section's DelegationsPage covers the full oversight table for ADMIN, using the
 * same self-service-or-admin backend authorization - this is the other, more relevant half.
 */
export default function MyDelegateCard() {
  const { user } = useAuth();
  const myEmployeeId = user?.employee_id;

  const { data: delegations } = useApprovalDelegations();
  const saveDelegation = useSaveApprovalDelegation();
  const deleteDelegation = useDeleteApprovalDelegation();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ delegateId: "", startDate: "", endDate: "" });

  const myDelegation = (delegations || []).find((d) => d.delegatorId === myEmployeeId && d.status !== "CANCELLED");

  const startEdit = () => {
    setForm({
      delegateId: myDelegation?.delegateId || "",
      startDate: myDelegation?.startDate || "",
      endDate: myDelegation?.endDate || "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!form.delegateId.trim() || !form.startDate || !form.endDate) {
      showStatusToast("Delegate, start date, and end date are all required.", "error");
      return;
    }
    saveDelegation.mutate(
      {
        id: myDelegation?.delegationId,
        payload: { delegatorId: myEmployeeId, delegateId: form.delegateId.trim(), startDate: form.startDate, endDate: form.endDate, status: "ACTIVE" },
      },
      {
        onSuccess: () => {
          showStatusToast("Delegate saved", "success");
          setIsEditing(false);
        },
        onError: (err) => showStatusToast(err.response?.data?.message || "Failed to save delegate", "error"),
      },
    );
  };

  const handleRemove = () => {
    if (!myDelegation) return;
    deleteDelegation.mutate(myDelegation.delegationId, {
      onSuccess: () => showStatusToast("Delegate removed", "success"),
      onError: (err) => showStatusToast(err.response?.data?.message || "Failed to remove delegate", "error"),
    });
  };

  if (!myEmployeeId) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-indigo-50 text-[#0A0082]">
          <UserRoundCog className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">My Delegate</p>
          {myDelegation ? (
            <p className="text-xs text-gray-500">
              <EmployeeLabel employeeId={myDelegation.delegateId} className="font-medium text-gray-700" /> covers your approvals from{" "}
              {formatDate(myDelegation.startDate)} to {formatDate(myDelegation.endDate)}
            </p>
          ) : (
            <p className="text-xs text-gray-500">No delegate set - your approvals stay with you while you're away.</p>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="flex flex-wrap items-end gap-2">
          <input
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 w-36"
            placeholder="Delegate Employee ID"
            value={form.delegateId}
            onChange={(e) => setForm((f) => ({ ...f, delegateId: e.target.value }))}
          />
          <input
            type="date"
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5"
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
          />
          <input
            type="date"
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5"
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
          />
          <Button size="small" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
          <Button size="small" variant="primary" loading={saveDelegation.isPending} onClick={handleSave}>Save</Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button size="small" variant="outline" onClick={startEdit}>
            {myDelegation ? "Change" : "Set Delegate"}
          </Button>
          {myDelegation && (
            <Button size="small" variant="danger" loading={deleteDelegation.isPending} onClick={handleRemove}>
              Remove
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
