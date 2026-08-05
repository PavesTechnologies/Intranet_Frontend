// Central config for the Prompt Templates module — enums, option lists, and
// shared defaults, matching the convention used by
// src/pages/airs/skill-ontology/constants/skillOntologyConstants.js.

export const TASK_TYPE = {
  AI_EVALUATE: "AI_EVALUATE",
  JD_PARSE: "JD_PARSE",
  RESUME_PARSE: "RESUME_PARSE",
};

export const TASK_TYPE_LABELS = {
  AI_EVALUATE: "AI Evaluate",
  JD_PARSE: "JD Parse",
  RESUME_PARSE: "Resume Parse",
};

export const TASK_TYPE_FILTER_OPTIONS = [
  { label: "All Task Types", value: "All" },
  { label: TASK_TYPE_LABELS.AI_EVALUATE, value: TASK_TYPE.AI_EVALUATE },
  { label: TASK_TYPE_LABELS.JD_PARSE, value: TASK_TYPE.JD_PARSE },
  { label: TASK_TYPE_LABELS.RESUME_PARSE, value: TASK_TYPE.RESUME_PARSE },
];

export const TASK_TYPE_FORM_OPTIONS = [
  { label: TASK_TYPE_LABELS.AI_EVALUATE, value: TASK_TYPE.AI_EVALUATE },
  { label: TASK_TYPE_LABELS.JD_PARSE, value: TASK_TYPE.JD_PARSE },
  { label: TASK_TYPE_LABELS.RESUME_PARSE, value: TASK_TYPE.RESUME_PARSE },
];

export const PROMPT_TEMPLATE_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};

export const STATUS_FILTER_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Active", value: PROMPT_TEMPLATE_STATUS.ACTIVE },
  { label: "Inactive", value: PROMPT_TEMPLATE_STATUS.INACTIVE },
];

export const STATUS_FORM_OPTIONS = [
  { label: "Active", value: PROMPT_TEMPLATE_STATUS.ACTIVE },
  { label: "Inactive", value: PROMPT_TEMPLATE_STATUS.INACTIVE },
];

export const SORTABLE_FIELDS = {
  TASK_TYPE: "task_type",
  UPDATED_AT: "updated_at",
  CREATED_AT: "created_at",
};

export const PROMPT_TEMPLATE_PAGE_SIZE = 10;

export const PROMPT_NAME_MAX_LENGTH = 150;
export const PROMPT_TEMPLATE_MIN_LENGTH = 20;
export const PROMPT_TEMPLATE_MAX_LENGTH = 50000;
export const NOTES_MAX_LENGTH = 1000;

// Blank/default shape for the Create/Edit Prompt Template form.
export const EMPTY_PROMPT_TEMPLATE_FORM = {
  name: "",
  taskType: "",
  promptTemplate: "",
  notes: "",
  status: PROMPT_TEMPLATE_STATUS.ACTIVE,
};
