// src/pages/Projects/Milestones/utils/milestoneUtils.js
// Display helpers and client-side validation. The backend re-validates every rule;
// these checks only give earlier, field-level feedback.

export const EXECUTION_STATUSES = ["PLANNED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"];
export const READINESS_VALUES = ["READY_FOR_BILLING", "NOT_READY", "NOT_BILLABLE"];

export const STATUS_META = {
  PLANNED: { label: "Planned", className: "bg-slate-100 text-slate-700 ring-slate-200" },
  IN_PROGRESS: { label: "In progress", className: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  ON_HOLD: { label: "On hold", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  COMPLETED: { label: "Completed", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  CANCELLED: { label: "Cancelled", className: "bg-rose-50 text-rose-700 ring-rose-200" },
};

export const READINESS_META = {
  READY_FOR_BILLING: { label: "Ready for billing", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  NOT_READY: { label: "Not ready", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  NOT_BILLABLE: { label: "Not billable", className: "bg-slate-100 text-slate-600 ring-slate-200" },
};

/** Verb shown on the button that moves a milestone into the given status. */
export const STATUS_ACTION_LABEL = {
  IN_PROGRESS: "Start",
  ON_HOLD: "Put on hold",
  CANCELLED: "Cancel milestone",
  PLANNED: "Move to planned",
};

/** Completed milestones are read-only. Falls back to status if the API predates `canEdit`. */
export const isEditable = (m) => (m?.canEdit ?? m?.executionStatus !== "COMPLETED") === true;

export const formatDate = (value) => {
  if (!value) return "—";
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

export const formatPercent = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(2).replace(/\.00$/, "")}%` : "—";
};

export const formatMoney = (amount, currency) => {
  if (amount === null || amount === undefined) return "—";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)}${currency ? ` ${currency}` : ""}`;
  }
};

/** Mirrors the backend preview: budget × % / 100, rounded half-up to 2 decimals. */
export const estimateAmount = (budget, percentage) => {
  const b = Number(budget);
  const p = Number(percentage);
  if (budget === null || budget === undefined || !Number.isFinite(b) || !Number.isFinite(p)) return null;
  return Math.round(((b * p) / 100 + Number.EPSILON) * 100) / 100;
};

export const todayIso = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

export const MAX_CODE_LENGTH = 50;

const pad3 = (n) => String(n).padStart(3, "0");

/**
 * Mirrors the backend's generator: `<PROJECTKEY>-M001`, counting from the
 * project-wide milestone total and skipping codes already taken (deletes leave
 * gaps, so count + 1 can collide).
 *
 * PREVIEW ONLY. The backend assigns the real code under a pessimistic project
 * lock, so this can drift if someone else creates a milestone in between. Never
 * submit it — send the code absent and read the assigned one back from the
 * create response.
 *
 * @param projectKey  project.projectKey, e.g. "pay"
 * @param count       milestones already in the project (summary.total)
 * @param existingCodes  codes already known on the client, for gap-skipping
 */
export const generateMilestoneCode = (projectKey, { count = 0, existingCodes = [] } = {}) => {
  const prefix = String(projectKey ?? "").trim().toUpperCase();
  if (!prefix) return "";

  const taken = new Set(existingCodes.filter(Boolean).map((c) => String(c).toUpperCase()));
  let next = (Number(count) || 0) + 1;
  let code;
  do {
    code = `${prefix}-M${pad3(next++)}`;
  } while (taken.has(code));
  return code;
};
const PERCENT_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

/** "2026-05-10T23:59:59" / Date → "2026-05-10". */
export const toIsoDate = (value) => {
  if (!value) return "";
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
};

/**
 * @param values form values
 * @param ctx { isEdit, availablePercentage, allocationLocked, startDateLocked, minStartDate,
 *              projectStartDate, projectEndDate }
 * @returns {Record<string,string>} field -> message
 */
export const validateMilestoneForm = (
  values,
  {
    isEdit,
    availablePercentage,
    allocationLocked,
    startDateLocked,
    minStartDate,
    projectStartDate,
    projectEndDate,
  }
) => {
  const errors = {};
  const name = values.name.trim();

  if (!name) errors.name = "Enter a milestone name.";
  else if (name.length > 200) errors.name = "Milestone name must be 200 characters or fewer.";

  if (!isEdit && values.milestoneCode.trim()) {
    if (values.milestoneCode.trim().length > 50) errors.milestoneCode = "Code must be 50 characters or fewer.";
    else if (!CODE_PATTERN.test(values.milestoneCode.trim()))
      errors.milestoneCode = "Use letters, digits, '-' or '_' only.";
  }

  if (values.description.length > 2000) errors.description = "Description must be 2000 characters or fewer.";

  const minStart = toIsoDate(minStartDate);
  const projectStart = toIsoDate(projectStartDate);
  const projectEnd = toIsoDate(projectEndDate);
  const start = toIsoDate(values.plannedStartDate);
  const due = toIsoDate(values.plannedDueDate);

  // Why the floor is what it is, so the message points at the rule the user actually hit.
  const tooEarly = (field) => {
    if (minStart === todayIso()) return `${field} can't be in the past.`;
    if (projectStart && minStart === projectStart)
      return `${field} can't be before the project start date (${formatDate(projectStart)}).`;
    return `${field} can't be before ${formatDate(minStart)}.`;
  };

  // A started milestone keeps the start date it ran with, bounds and all.
  if (startDateLocked) {
    // nothing to check — the field is read-only.
  } else if (!values.plannedStartDate) {
    errors.plannedStartDate = "Select a planned start date.";
  } else if (minStart && start < minStart) {
    errors.plannedStartDate = tooEarly("Start date");
  } else if (projectEnd && start > projectEnd) {
    errors.plannedStartDate = `Start date can't be after the project end date (${formatDate(projectEnd)}).`;
  }

  if (!values.plannedDueDate) {
    errors.plannedDueDate = "Select a planned due date.";
  } else if (start && due < start) {
    errors.plannedDueDate = "Due date can't be before the start date.";
  } else if (minStart && due < minStart) {
    errors.plannedDueDate = tooEarly("Due date");
  } else if (projectEnd && due > projectEnd) {
    errors.plannedDueDate = `Due date can't be after the project end date (${formatDate(projectEnd)}).`;
  }

  if (!allocationLocked) {
    const raw = String(values.allocationPercentage).trim();
    if (values.billable) {
      if (!raw) errors.allocationPercentage = "Enter the share of the project value for this milestone.";
      else if (!PERCENT_PATTERN.test(raw)) errors.allocationPercentage = "Use a number with up to 2 decimal places.";
      else {
        const pct = Number(raw);
        if (pct <= 0) errors.allocationPercentage = "Billable milestones need an allocation above 0%.";
        else if (pct > 100) errors.allocationPercentage = "Allocation can't exceed 100%.";
        else if (availablePercentage !== null && pct > availablePercentage + 1e-9)
          errors.allocationPercentage = `Only ${formatPercent(availablePercentage)} is left to allocate.`;
      }
    }
  }
  return errors;
};

/** Normalises the three PMS error shapes into a summary list and per-field messages. */
export const extractApiErrors = (error) => {
  const status = error?.response?.status;
  const data = error?.response?.data;
  if (status === 409) {
    return { summary: ["Someone else changed this milestone. Close the form, reload and try again."], fields: {} };
  }
  if (status === 403) {
    return { summary: [data?.message || "You don't have permission to manage milestones for this project."], fields: {} };
  }
  if (data?.errors && Array.isArray(data.errors)) return { summary: data.errors, fields: {} };
  if (data?.errors && typeof data.errors === "object") {
    return { summary: Object.values(data.errors), fields: data.errors };
  }
  return { summary: [data?.message || "Something went wrong. Please try again."], fields: {} };
};

export const firstApiError = (error) => extractApiErrors(error).summary[0];
