import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { fetchResourcesByDemandId } from "../../services/resource";
import allocationModificationApi from "../services/allocationModificationApi";
import CreateModificationModal from "./CreateModificationModal";
import ModificationTable from "./ModificationTable";
import RejectModificationModal from "./RejectModificationModal";

const getValue = (sources, keys, fallback = "") => {
  for (const source of sources) {
    if (!source) continue;

    for (const key of keys) {
      if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
        return source[key];
      }
    }
  }

  return fallback;
};

const normalizeModification = (item, demand, fallbackProjectName) => {
  const demandNode = item?.demand || {};
  const projectNode = item?.project || demandNode?.project || {};
  const resourceNode = item?.resource || {};

  return {
    id: getValue([item], ["allocationModificationId", "modificationId", "id"]),
    allocationId: getValue([item], ["allocationId"]),
    demandId: getValue([item, demandNode], ["demandId", "id"]),
    resourceId: getValue([item, resourceNode], ["resourceId", "id"]),
    resourceName: getValue(
      [item, resourceNode],
      ["resourceName", "fullName", "employeeName", "name"],
      "N/A"
    ),
    projectName: getValue([item, projectNode, demand], ["projectName", "name"], fallbackProjectName || "N/A"),
    currentAllocationPercentage: Number(
      getValue(
        [item],
        ["currentAllocationPercentage", "currentAllocation", "currentAllocationPct", "allocationPercentage"],
        0
      )
    ),
    requestedAllocationPercentage: Number(
      getValue(
        [item],
        ["requestedAllocationPercentage", "requestedAllocation", "requestedAllocationPct", "newAllocationPercentage"],
        0
      )
    ),
    effectiveDate: getValue(
      [item],
      ["effectiveDate", "requestedEffectiveDate", "effectiveFromDate", "effective_from_date"],
      ""
    ),
    status: String(getValue([item], ["status", "modificationStatus", "requestStatus"], "REQUESTED")).toUpperCase(),
    requestedBy: getValue([item], ["requestedBy", "requesterName", "createdBy", "requestedByName"], "N/A"),
    approvedBy: getValue([item], ["approvedBy", "approverName", "approvedByName", "actionedBy"], ""),
    requestedAt: getValue([item], ["requestedAt", "createdAt"], ""),
    approvedAt: getValue([item], ["approvedAt"], ""),
    reason: getValue([item], ["reason"], ""),
    rejectReason: getValue([item], ["rejectReason", "rejectionReason"], ""),
    rejectedBy: getValue([item], ["rejectedBy"], ""),
    overrideFlag: Boolean(getValue([item], ["overrideFlag"], false)),
    overrideJustification: getValue([item], ["overrideJustification"], ""),
    overrideBy: getValue([item], ["overrideBy"], ""),
    overrideAt: getValue([item], ["overrideAt"], ""),
  };
};

const ActionPromptModal = ({
  isOpen,
  title,
  message,
  confirmText,
  confirmClassName,
  isSubmitting,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <h2 className="text-base font-black tracking-tight text-slate-900">{title}</h2>
          <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">{message}</p>
        </div>
        <div className="flex gap-3 bg-slate-50/50 px-6 py-5">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-10 flex-1 rounded-xl border-slate-200 text-[10px] font-bold tracking-widest text-slate-500 hover:bg-white"
          >
            Keep Request
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSubmitting} className={confirmClassName}>
            {isSubmitting ? "Processing..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

const AllocationModificationTab = ({ demandId, demand, user }) => {
  const roles = user?.roles || [];
  const isRM = roles.includes("Resource_Manager");
  const isPM = roles.includes("Project_Manager");
  const projectName = demand?.project?.name || demand?.projectName || "N/A";

  const [items, setItems] = useState([]);
  const [resourceOptions, setResourceOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [processingAction, setProcessingAction] = useState("");

  const loadDemandAllocations = useCallback(async () => {
    if (!demandId) return;

    try {
      const response = await fetchResourcesByDemandId(demandId);
      const rows = Array.isArray(response?.data) ? response.data : [];

      setResourceOptions(
        rows.map((resource) => ({
          allocationId: resource.allocationId,
          resourceId: resource.resourceId || resource.id,
          resourceName:
            resource.fullName || resource.resourceName || `Resource ${resource.resourceId}`,
          currentAllocationPercentage: Number(resource.allocationPercentage || 0),
          allocationPercentage: Number(resource.allocationPercentage || 0),
          remainingAllocationPercentage: Number(
            resource.remainingAllocationPercentage ?? resource.allocationPercentage ?? 0
          ),
          allocationStartDate: resource.allocationStartDate || "",
          allocationEndDate: resource.allocationEndDate || "",
          allocationStatus: resource.allocationStatus || "",
          projectName,
        }))
      );
    } catch (allocationError) {
      console.error("Failed to fetch demand allocations for modifications", allocationError);
    }
  }, [demandId, projectName]);

  const loadModifications = useCallback(async () => {
    if (!demandId || (!isPM && !isRM)) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await allocationModificationApi.getDemandModifications(demandId);

      const rows = Array.isArray(response)
        ? response
        : Array.isArray(response?.content)
          ? response.content
          : Array.isArray(response?.items)
            ? response.items
            : [];

      const normalizedRows = rows
        .map((item) => normalizeModification(item, demand, projectName))
        .filter((item) => !item.demandId || String(item.demandId) === String(demandId));

      setItems(normalizedRows);
    } catch (requestError) {
      console.error("Failed to fetch allocation modifications", requestError);
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Failed to load allocation modifications"
      );
    } finally {
      setLoading(false);
    }
  }, [demand, demandId, isPM, isRM, projectName]);

  useEffect(() => {
    loadModifications();
    loadDemandAllocations();
  }, [loadDemandAllocations, loadModifications]);

  const canView = isPM || isRM;
  const pendingCount = useMemo(() => items.filter((item) => item.status === "REQUESTED").length, [items]);

  const handleCreate = async (payload) => {
    setProcessingAction("create");

    try {
      const response = await allocationModificationApi.createModification(payload);
      toast.success(response?.message || "Allocation modification created successfully");
      setIsCreateOpen(false);
      await loadModifications();
    } catch (requestError) {
      console.error("Failed to create allocation modification", requestError);
      toast.error(requestError?.response?.data?.message || "Failed to create allocation modification");
    } finally {
      setProcessingAction("");
    }
  };

  const handleApprove = async (item) => {
    setProcessingAction(`approve-${item.id}`);

    try {
      const response = await allocationModificationApi.submitRmDecision(item.id, {
        decision: "APPROVE",
        comments: "Approved due to project priority",
      });
      toast.success(response?.message || "Allocation modification approved");
      await loadModifications();
    } catch (requestError) {
      console.error("Failed to approve allocation modification", requestError);
      toast.error(requestError?.response?.data?.message || "Failed to approve allocation modification");
    } finally {
      setProcessingAction("");
    }
  };

  const handleReject = async (reason) => {
    if (!rejectTarget) return;

    setProcessingAction(`reject-${rejectTarget.id}`);

    try {
      const response = await allocationModificationApi.submitRmDecision(rejectTarget.id, {
        decision: "REJECT",
        comments: reason,
      });
      toast.success(response?.message || "Allocation modification rejected");
      setRejectTarget(null);
      await loadModifications();
    } catch (requestError) {
      console.error("Failed to reject allocation modification", requestError);
      toast.error(requestError?.response?.data?.message || "Failed to reject allocation modification");
    } finally {
      setProcessingAction("");
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;

    setProcessingAction(`cancel-${cancelTarget.id}`);

    try {
      const response = await allocationModificationApi.cancelModification(cancelTarget.id);
      toast.success(response?.message || "Allocation modification cancelled");
      setCancelTarget(null);
      await loadModifications();
    } catch (requestError) {
      console.error("Failed to cancel allocation modification", requestError);
      toast.error(requestError?.response?.data?.message || "Failed to cancel allocation modification");
    } finally {
      setProcessingAction("");
    }
  };

  if (!canView) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-bold text-slate-500">
          Allocation modifications are available for project managers and resource managers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Requests</p>
              <p className="text-xl font-black tracking-tight text-slate-900">{items.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending Requests</p>
              <p className="text-xl font-black tracking-tight text-slate-900">{pendingCount}</p>
            </div>
          </div>
        </div>
      </div>

      <ModificationTable
        items={items}
        loading={loading}
        error={error}
        canCreate={isPM}
        canApprove={isRM}
        canCancel={isPM}
        onCreate={() => setIsCreateOpen(true)}
        onApprove={handleApprove}
        onReject={(item) => setRejectTarget(item)}
        onCancel={(item) => setCancelTarget(item)}
        processingAction={processingAction}
      />

      <CreateModificationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={processingAction === "create"}
        resourceOptions={resourceOptions}
        demand={demand}
      />

      <RejectModificationModal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onSubmit={handleReject}
        isSubmitting={processingAction === `reject-${rejectTarget?.id}`}
        modification={rejectTarget}
      />

      <ActionPromptModal
        isOpen={!!cancelTarget}
        title="Cancel Modification Request"
        message={`This will cancel the modification request for ${cancelTarget?.resourceName || "the selected resource"}.`}
        confirmText="Cancel Modification"
        confirmClassName="h-10 flex-[2] rounded-xl bg-slate-900 text-[10px] font-black tracking-widest text-white shadow-xl shadow-slate-900/10 hover:bg-slate-800"
        isSubmitting={processingAction === `cancel-${cancelTarget?.id}`}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
};

export default AllocationModificationTab;
