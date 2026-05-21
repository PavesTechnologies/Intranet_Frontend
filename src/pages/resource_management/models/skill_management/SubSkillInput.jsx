import React from "react";
import SearchableSelect from "./SearchableSelect";

const modeButtonClass = (isActive) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-indigo-600 text-white shadow-sm"
      : "bg-white text-slate-600 hover:bg-slate-100"
  }`;

const SubSkillInput = ({
  isOpen,
  isNewSubSkill,
  onToggleNew,
  existingSubSkillId,
  onExistingSubSkillChange,
  existingSubSkillOptions,
  newSubSkillName,
  onNewSubSkillNameChange,
  onAddSubSkill,
}) => {
  if (!isOpen) return null;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => onToggleNew(false)}
          className={modeButtonClass(!isNewSubSkill)}
        >
          Existing SubSkill
        </button>
        <button
          type="button"
          onClick={() => onToggleNew(true)}
          className={modeButtonClass(isNewSubSkill)}
        >
          New SubSkill
        </button>
      </div>

      {isNewSubSkill ? (
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            SubSkill Name
          </label>
          <input
            value={newSubSkillName}
            onChange={(event) => onNewSubSkillNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAddSubSkill();
              }
            }}
            placeholder="Enter subskill name"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>
      ) : (
        <SearchableSelect
          label="SubSkill"
          value={existingSubSkillId}
          onChange={onExistingSubSkillChange}
          options={existingSubSkillOptions}
          placeholder="Search subskill"
        />
      )}

      <div className="mt-3 flex items-center justify-between">
        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
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
          onClick={onAddSubSkill}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Add SubSkill
        </button>
      </div>
    </div>
  );
};

export default SubSkillInput;
