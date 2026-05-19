export const CHANGE_TYPE_CONFIG = {
  ADDED_TO_SPRINT: {
    label:      "Added to sprint",
    bgColor:    "bg-green-50",
    textColor:  "text-green-700",
    borderColor:"border-green-200",
  },
  REMOVED_FROM_SPRINT: {
    label:      "Removed from sprint",
    bgColor:    "bg-red-50",
    textColor:  "text-red-600",
    borderColor:"border-red-200",
  },
  STORY_POINTS_CHANGED: {
    label:      "Story points changed",
    bgColor:    "bg-indigo-50",
    textColor:  "text-indigo-700",
    borderColor:"border-indigo-200",
  },
  STATUS_CHANGED_TO_DONE: {
    label:      "Done",
    bgColor:    "bg-green-50",
    textColor:  "text-green-700",
    borderColor:"border-green-200",
  },
  STATUS_REOPENED: {
    label:      "Reopened",
    bgColor:    "bg-amber-50",
    textColor:  "text-amber-700",
    borderColor:"border-amber-200",
  },
};

export function getChangeTypeConfig(changeType) {
  return CHANGE_TYPE_CONFIG[changeType] ?? {
    label:      changeType,
    bgColor:    "bg-slate-50",
    textColor:  "text-slate-600",
    borderColor:"border-slate-200",
  };
}

export function formatPointsDelta(delta) {
  if (delta === null || delta === undefined || delta === 0) return "0";
  return delta > 0 ? `+${delta} pts` : `${delta} pts`;
}

export function getDeltaColor(delta) {
  if (!delta || delta === 0) return "text-slate-500";
  return delta > 0 ? "text-green-600" : "text-red-600";
}

export function computeScopeSummary(scopeChanges) {
  let totalAdded   = 0;
  let totalRemoved = 0;
  let totalChanges = scopeChanges.length;

  scopeChanges.forEach((s) => {
    if (s.pointsDelta > 0) totalAdded   += s.pointsDelta;
    if (s.pointsDelta < 0) totalRemoved += Math.abs(s.pointsDelta);
  });

  return {
    totalAdded,
    totalRemoved,
    netChange: totalAdded - totalRemoved,
    totalChanges,
  };
}