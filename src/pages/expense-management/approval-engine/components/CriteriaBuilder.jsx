import React from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import Button from "@/components/Button/Button";

const FIELD_OPTIONS = [
  { value: "AMOUNT", label: "Amount" },
  { value: "CATEGORY", label: "Category" },
  { value: "DEPARTMENT", label: "Department" },
  { value: "COST_CENTER", label: "Cost Center" },
];

// GREATER_THAN*/LESS_THAN* are only legal when field === "AMOUNT" (server-enforced) - the operator
// list is filtered per-row so an admin can never build a request the backend will reject.
const OPERATORS_FOR_FIELD = (field) =>
  field === "AMOUNT"
    ? [
        { value: "EQUALS", label: "=" },
        { value: "NOT_EQUALS", label: "≠" },
        { value: "GREATER_THAN", label: ">" },
        { value: "GREATER_THAN_OR_EQUAL", label: "≥" },
        { value: "LESS_THAN", label: "<" },
        { value: "LESS_THAN_OR_EQUAL", label: "≤" },
      ]
    : [
        { value: "EQUALS", label: "=" },
        { value: "NOT_EQUALS", label: "≠" },
      ];

function CriterionRow({ id, criterion, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const setField = (field) => {
    const operators = OPERATORS_FOR_FIELD(field).map((o) => o.value);
    onChange({ ...criterion, field, operator: operators.includes(criterion.operator) ? criterion.operator : operators[0] });
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-2">
      <button type="button" {...attributes} {...listeners} className="text-gray-400 cursor-grab active:cursor-grabbing shrink-0">
        <GripVertical className="h-4 w-4" />
      </button>
      <select
        className="text-sm border border-gray-300 rounded-md px-2 py-1.5"
        value={criterion.field}
        onChange={(e) => setField(e.target.value)}
      >
        {FIELD_OPTIONS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>
      <select
        className="text-sm border border-gray-300 rounded-md px-2 py-1.5 w-16"
        value={criterion.operator}
        onChange={(e) => onChange({ ...criterion, operator: e.target.value })}
      >
        {OPERATORS_FOR_FIELD(criterion.field).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <input
        className="text-sm border border-gray-300 rounded-md px-2 py-1.5 flex-1 min-w-0"
        placeholder={criterion.field === "AMOUNT" ? "e.g. 10000" : "value"}
        value={criterion.value || ""}
        onChange={(e) => onChange({ ...criterion, value: e.target.value })}
      />
      <button type="button" onClick={onRemove} className="text-gray-400 hover:text-rose-600 shrink-0">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function CriteriaGroup({ id, group, onChange, onRemove, canRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const updateCriterion = (rowId, next) =>
    onChange({ ...group, criteria: group.criteria.map((c) => (c.id === rowId ? { ...next, id: rowId } : c)) });

  const removeCriterion = (rowId) => onChange({ ...group, criteria: group.criteria.filter((c) => c.id !== rowId) });

  const addCriterion = () =>
    onChange({
      ...group,
      criteria: [...group.criteria, { id: crypto.randomUUID(), field: "AMOUNT", operator: "GREATER_THAN", value: "" }],
    });

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = group.criteria.findIndex((c) => c.id === active.id);
    const newIndex = group.criteria.findIndex((c) => c.id === over.id);
    onChange({ ...group, criteria: arrayMove(group.criteria, oldIndex, newIndex) });
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border border-gray-300 bg-gray-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <button type="button" {...attributes} {...listeners} className="text-gray-400 cursor-grab active:cursor-grabbing flex items-center gap-1 text-xs font-medium uppercase tracking-wide">
          <GripVertical className="h-4 w-4" /> AND group
        </button>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-gray-400 hover:text-rose-600">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={group.criteria.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {group.criteria.map((c) => (
              <CriterionRow key={c.id} id={c.id} criterion={c} onChange={(next) => updateCriterion(c.id, next)} onRemove={() => removeCriterion(c.id)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button size="small" variant="outline" className="mt-2" onClick={addCriterion}>
        <Plus className="h-3.5 w-3.5" /> Add condition (AND)
      </Button>
    </div>
  );
}

/**
 * Disjunctive-normal-form criteria builder: OR of AND-groups. Backs ApprovalFlowRequest.criteria[]
 * + criteriaPattern together - see utils/criteriaPattern.js for the serialize/parse logic this
 * renders. `groups` is this component's own local shape ({ id, criteria: [{ id, field, operator,
 * value }] }); the parent form converts to/from the wire format on load/submit.
 */
export default function CriteriaBuilder({ groups, onChange }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const updateGroup = (groupId, next) => onChange(groups.map((g) => (g.id === groupId ? { ...next, id: groupId } : g)));
  const removeGroup = (groupId) => onChange(groups.filter((g) => g.id !== groupId));
  const addGroup = () =>
    onChange([...groups, { id: crypto.randomUUID(), criteria: [{ id: crypto.randomUUID(), field: "AMOUNT", operator: "GREATER_THAN", value: "" }] }]);

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = groups.findIndex((g) => g.id === active.id);
    const newIndex = groups.findIndex((g) => g.id === over.id);
    onChange(arrayMove(groups, oldIndex, newIndex));
  };

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {groups.map((group, idx) => (
              <React.Fragment key={group.id}>
                {idx > 0 && <div className="text-center text-xs font-bold text-gray-400 tracking-wide">OR</div>}
                <CriteriaGroup group={group} id={group.id} onChange={(next) => updateGroup(group.id, next)} onRemove={() => removeGroup(group.id)} canRemove={groups.length > 1} />
              </React.Fragment>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button size="small" variant="outline" className="mt-3" onClick={addGroup}>
        <Plus className="h-3.5 w-3.5" /> Add OR group
      </Button>
    </div>
  );
}
