import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { AlertTriangle } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import { useApprovalFlow, useSaveApprovalFlow } from "../hooks/useApprovalFlows";
import CriteriaBuilder from "../components/CriteriaBuilder";
import LevelsBuilder from "../components/LevelsBuilder";
import FlowPreview from "../components/FlowPreview";
import { parseCriteriaPattern, serializeCriteriaGroups } from "../utils/criteriaPattern";
import { describeCriteriaGroups } from "../constants/approvalLabels";

const emptyGroup = () => ({ id: crypto.randomUUID(), criteria: [{ id: crypto.randomUUID(), field: "AMOUNT", operator: "GREATER_THAN", value: "" }] });
const emptyLevel = () => ({ id: crypto.randomUUID(), levelName: "", quorum: "SEQUENTIAL", levelType: "APPROVAL", approvers: [{ id: crypto.randomUUID(), sourceType: "REPORTING_MANAGER", sourceReference: "" }] });

const toLocalLevels = (levels) =>
  (levels || []).map((l) => ({
    id: crypto.randomUUID(),
    levelId: l.levelId,
    levelName: l.levelName || "",
    quorum: l.quorum,
    levelType: l.levelType || "APPROVAL",
    approvers: (l.approvers || []).map((a) => ({ id: crypto.randomUUID(), entryId: a.entryId, sourceType: a.sourceType, sourceReference: a.sourceReference || "" })),
  }));

/**
 * Dedicated screen (not a modal, per design decision) for creating/editing an Approval Flow - the
 * criteria pattern + level chain are structurally complex enough (nested AND/OR groups, reorderable
 * levels each with reorderable approver entries) that a modal would badly cramp them. Owns its own
 * form state (react-hook-form for the flat fields; plain state for the two dnd-kit-driven builders,
 * since their reorder logic operates on plain arrays, not RHF's field-array API).
 */
export default function ApprovalFlowBuilderPage() {
  const { flowId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!flowId;

  const { data: existingFlow, isLoading } = useApprovalFlow(flowId);
  const saveFlow = useSaveApprovalFlow();

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { name: "", priority: 1, status: "ACTIVE" },
  });

  const [groups, setGroups] = useState([emptyGroup()]);
  const [levels, setLevels] = useState([emptyLevel()]);
  const [rawMode, setRawMode] = useState(false);
  const [rawPattern, setRawPattern] = useState("");
  const [rawCriteria, setRawCriteria] = useState([]);

  useEffect(() => {
    if (!existingFlow) return;
    reset({ name: existingFlow.name || "", priority: existingFlow.priority ?? 1, status: existingFlow.status || "ACTIVE" });
    setLevels(toLocalLevels(existingFlow.levels));

    const parsed = parseCriteriaPattern(existingFlow.criteriaPattern, existingFlow.criteria);
    if (parsed) {
      setRawMode(false);
      setGroups(
        parsed.groups.length
          ? parsed.groups.map((g) => ({ id: crypto.randomUUID(), criteria: g.criteria.map((c) => ({ id: crypto.randomUUID(), field: c.field, operator: c.operator, value: c.value })) }))
          : [emptyGroup()],
      );
    } else {
      setRawMode(true);
      setRawPattern(existingFlow.criteriaPattern || "");
      setRawCriteria((existingFlow.criteria || []).map((c) => ({ ...c })));
    }
  }, [existingFlow, reset]);

  const buildLevelsPayload = () =>
    levels.map((l, levelIdx) => ({
      levelOrder: levelIdx + 1,
      levelName: l.levelName?.trim() || null,
      quorum: l.quorum,
      levelType: l.levelType || "APPROVAL",
      approvers: l.approvers.map((a, approverIdx) => ({
        entryOrder: approverIdx + 1,
        sourceType: a.sourceType,
        sourceReference: a.sourceType === "NAMED_USER" ? a.sourceReference?.trim() : null,
      })),
    }));

  const validateBeforeSubmit = () => {
    for (const level of levels) {
      for (const a of level.approvers) {
        if (a.sourceType === "NAMED_USER" && !a.sourceReference?.trim()) {
          return "Every Named User approver needs an Employee ID.";
        }
      }
    }
    if (!rawMode) {
      for (const group of groups) {
        for (const c of group.criteria) {
          if (!c.value?.trim()) return "Every criteria condition needs a value.";
        }
      }
    } else if (!rawPattern.trim()) {
      return "Criteria pattern is required.";
    }
    return null;
  };

  const onSubmit = (formValues) => {
    const validationError = validateBeforeSubmit();
    if (validationError) {
      showStatusToast(validationError, "error");
      return;
    }

    const { criteria, criteriaPattern } = rawMode
      ? { criteria: rawCriteria, criteriaPattern: rawPattern }
      : serializeCriteriaGroups(groups);

    const payload = {
      name: formValues.name.trim(),
      priority: Number(formValues.priority),
      criteriaPattern,
      criteria,
      levels: buildLevelsPayload(),
      status: formValues.status,
    };

    saveFlow.mutate(
      { flowId, payload },
      {
        onSuccess: () => {
          showStatusToast(isEditing ? "Flow updated" : "Flow created", "success");
          navigate("/expense-management/approval-rules/flows");
        },
        onError: (err) => showStatusToast(err.response?.data?.message || "Failed to save flow", "error"),
      },
    );
  };

  const whenLabel = useMemo(() => {
    if (rawMode) return rawPattern || "Always";
    const { criteria, criteriaPattern } = serializeCriteriaGroups(groups);
    return describeCriteriaGroups(criteriaPattern, criteria) || criteriaPattern || "Always";
  }, [rawMode, rawPattern, groups]);

  if (isEditing && isLoading) {
    return <div className="p-6 text-sm text-gray-500">Loading flow…</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <Breadcrumb
        items={[
          { label: "Expense Management", to: "/expense-management/dashboard" },
          { label: "Approval Rules", to: "/expense-management/approval-rules/flows" },
          { label: "Flows", to: "/expense-management/approval-rules/flows" },
          { label: isEditing ? "Edit Flow" : "New Flow" },
        ]}
      />

      <h1 className="text-xl font-semibold text-gray-900 mt-3 mb-4">{isEditing ? "Edit Approval Flow" : "New Approval Flow"}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 lg:col-span-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Flow Details</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
            <input
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
            <input
              type="number"
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
              {...register("priority", { required: true, valueAsNumber: true })}
            />
            <p className="text-xs text-gray-400 mt-1">Lower number is evaluated first.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5" {...register("status")}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">When / Criteria</h2>
          {rawMode && (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                This flow's existing criteria pattern uses a structure the visual builder can't represent (nested
                grouping beyond OR-of-ANDs). Edit the raw pattern and conditions below instead.
              </span>
            </div>
          )}
          {rawMode ? (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Criteria pattern</label>
                <input
                  className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 font-mono"
                  value={rawPattern}
                  onChange={(e) => setRawPattern(e.target.value)}
                  placeholder="(1 AND 2) OR 3"
                />
              </div>
              {rawCriteria.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-gray-400 w-6">{c.index}</span>
                  <span className="flex-1">{c.field} {c.operator} {c.value}</span>
                </div>
              ))}
              <Button size="small" variant="outline" onClick={() => { setRawMode(false); setGroups([emptyGroup()]); }}>
                Switch to visual builder (discards current pattern)
              </Button>
            </div>
          ) : (
            <CriteriaBuilder groups={groups} onChange={setGroups} />
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Approval Levels</h2>
          <LevelsBuilder levels={levels} onChange={setLevels} />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/expense-management/approval-rules/flows")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saveFlow.isPending} loadingText="Saving...">
            {isEditing ? "Save Changes" : "Create Flow"}
          </Button>
        </div>
      </form>

      <div className="lg:sticky lg:top-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Flow Preview</h2>
        <FlowPreview whenLabel={whenLabel} levels={levels} />
      </div>
      </div>
    </div>
  );
}
