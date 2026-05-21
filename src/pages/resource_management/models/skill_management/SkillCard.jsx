import React, { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import SubSkillInput from "./SubSkillInput";

const SkillCard = ({
  skill,
  isUpdateMode = false,
  existingSubSkillOptions,
  onSkillNameChange,
  onSkillDescriptionChange,
  onSkillActiveChange,
  onRemoveSkill,
  onSubSkillNameChange,
  onSubSkillDescriptionChange,
  onSubSkillActiveChange,
  onRemoveSubSkill,
  onOpenSubSkillForm,
  onToggleNewSubSkill,
  onExistingSubSkillChange,
  onNewSubSkillNameChange,
  onAddSubSkill,
}) => (
  <SkillCardBody
    skill={skill}
    isUpdateMode={isUpdateMode}
    existingSubSkillOptions={existingSubSkillOptions}
    onSkillNameChange={onSkillNameChange}
    onSkillDescriptionChange={onSkillDescriptionChange}
    onSkillActiveChange={onSkillActiveChange}
    onRemoveSkill={onRemoveSkill}
    onSubSkillNameChange={onSubSkillNameChange}
    onSubSkillDescriptionChange={onSubSkillDescriptionChange}
    onSubSkillActiveChange={onSubSkillActiveChange}
    onRemoveSubSkill={onRemoveSubSkill}
    onOpenSubSkillForm={onOpenSubSkillForm}
    onToggleNewSubSkill={onToggleNewSubSkill}
    onExistingSubSkillChange={onExistingSubSkillChange}
    onNewSubSkillNameChange={onNewSubSkillNameChange}
    onAddSubSkill={onAddSubSkill}
  />
);

const SkillCardBody = ({
  skill,
  isUpdateMode,
  existingSubSkillOptions,
  onSkillNameChange,
  onSkillDescriptionChange,
  onSkillActiveChange,
  onRemoveSkill,
  onSubSkillNameChange,
  onSubSkillDescriptionChange,
  onSubSkillActiveChange,
  onRemoveSubSkill,
  onOpenSubSkillForm,
  onToggleNewSubSkill,
  onExistingSubSkillChange,
  onNewSubSkillNameChange,
  onAddSubSkill,
}) => {
  const [activeSubSkillId, setActiveSubSkillId] = useState("");
  const [updateEditTarget, setUpdateEditTarget] = useState("skill");

  useEffect(() => {
    if (!skill.subSkills.length) {
      setActiveSubSkillId("");
      return;
    }

    const exists = skill.subSkills.some((item) => String(item.id) === String(activeSubSkillId));
    if (!exists) {
      setActiveSubSkillId(isUpdateMode ? "" : skill.subSkills[0].id);
    }
  }, [activeSubSkillId, isUpdateMode, skill.subSkills]);

  useEffect(() => {
    if (!isUpdateMode) return;
    setUpdateEditTarget("skill");
  }, [isUpdateMode, skill.id]);

  const activeSubSkill =
    skill.subSkills.find((item) => String(item.id) === String(activeSubSkillId)) || null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {(!isUpdateMode || updateEditTarget === "skill") ? (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Skill Name
              </label>
              <input
                value={skill.name}
                onChange={(event) => onSkillNameChange(event.target.value)}
                className="w-full min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              />
              <label className="mb-1 mt-3 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Skill Description
              </label>
              <textarea
                value={skill.description || ""}
                onChange={(event) => onSkillDescriptionChange(event.target.value)}
                rows={2}
                placeholder="Enter skill description"
                className="w-full min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>
            <label className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={skill.isActive ?? true}
                onChange={(event) => onSkillActiveChange(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
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
      ) : null}

    <div className="px-4 py-4">
      <div className="space-y-2">
        {skill.subSkills.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              {isUpdateMode ? (
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  SubSkills For Update
                </p>
              ) : (
                <span />
              )}
              {isUpdateMode ? (
                <button
                  type="button"
                  onClick={() => setUpdateEditTarget("skill")}
                  className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
                    updateEditTarget === "skill"
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Edit Skill
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {skill.subSkills.map((subSkill) => {
                const isActiveSubSkill = String(subSkill.id) === String(activeSubSkillId);
                return (
                  <button
                    key={subSkill.id}
                    type="button"
                    onClick={() => {
                      setActiveSubSkillId(subSkill.id);
                      if (isUpdateMode) {
                        setUpdateEditTarget("subskill");
                      }
                    }}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      isActiveSubSkill
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{subSkill.name}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveSubSkill(subSkill.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          onRemoveSubSkill(subSkill.id);
                        }
                      }}
                      className="rounded-full p-0.5 hover:bg-rose-100 hover:text-rose-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>

            {activeSubSkill && (!isUpdateMode || updateEditTarget === "subskill") ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    SubSkill Name
                  </label>
                  <input
                    value={activeSubSkill.name}
                    onChange={(event) =>
                      onSubSkillNameChange(activeSubSkill.id, event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  />
                  <label className="mb-1 mt-3 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    SubSkill Description
                  </label>
                  <textarea
                    value={activeSubSkill.description || ""}
                    onChange={(event) =>
                      onSubSkillDescriptionChange(activeSubSkill.id, event.target.value)
                    }
                    rows={2}
                    placeholder="Enter subskill description"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={activeSubSkill.isActive ?? true}
                      onChange={(event) =>
                        onSubSkillActiveChange(activeSubSkill.id, event.target.checked)
                      }
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                    Active
                  </label>
                </div>
              </div>
            ) : null}
          </>
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
};

export default SkillCard;
