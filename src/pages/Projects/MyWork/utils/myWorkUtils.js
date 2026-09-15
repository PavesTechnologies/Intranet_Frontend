// src/pages/Projects/MyWork/utils/myWorkUtils.js

// ── Type config ───────────────────────────────────────────────────────────────
export const TYPE_CONFIG = {
  TASK: {
    label: "Task",
    color: "text-blue-700",
    bg:    "bg-blue-50",
    border:"border-blue-200",
    dot:   "bg-blue-500",
  },
  STORY: {
    label: "Story",
    color: "text-emerald-700",
    bg:    "bg-emerald-50",
    border:"border-emerald-200",
    dot:   "bg-emerald-500",
  },
  BUG: {
    label: "Bug",
    color: "text-red-700",
    bg:    "bg-red-50",
    border:"border-red-200",
    dot:   "bg-red-500",
  },
  TEST_RUN: {
    label: "Run",
    color: "text-violet-700",
    bg:    "bg-violet-50",
    border:"border-violet-200",
    dot:   "bg-violet-500",
  },
  TEST_CASE: {
    label: "Case",
    color: "text-purple-700",
    bg:    "bg-purple-50",
    border:"border-purple-200",
    dot:   "bg-purple-500",
  },
};

// ── Priority config ───────────────────────────────────────────────────────────
export const PRIORITY_CONFIG = {
  CRITICAL: { label: "Critical", color: "text-red-700",    bg: "bg-red-100"    },
  HIGH:     { label: "High",     color: "text-orange-700", bg: "bg-orange-100" },
  MEDIUM:   { label: "Medium",   color: "text-amber-700",  bg: "bg-amber-100"  },
  LOW:      { label: "Low",      color: "text-slate-600",  bg: "bg-slate-100"  },
};

// ── Bug statuses (enum-based, not project-specific) ───────────────────────────
export const BUG_STATUSES = [
  { name: "NEW",               label: "New"              },
  { name: "OPEN",              label: "Open"             },
  { name: "IN_PROGRESS",       label: "In Progress"      },
  { name: "FIXED",             label: "Fixed"            },
  { name: "READY_FOR_RETEST",  label: "Ready for Retest" },
  { name: "CLOSED",            label: "Closed"           },
  { name: "REOPENED",          label: "Reopened"         },
  { name: "WON_T_FIX",        label: "Won't Fix"        },
];

// ── Closed status names — mirrors backend isClosedStatus logic ────────────────
export const DONE_STATUS_NAMES = ["done", "closed", "complete", "resolved"];

export const isDoneStatus = (statusName) => {
  if (!statusName) return false;
  const lower = statusName.toLowerCase();
  return DONE_STATUS_NAMES.some((s) => lower.includes(s));
};

// ── Due date formatting ───────────────────────────────────────────────────────
export const formatDueDate = (dueDate) => {
  if (!dueDate) return null;
  const due   = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const diff = Math.floor((due - today) / (1000 * 60 * 60 * 24));

  if (diff < 0)  return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff <= 7)  return `Due in ${diff}d`;
  return `Due ${due.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
};

export const dueDateColor = (urgency) => {
  if (urgency === "OVERDUE")      return "text-red-600 font-medium";
  if (urgency === "DUE_TODAY")    return "text-orange-600 font-medium";
  if (urgency === "DUE_THIS_WEEK") return "text-amber-600";
  return "text-slate-400";
};

// ── Stale item detection (5+ days in-progress with no update) ─────────────────
export const isStale = (item) => {
  if (!item.updatedAt) return false;
  const statusLower = (item.statusName || "").toLowerCase();
  if (!statusLower.includes("progress")) return false;
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(item.updatedAt)) / (1000 * 60 * 60 * 24)
  );
  return daysSinceUpdate >= 5;
};

// ── Client-side filtering ─────────────────────────────────────────────────────
// Applies to both `data.projects` (assignee-scoped items, pre-grouped by
// project) and `data.project_MANAGERItems` (a flat list — every item in a
// project this user manages, regardless of assignee) so the chip/project/
// type/priority filters behave the same in both "As Member" and "As Project
// Manager" view.
export const applyFilters = (data, { selectedProjects, selectedTypes, selectedPriorities, activeChip }) => {
  if (!data) return data;

  const chipUrgencyMap = {
    overdue:     "OVERDUE",
    dueToday:    "DUE_TODAY",
    dueThisWeek: "DUE_THIS_WEEK",
    blocked:     "BLOCKED",
  };
  const urgency = activeChip ? chipUrgencyMap[activeChip] : null;

  const itemMatches = (item) => {
    if (urgency) {
      const ok = urgency === "BLOCKED"
        ? (item.statusName || "").toLowerCase().includes("block")
        : item.urgency === urgency;
      if (!ok) return false;
    }
    if (selectedProjects.length > 0 && !selectedProjects.includes(item.projectId)) return false;
    if (selectedTypes.length > 0 && !selectedTypes.includes(item.type)) return false;
    if (selectedPriorities.length > 0 && !selectedPriorities.includes(item.priority)) return false;
    return true;
  };

  const filteredProjects = (data.projects || [])
    .map((group) => ({ ...group, items: group.items.filter(itemMatches) }))
    .filter((group) => group.items.length > 0);

  const filteredManagerItems = (data.project_MANAGERItems || []).filter(itemMatches);

  return { ...data, projects: filteredProjects, project_MANAGERItems: filteredManagerItems };
};

// ── Group the flat manager-scoped item list by project ────────────────────────
// `data.project_MANAGERItems` isn't pre-grouped like `data.projects` is, so
// build the same { projectId, projectName, urgencyFlag, overdueCount,
// dueTodayCount, items } shape ProjectGroup expects.
export const groupManagerItems = (items) => {
  const byProject = new Map();
  (items || []).forEach((item) => {
    const key = item.projectId;
    if (!byProject.has(key)) {
      byProject.set(key, {
        projectId:   item.projectId,
        projectName: item.projectName,
        items:       [],
      });
    }
    byProject.get(key).items.push(item);
  });

  return Array.from(byProject.values()).map((group) => {
    const overdueCount  = group.items.filter((i) => i.urgency === "OVERDUE").length;
    const dueTodayCount = group.items.filter((i) => i.urgency === "DUE_TODAY").length;
    const urgencyFlag   = overdueCount > 0 ? "OVERDUE" : dueTodayCount > 0 ? "DUE_TODAY" : "NONE";
    return { ...group, urgencyFlag, overdueCount, dueTodayCount };
  });
};