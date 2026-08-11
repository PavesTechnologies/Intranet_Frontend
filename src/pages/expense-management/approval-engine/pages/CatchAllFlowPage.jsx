import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import { useCatchAllFlow, useSaveCatchAllFlow } from "../hooks/useApprovalFlows";
import LevelsBuilder from "../components/LevelsBuilder";

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
    <div className="p-6 max-w-4xl">
      <Breadcrumb
        items={[
          { label: "Expense Management", to: "/expense-management/dashboard" },
          { label: "Approval Rules", to: "/expense-management/approval-rules/flows" },
          { label: "Catch-All Flow" },
        ]}
      />

      <h1 className="text-xl font-semibold text-gray-900 mt-3 mb-1">Catch-All Flow</h1>
      <p className="text-sm text-gray-500 mb-4">
        Applies to any report that doesn't match a named flow's criteria. Always evaluated last.
      </p>

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
  );
}
