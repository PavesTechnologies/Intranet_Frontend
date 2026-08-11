import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "@/components/toastfy/toast";
import { useApprovalFlows, useSaveApprovalFlow, useDeleteApprovalFlow } from "../hooks/useApprovalFlows";

/**
 * Priority-ordered list of Approval Flows (the catch-all flow lives on its own screen - it has no
 * name/priority/criteria of its own, see CatchAllFlowPage). Reordering is up/down buttons, not
 * drag-and-drop - no drag-drop library is used for simple linear reordering anywhere else in this
 * module either (dnd-kit is reserved for the builder's nested levels/criteria); a swap-priority
 * write on each click is simple and this list is expected to stay small.
 */
export default function ApprovalFlowsPage() {
  const navigate = useNavigate();
  const { data: flows, isLoading, isError, refetch } = useApprovalFlows();
  const saveFlow = useSaveApprovalFlow();
  const deleteFlow = useDeleteApprovalFlow();
  const [flowToDelete, setFlowToDelete] = useState(null);

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
    <div className="p-6">
      <Breadcrumb
        items={[
          { label: "Expense Management", to: "/expense-management/dashboard" },
          { label: "Approval Rules" },
          { label: "Flows" },
        ]}
      />

      <div className="flex items-center justify-between mt-3 mb-4">
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

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {isError && (
        <p className="text-sm text-rose-600">
          Failed to load flows. <button className="underline" onClick={() => refetch()}>Retry</button>
        </p>
      )}

      {sorted.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 w-20">Priority</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Levels</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((flow, idx) => (
                <tr key={flow.flowId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-gray-500 w-5">{flow.priority}</span>
                      <button disabled={idx === 0} onClick={() => swapPriority(flow, sorted[idx - 1])} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button disabled={idx === sorted.length - 1} onClick={() => swapPriority(flow, sorted[idx + 1])} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{flow.name}</td>
                  <td className="px-4 py-3 text-gray-600">{flow.levels?.length ?? 0}</td>
                  <td className="px-4 py-3 text-gray-600">{flow.status}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button size="small" variant="outline" onClick={() => navigate(`/expense-management/approval-rules/flows/${flow.flowId}/edit`)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="small" variant="danger" onClick={() => setFlowToDelete(flow)}>
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
