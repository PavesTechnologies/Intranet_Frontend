import React from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import Button from "@/components/Button/Button";

const SOURCE_TYPE_OPTIONS = [
  { value: "NAMED_USER", label: "Named User" },
  { value: "REPORTING_MANAGER", label: "Reporting Manager" },
  { value: "DEPARTMENT_OWNER", label: "Department Owner" },
  { value: "COST_CENTER_OWNER", label: "Cost Center Owner" },
];

const QUORUM_OPTIONS = [
  { value: "SEQUENTIAL", label: "Sequential - one after another, in order" },
  { value: "ANY_OF", label: "Any Of - first to act completes the level" },
  { value: "ALL_OF", label: "All Of - every entry must act" },
];

function ApproverRow({ id, approver, onChange, onRemove, canRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-2">
      <button type="button" {...attributes} {...listeners} className="text-gray-400 cursor-grab active:cursor-grabbing shrink-0">
        <GripVertical className="h-4 w-4" />
      </button>
      <select
        className="text-sm border border-gray-300 rounded-md px-2 py-1.5"
        value={approver.sourceType}
        onChange={(e) => onChange({ ...approver, sourceType: e.target.value })}
      >
        {SOURCE_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {approver.sourceType === "NAMED_USER" && (
        <input
          className="text-sm border border-gray-300 rounded-md px-2 py-1.5 flex-1 min-w-0"
          placeholder="Employee ID"
          value={approver.sourceReference || ""}
          onChange={(e) => onChange({ ...approver, sourceReference: e.target.value })}
        />
      )}
      {canRemove && (
        <button type="button" onClick={onRemove} className="text-gray-400 hover:text-rose-600 shrink-0 ml-auto">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function LevelCard({ id, level, onChange, onRemove, canRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const updateApprover = (rowId, next) =>
    onChange({ ...level, approvers: level.approvers.map((a) => (a.id === rowId ? { ...next, id: rowId } : a)) });
  const removeApprover = (rowId) => onChange({ ...level, approvers: level.approvers.filter((a) => a.id !== rowId) });
  const addApprover = () =>
    onChange({ ...level, approvers: [...level.approvers, { id: crypto.randomUUID(), sourceType: "REPORTING_MANAGER", sourceReference: "" }] });

  const handleApproverDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = level.approvers.findIndex((a) => a.id === active.id);
    const newIndex = level.approvers.findIndex((a) => a.id === over.id);
    onChange({ ...level, approvers: arrayMove(level.approvers, oldIndex, newIndex) });
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <button type="button" {...attributes} {...listeners} className="text-gray-400 cursor-grab active:cursor-grabbing flex items-center gap-1.5">
          <GripVertical className="h-4 w-4" />
          <span className="text-sm font-semibold text-gray-700">Level</span>
        </button>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-gray-400 hover:text-rose-600">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Level name (optional)</label>
          <input
            className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
            placeholder={`Falls back to "Level N" if left blank`}
            value={level.levelName || ""}
            onChange={(e) => onChange({ ...level, levelName: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Quorum</label>
          <select
            className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
            value={level.quorum}
            onChange={(e) => onChange({ ...level, quorum: e.target.value })}
          >
            {QUORUM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <label className="block text-xs font-medium text-gray-500 mb-1">Approvers</label>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleApproverDragEnd}>
        <SortableContext items={level.approvers.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {level.approvers.map((a) => (
              <ApproverRow
                key={a.id}
                id={a.id}
                approver={a}
                onChange={(next) => updateApprover(a.id, next)}
                onRemove={() => removeApprover(a.id)}
                canRemove={level.approvers.length > 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button size="small" variant="outline" className="mt-2" onClick={addApprover}>
        <Plus className="h-3.5 w-3.5" /> Add approver
      </Button>
    </div>
  );
}

/**
 * Reorderable approval levels, each with reorderable approver entries - backs
 * ApprovalFlowRequest.levels[] / CatchAllFlowRequest.levels[]. `levels` is this component's own
 * local shape ({ id, levelName, quorum, approvers: [{ id, sourceType, sourceReference }] }); the
 * parent form derives levelOrder/entryOrder from array position on submit.
 */
export default function LevelsBuilder({ levels, onChange }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const updateLevel = (levelId, next) => onChange(levels.map((l) => (l.id === levelId ? { ...next, id: levelId } : l)));
  const removeLevel = (levelId) => onChange(levels.filter((l) => l.id !== levelId));
  const addLevel = () =>
    onChange([
      ...levels,
      { id: crypto.randomUUID(), levelName: "", quorum: "SEQUENTIAL", approvers: [{ id: crypto.randomUUID(), sourceType: "REPORTING_MANAGER", sourceReference: "" }] },
    ]);

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = levels.findIndex((l) => l.id === active.id);
    const newIndex = levels.findIndex((l) => l.id === over.id);
    onChange(arrayMove(levels, oldIndex, newIndex));
  };

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={levels.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {levels.map((level, idx) => (
              <div key={level.id} className="relative">
                <span className="absolute -left-3 -top-3 z-10 bg-[#0A0082] text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow">
                  {idx + 1}
                </span>
                <LevelCard level={level} id={level.id} onChange={(next) => updateLevel(level.id, next)} onRemove={() => removeLevel(level.id)} canRemove={levels.length > 1} />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button size="small" variant="outline" className="mt-3" onClick={addLevel}>
        <Plus className="h-3.5 w-3.5" /> Add level
      </Button>
    </div>
  );
}
