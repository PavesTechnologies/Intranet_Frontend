import React from "react";
import {
  TASK_TYPE,
  TASK_TYPE_LABELS,
  PROMPT_TEMPLATE_STATUS,
  PROMPT_NAME_MAX_LENGTH,
  PROMPT_TEMPLATE_MIN_LENGTH,
  PROMPT_TEMPLATE_MAX_LENGTH,
  NOTES_MAX_LENGTH,
} from "../constants/promptTemplateConstants";

// Hand-rolled status pill, matching the style convention used by the newest
// real-backend AIRS pages (src/pages/airs/skill-ontology/utils/skillOntologyUtils.jsx).
const STATUS_PILL = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-100",
  INACTIVE: "bg-slate-100 text-slate-500 border-slate-200",
};

export function renderStatusPill(status) {
  const cls = STATUS_PILL[status] || STATUS_PILL.INACTIVE;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
      {status === PROMPT_TEMPLATE_STATUS.ACTIVE ? "Active" : "Inactive"}
    </span>
  );
}

export function getTaskTypeLabel(taskType) {
  return TASK_TYPE_LABELS[taskType] || taskType;
}

export function formatDate(isoDate) {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

export function formatDateTime(isoDate) {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function validatePromptTemplateForm(values) {
  const errors = {};

  const trimmedName = (values.name || "").trim();
  if (!trimmedName) {
    errors.name = "Prompt name is required.";
  } else if (trimmedName.length > PROMPT_NAME_MAX_LENGTH) {
    errors.name = `Prompt name cannot exceed ${PROMPT_NAME_MAX_LENGTH} characters.`;
  }

  if (!values.taskType || !Object.values(TASK_TYPE).includes(values.taskType)) {
    errors.taskType = "Please select a task type.";
  }

  const trimmedPrompt = (values.promptTemplate || "").trim();
  if (!trimmedPrompt) {
    errors.promptTemplate = "Prompt template is required.";
  } else if (trimmedPrompt.length < PROMPT_TEMPLATE_MIN_LENGTH) {
    errors.promptTemplate = `Prompt template must contain at least ${PROMPT_TEMPLATE_MIN_LENGTH} characters.`;
  } else if (trimmedPrompt.length > PROMPT_TEMPLATE_MAX_LENGTH) {
    errors.promptTemplate = `Prompt template cannot exceed ${PROMPT_TEMPLATE_MAX_LENGTH} characters.`;
  }

  if ((values.notes || "").length > NOTES_MAX_LENGTH) {
    errors.notes = `Notes cannot exceed ${NOTES_MAX_LENGTH} characters.`;
  }

  if (!values.status || !Object.values(PROMPT_TEMPLATE_STATUS).includes(values.status)) {
    errors.status = "Please select a status.";
  }

  return errors;
}
