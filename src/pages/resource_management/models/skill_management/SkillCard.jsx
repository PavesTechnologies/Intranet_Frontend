import React from "react";
import { Plus, X } from "lucide-react";
import SubSkillInput from "./SubSkillInput";

const SkillCard = ({
  skill,
  existingSubSkillOptions,
  onRemoveSkill,
  onRemoveSubSkill,
  onOpenSubSkillForm,
  onToggleNewSubSkill,
  onExistingSubSkillChange,
  onNewSubSkillNameChange,
  onAddSubSkill,
}) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <p className="truncate text-sm font-semibold text-slate-900">{skill.name}</p>
        <label className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked
            disabled
            className="h-4 w-4 cursor-not-allowed rounded border-slate-300 text-indigo-600 opacity-70"
          />
          Active
        </label>
      </div>
      <button
        type="button"
        onClick={onRemoveSkill}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>

    <div className="px-4 py-4">
      <div className="space-y-2">
        {skill.subSkills.length > 0 ? (
          skill.subSkills.map((subSkill) => (
            <div
              key={subSkill.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{subSkill.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="h-4 w-4 cursor-not-allowed rounded border-slate-300 text-indigo-600 opacity-70"
                  />
                  Active
                </label>
                <button
                  type="button"
                  onClick={() => onRemoveSubSkill(subSkill.id)}
                  className="rounded-full text-slate-400 transition hover:text-rose-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-xs text-slate-400">
            No subskills added yet.
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenSubSkillForm}
        className="mt-4 inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Add SubSkill
      </button>

      <SubSkillInput
        isOpen={skill.isAddingSubSkill}
        isNewSubSkill={skill.isNewSubSkill}
        onToggleNew={onToggleNewSubSkill}
        existingSubSkillId={skill.selectedExistingSubSkillId}
        onExistingSubSkillChange={onExistingSubSkillChange}
        existingSubSkillOptions={existingSubSkillOptions}
        newSubSkillName={skill.newSubSkillName}
        onNewSubSkillNameChange={onNewSubSkillNameChange}
        onAddSubSkill={onAddSubSkill}
      />
    </div>
  </div>
);

export default SkillCard;
