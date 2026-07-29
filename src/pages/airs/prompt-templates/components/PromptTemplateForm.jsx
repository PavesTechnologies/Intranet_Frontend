import React from "react";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { TASK_TYPE_FORM_OPTIONS, STATUS_FORM_OPTIONS, PROMPT_NAME_MAX_LENGTH, PROMPT_TEMPLATE_MAX_LENGTH, NOTES_MAX_LENGTH } from "../constants/promptTemplateConstants";
import { getTaskTypeLabel } from "../utils/promptTemplateUtils.jsx";

function FieldLabel({ children, required }) {
  return (
    <label className="text-[12px] font-semibold text-slate-600">
      {children}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
  );
}

// Shared field markup for Create/Edit — a pure controlled component; the
// wrapper page owns values/errors/validation/submit, matching the convention
// in src/pages/airs/skill-ontology/components/SkillForm.jsx.
export default function PromptTemplateForm({ values, errors, onFieldChange, isEditMode = false }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <div>
        <div className="flex items-center justify-between">
          <FieldLabel required>Prompt Name</FieldLabel>
          <span className="text-[11px] text-slate-400">
            {(values.name || "").length} / {PROMPT_NAME_MAX_LENGTH}
          </span>
        </div>
        <input
          type="text"
          value={values.name}
          onChange={(e) => onFieldChange("name", e.target.value)}
          placeholder="e.g. Resume Skill Extraction Prompt"
          className={`w-full mt-1 px-3 py-2.5 rounded-lg border text-[13px] outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? "border-rose-400" : "border-slate-200"
          }`}
        />
        {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name}</p>}
      </div>

      <div>
        <FieldLabel required>Task Type</FieldLabel>
        <div className="mt-1">
          {isEditMode ? (
            <div className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[13px] text-slate-500">
              {getTaskTypeLabel(values.taskType)}
            </div>
          ) : (
            <FilterListbox
              options={[{ label: "Select a task type…", value: "" }, ...TASK_TYPE_FORM_OPTIONS]}
              value={values.taskType}
              onChange={(v) => onFieldChange("taskType", v)}
            />
          )}
        </div>
        {errors.taskType && <p className="text-[11px] text-rose-600 mt-1">{errors.taskType}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <FieldLabel required>Prompt Template</FieldLabel>
          <span className="text-[11px] text-slate-400">
            {(values.promptTemplate || "").length} / {PROMPT_TEMPLATE_MAX_LENGTH}
          </span>
        </div>
        <textarea
          rows={14}
          value={values.promptTemplate}
          onChange={(e) => onFieldChange("promptTemplate", e.target.value)}
          placeholder="Enter the full prompt template text…"
          className={`w-full mt-1 px-3 py-2.5 rounded-lg border text-[13px] font-mono outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.promptTemplate ? "border-rose-400" : "border-slate-200"
          }`}
        />
        {errors.promptTemplate && <p className="text-[11px] text-rose-600 mt-1">{errors.promptTemplate}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <FieldLabel>Notes</FieldLabel>
          <span className="text-[11px] text-slate-400">
            {(values.notes || "").length} / {NOTES_MAX_LENGTH}
          </span>
        </div>
        <textarea
          rows={4}
          value={values.notes}
          onChange={(e) => onFieldChange("notes", e.target.value)}
          placeholder="Optional notes about this prompt template…"
          className={`w-full mt-1 px-3 py-2.5 rounded-lg border text-[13px] outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.notes ? "border-rose-400" : "border-slate-200"
          }`}
        />
        {errors.notes && <p className="text-[11px] text-rose-600 mt-1">{errors.notes}</p>}
      </div>

      <div className="max-w-xs">
        <FieldLabel required>Status</FieldLabel>
        <div className="mt-1">
          <FilterListbox
            options={STATUS_FORM_OPTIONS}
            value={values.status}
            onChange={(v) => onFieldChange("status", v)}
          />
        </div>
        {errors.status && <p className="text-[11px] text-rose-600 mt-1">{errors.status}</p>}
      </div>
    </div>
  );
}
