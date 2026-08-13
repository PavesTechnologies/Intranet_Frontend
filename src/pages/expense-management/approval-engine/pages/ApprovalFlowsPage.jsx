import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowDown, ArrowUp, Inbox, Pencil, Plus, Trash2 } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "@/components/toastfy/toast";
import { useApprovalFlows, useSaveApprovalFlow, useDeleteApprovalFlow } from "../hooks/useApprovalFlows";
import { useEmployeeDirectory } from "../hooks/useEmployeeDirectory";
import { describeCriteriaGroups, describeApprovalChain } from "../constants/approvalLabels";

/**
 * Priority-ordered list of Approval Flows (the catch-all flow lives on its own screen - it has no
 * name/priority/criteria of its own, see CatchAllFlowPage). Reordering is up/down buttons, not
 * drag-and-drop - no drag-drop library is used for simple linear reordering anywhere else in this
 * module either (dnd-kit is reserved for the builder's nested levels/criteria); a swap-priority
 * write on each click is simple and this list is expected to stay small.
 *
 * Rendered as human-readable cards (When / Approval chain / Levels / Status) rather than a raw
 * table of enum values, so an Admin can understand the business rule at a glance (spec §7).
 */
export default function ApprovalFlowsPage() {
  const navigate = useNavigate();
  const { data: flows, isLoading, isError, refetch } = useApprovalFlows();
  const { data: directory } = useEmployeeDirectory();
  const saveFlow = useSaveApprovalFlow();
  const deleteFlow = useDeleteApprovalFlow();
  const [flowToDelete, setFlowToDelete] = useState(null);

  const employeeNameById = new Map();
  directory?.forEach((entry, id) => employeeNameById.set(id, entry.name));

  const sorted = [...(flows || [])].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  const swapPriority = (flow, other) => {
    saveFlow.mutate({ flowId: flow.flowId, payload: toRequest(flow, other.priority) });
    saveFlow.mutate({ flowId: other.flowId, payload: toRequest(other, flow.priority) });
  };

  const toRequest = (flow, priority) => ({
    name: flow.name,
    priority,
    criteriaPattern: flow.criteriaPattern,
    criteria: flow.criteria.map((c) => ({ index: c.index, field: c.field, operator: c.operator, value: c.value })),
    levels: flow.levels.map((l) => ({
      levelOrder: l.levelOrder,
      levelName: l.levelName,
      quorum: l.quorum,
      approvers: l.approvers.map((a) => ({ entryOrder: a.entryOrder, sourceType: a.sourceType, sourceReference: a.sourceReference })),
    })),
    status: flow.status,
  });

  const handleDeleteConfirm = () => {
    deleteFlow.mutate(flowToDelete.flowId, {
      onSuccess: () => {
        showStatusToast("Flow deleted", "success");
        setFlowToDelete(null);
      },
      onError: (err) => {
        showStatusToast(err.response?.data?.message || "Failed to delete flow", "error");
        setFlowToDelete(null);
      },
    });
  };

  return (
    <div className="p-4 sm:p-6">
      <Breadcrumb
        items={[
          { label: "Expense Management", to: "/expense-management/dashboard" },
          { label: "Approval Rules" },
          { label: "Flows" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Approval Flows</h1>
        <div className="flex gap-2">
          <Button size="small" variant="outline" onClick={() => navigate("/expense-management/approval-rules/catch-all")}>
            Catch-All Flow
          </Button>
          <Button size="small" variant="primary" onClick={() => navigate("/expense-management/approval-rules/flows/new")}>
            <Plus className="h-3.5 w-3.5" /> New Flow
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
          <LoadingSpinner text="Loading flows…" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-10 text-center">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          <p className="text-sm text-rose-700">Failed to load flows.</p>
          <Button size="small" variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {!isLoading && !isError && sorted.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white py-16 text-center">
          <Inbox className="h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">No named approval flows yet.</p>
          <p className="text-xs text-gray-400">Every report will fall through to the Catch-All flow until you add one.</p>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((flow, idx) => {
          const whenLabel = describeCriteriaGroups(flow.criteriaPattern, flow.criteria) || flow.criteriaPattern || "Always";
          const chainLabel = describeApprovalChain(flow.levels, employeeNameById);
          const isActive = (flow.status || "").toUpperCase() === "ACTIVE";
          return (
            <div key={flow.flowId} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex flex-col items-center pt-0.5">
                    <button disabled={idx === 0} onClick={() => swapPriority(flow, sorted[idx - 1])} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <span className="my-0.5 font-mono text-xs text-gray-400">{flow.priority}</span>
                    <button disabled={idx === sorted.length - 1} onClick={() => swapPriority(flow, sorted[idx + 1])} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-gray-900">{flow.name}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      <span className="font-medium text-gray-600">Priority:</span> {flow.priority}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      <span className="font-medium text-gray-600">When:</span> {whenLabel}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      <span className="font-medium text-gray-600">Approval:</span> {chainLabel}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      <span className="font-medium text-gray-600">Levels:</span> {flow.levels?.length ?? 0}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="small" variant="outline" onClick={() => navigate(`/expense-management/approval-rules/flows/${flow.flowId}/edit`)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button size="small" variant="danger" onClick={() => setFlowToDelete(flow)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmationModal
        isOpen={!!flowToDelete}
        title="Delete Approval Flow"
        message={`Delete "${flowToDelete?.name}"? Reports already in progress under this flow are unaffected; new submissions will no longer match it.`}
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setFlowToDelete(null)}
        isLoading={deleteFlow.isPending}
        variant="danger"
      />
    </div>
  );
}
