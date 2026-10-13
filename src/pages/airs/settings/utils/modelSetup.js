// Per-purpose model setup for an AI provider — mirrors the backend rules in
// Ai_Hiring_Module/app/services/llm/model_selection.py so the form can flag a
// problem before Check. The backend re-validates on Check and Save.

export const USAGE = { EXTRACTION: "EXTRACTION", EVALUATION: "EVALUATION", BOTH: "BOTH" };

export const USAGE_OPTIONS = [
  { value: USAGE.BOTH, label: "Both", hint: "Parsing and AI evaluation" },
  { value: USAGE.EXTRACTION, label: "Extraction", hint: "JD and resume parsing" },
  { value: USAGE.EVALUATION, label: "Evaluation", hint: "AI evaluation" },
];

export const USAGE_LABEL = Object.fromEntries(USAGE_OPTIONS.map((o) => [o.value, o.label]));

export const MAX_MODELS = 3;

const key = (name) => (name || "").trim().toLowerCase();

let nextId = 0;
const newId = () => `m${++nextId}`;

export const emptyAssignment = (usage = USAGE.BOTH) => ({ id: newId(), usage, modelName: "", fallbackModelName: "" });

// A saved row -> editable assignments. Rows from before per-purpose models
// carry only model_name, which means one model for Both.
export const assignmentsFromRow = (row) => {
  const models = row?.models?.length ? row.models : row?.model_name ? [{ usage: USAGE.BOTH, model_name: row.model_name }] : [];
  return models.map((m) => ({
    id: newId(),
    usage: m.usage,
    modelName: m.model_name || "",
    fallbackModelName: m.fallback_model_name || "",
  }));
};

export const toRequestModels = (assignments) =>
  assignments.map((a) => ({
    usage: a.usage,
    model_name: a.modelName.trim(),
    fallback_model_name: a.fallbackModelName.trim() || null,
  }));

// The purpose a newly added row should start with - whichever still isn't
// handled by its own model.
export const nextUsage = (assignments) => {
  const used = new Set(assignments.map((a) => a.usage));
  if (used.has(USAGE.BOTH) && used.size === 1) return USAGE.EVALUATION;
  return [USAGE.EXTRACTION, USAGE.EVALUATION, USAGE.BOTH].find((u) => !used.has(u)) || USAGE.BOTH;
};

// First problem with the setup, or "" when it can be checked.
export const validateModelSetup = (assignments) => {
  if (!assignments.length) return "Add at least one model.";
  if (assignments.length > MAX_MODELS) return `A provider can have at most ${MAX_MODELS} models.`;

  const usages = new Set();
  const models = new Map();
  for (const a of assignments) {
    const label = USAGE_LABEL[a.usage];
    if (!label) return "Choose what each model is used for: Extraction, Evaluation or Both.";
    if (!a.modelName.trim()) return `Select a model for ${label}.`;
    if (usages.has(a.usage)) return `Only one model can be used for ${label}.`;
    usages.add(a.usage);
    if (models.has(key(a.modelName))) {
      return `${a.modelName.trim()} is already used for ${models.get(key(a.modelName))}. Use one model set to Both instead of adding it twice.`;
    }
    models.set(key(a.modelName), label);
    if (a.fallbackModelName.trim() && key(a.fallbackModelName) === key(a.modelName)) {
      return `The backup model for ${label} must be different from its main model.`;
    }
  }
  if (usages.has(USAGE.BOTH) && usages.has(USAGE.EXTRACTION) && usages.has(USAGE.EVALUATION)) {
    return "The Both model would never be used, because Extraction and Evaluation each have their own model. Remove one of the three.";
  }
  for (const purpose of [USAGE.EXTRACTION, USAGE.EVALUATION]) {
    if (!usages.has(purpose) && !usages.has(USAGE.BOTH)) {
      return `Nothing handles ${USAGE_LABEL[purpose]}. Add a model for it, or set a model to Both.`;
    }
  }
  return "";
};

// The purpose (EXTRACTION / EVALUATION) nothing handles yet, or null -
// lets the form offer a one-click "Add Evaluation model" fix.
export const missingPurpose = (assignments) => {
  const usages = new Set(assignments.map((a) => a.usage));
  if (usages.has(USAGE.BOTH)) return null;
  return [USAGE.EVALUATION, USAGE.EXTRACTION].find((p) => !usages.has(p)) || null;
};

// "Extraction · gemini-lite (backup: gemini-flash)" lines for the table / banner.
export const describeModels = (row) =>
  (row?.models?.length ? row.models : [{ usage: USAGE.BOTH, model_name: row?.model_name }])
    .filter((m) => m.model_name)
    .map((m) => ({
      usage: m.usage,
      label: USAGE_LABEL[m.usage] || m.usage,
      model: m.model_name,
      backup: m.fallback_model_name || null,
    }));
