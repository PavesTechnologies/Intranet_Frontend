import React from "react";
import { Badge } from "../../../../components/ui/badge";
import Tooltip from "../../../../components/status/Tooltip";

// Match-type tones: EXACT green, CHILD light green, SIBLING amber, SEMANTIC
// orange, MISSING red — per the Hierarchy Match Results spec.
export const MATCH_TYPE_TONE = {
  EXACT: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CHILD: "bg-emerald-50 text-emerald-600 border-emerald-100",
  SIBLING: "bg-amber-50 text-amber-700 border-amber-100",
  SEMANTIC: "bg-orange-50 text-orange-700 border-orange-100",
  MISSING: "bg-rose-50 text-rose-700 border-rose-100",
};

export const MATCH_TYPE_TOOLTIP = {
  EXACT: "Exact skill match — 100% hierarchy weight.",
  CHILD: "Candidate skill is a child of the JD skill — 70% hierarchy weight.",
  SIBLING: "Candidate skill is a sibling in the taxonomy — 40% hierarchy weight.",
  SEMANTIC: "Matched via semantic/vector similarity — 20% hierarchy weight.",
  MISSING: "No hierarchy match found for this skill — 0% weight.",
};

export function renderMatchTypeBadge(matchType) {
  const tone = MATCH_TYPE_TONE[matchType] || MATCH_TYPE_TONE.MISSING;
  return (
    <Tooltip content={MATCH_TYPE_TOOLTIP[matchType] || ""}>
      <Badge className={`${tone} font-semibold px-2.5 py-1 text-[11px]`}>{matchType}</Badge>
    </Tooltip>
  );
}

export function formatWeightApplied(weight) {
  return `${Math.round(weight * 100)}%`;
}

export function renderDeterministicStatusBadge(status) {
  const tone =
    status === "PASSED"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : "bg-rose-100 text-rose-800 border-rose-200";
  return <Badge className={`${tone} font-bold px-3 py-1 text-xs`}>{status}</Badge>;
}
