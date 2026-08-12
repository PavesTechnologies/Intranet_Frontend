import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import { useCatchAllFlow, useSaveCatchAllFlow } from "../hooks/useApprovalFlows";
import LevelsBuilder from "../components/LevelsBuilder";
import FlowPreview from "../components/FlowPreview";

const emptyLevel = () => ({ id: crypto.randomUUID(), levelName: "", quorum: "SEQUENTIAL", approvers: [{ id: crypto.randomUUID(), sourceType: "REPORTING_MANAGER", sourceReference: "" }] });

const toLocalLevels = (levels) =>
  (levels || []).map((l) => ({
    id: crypto.randomUUID(),
    levelId: l.levelId,
    levelName: l.levelName || "",
    quorum: l.quorum,
    approvers: (l.approvers || []).map((a) => ({ id: crypto.randomUUID(), entryId: a.entryId, sourceType: a.sourceType, sourceReference: a.sourceReference || "" })),
  }));

/**
 * The Catch-All flow - the one flow every report falls into if nothing else matches (§ "it always
 * matches, always evaluates last"). No name/priority/criteria of its own - CatchAllFlowRequest is
 * levels[] only - hence its own simpler screen using the same LevelsBuilder rather than a stripped
 * variant of ApprovalFlowBuilderPage.
 */
export default function CatchAllFlowPage() {
  const navigate = useNavigate();
  const { data: catchAll, isLoading } = useCatchAllFlow();
  const saveCatchAll = useSaveCatchAllFlow();
  const [levels, setLevels] = useState([emptyLevel()]);

  useEffect(() => {
    if (catchAll) setLevels(toLocalLevels(catchAll.levels));
  }, [catchAll]);

  const handleSave = () => {
    for (const level of levels) {
      for (const a of level.approvers) {
        if (a.sourceType === "NAMED_USER" && !a.sourceReference?.trim()) {
          showStatusToast("Every Named User approver needs an Employee ID.", "error");
          return;
        }
      }
    }

    const payload = {
      levels: levels.map((l, levelIdx) => ({
        levelOrder: levelIdx + 1,
        levelName: l.levelName?.trim() || null,
        quorum: l.quorum,
        approvers: l.approvers.map((a, approverIdx) => ({
          entryOrder: approverIdx + 1,
          sourceType: a.sourceType,
          sourceReference: a.sourceType === "NAMED_USER" ? a.sourceReference?.trim() : null,
        })),
      })),
    };

    saveCatchAll.mutate(payload, {
      onSuccess: () => showStatusToast("Catch-all flow updated", "success"),
      onError: (err) => showStatusToast(err.response?.data?.message || "Failed to save catch-all flow", "error"),
    });
  };

  if (isLoading) return <div className="p-6 text-sm text-gray-500">Loading…</div>;

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <Breadcrumb
        items={[
          { label: "Expense Management", to: "/expense-management/dashboard" },
          { label: "Approval Rules", to: "/expense-management/approval-rules/flows" },
          { label: "Catch-All Flow" },
        ]}
      />

      <h1 className="text-xl font-semibold text-gray-900 mt-3 mb-3">Catch-All Flow</h1>

      <div className="mb-5 flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-sm text-indigo-900">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          This is the <span className="font-semibold">fallback flow</span> - it runs only when a report doesn't match any
          named flow's criteria (spec §10). It has no name, priority, or conditions of its own; it is always evaluated last.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <LevelsBuilder levels={levels} onChange={setLevels} />

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => navigate("/expense-management/approval-rules/flows")}>
              Back
            </Button>
            <Button variant="primary" loading={saveCatchAll.isPending} loadingText="Saving..." onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>

        <div className="lg:sticky lg:top-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Flow Preview</h2>
          <FlowPreview whenLabel="Always (no other flow matched)" levels={levels} />
        </div>
      </div>
    </div>
  );
}
