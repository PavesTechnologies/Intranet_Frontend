import React from "react";
import { Badge } from "../../../../components/ui/badge";
import Tooltip from "../../../../components/status/Tooltip";

// Match-type tones: EXACT green, CHILD light green, GRANDCHILD teal, SIBLING
// amber, SEMANTIC orange, MISSING red — per the Hierarchy Match Results spec.
export const MATCH_TYPE_TONE = {
  EXACT: "bg-emerald-100 text-emerald-800 border-emerald-200",
  HIERARCHY: "bg-teal-50 text-teal-700 border-teal-100",
  CHILD: "bg-emerald-50 text-emerald-600 border-emerald-100",
  GRANDCHILD: "bg-teal-50 text-teal-700 border-teal-100",
  SIBLING: "bg-amber-50 text-amber-700 border-amber-100",
  SEMANTIC: "bg-orange-50 text-orange-700 border-orange-100",
  MISSING: "bg-rose-50 text-rose-700 border-rose-100",
};

export const MATCH_TYPE_TOOLTIP = {
  EXACT: "Exact skill match — 100% hierarchy weight.",
  HIERARCHY: "Matched via a hierarchy (parent/child) relationship in the skill taxonomy.",
  CHILD: "Candidate skill is a child of the JD skill — 70% hierarchy weight.",
  GRANDCHILD: "Candidate skill is a grandchild of the JD skill — 50% hierarchy weight.",
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

// "Normalisation Discount" (candidate_scoring_weight) is a distinct column
// from Hierarchy Multiplier — it shows how much the raw match was discounted
// for being a partial/fuzzy/vector-normalized skill match rather than an
// exact/alias one.
export function formatNormalisationDiscount(weight) {
  if (!weight) return "—";
  if (weight >= 1) return "No discount";
  return `-${Math.round((1 - weight) * 100)}%`;
}

export function renderDeterministicStatusBadge(status) {
  const tone =
    status === "PASSED"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : "bg-rose-100 text-rose-800 border-rose-200";
  return <Badge className={`${tone} font-bold px-3 py-1 text-xs`}>{status}</Badge>;
}

const AI_EVALUATION_STATUS_TONE = {
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  FAILED: "bg-rose-100 text-rose-800 border-rose-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-100",
  PENDING: "bg-amber-50 text-amber-700 border-amber-100",
};

export function renderAiEvaluationStatusBadge(status) {
  const tone = AI_EVALUATION_STATUS_TONE[status] || "bg-slate-100 text-slate-600 border-slate-200";
  return <Badge className={`${tone} font-bold px-3 py-1 text-xs`}>{status || "UNKNOWN"}</Badge>;
}

const AI_RECOMMENDATION_TONE = {
  SHORTLIST: "bg-emerald-100 text-emerald-800 border-emerald-200",
  INTERVIEW: "bg-emerald-50 text-emerald-700 border-emerald-100",
  MAYBE: "bg-amber-50 text-amber-700 border-amber-100",
  HOLD: "bg-amber-50 text-amber-700 border-amber-100",
  REJECT: "bg-rose-100 text-rose-800 border-rose-200",
};

export function renderAiRecommendationBadge(recommendation) {
  if (!recommendation) {
    return <Badge className="bg-slate-100 text-slate-600 border-slate-200 font-bold px-3 py-1 text-xs">-</Badge>;
  }
  const tone = AI_RECOMMENDATION_TONE[recommendation] || "bg-slate-100 text-slate-600 border-slate-200";
  return <Badge className={`${tone} font-bold px-3 py-1 text-xs`}>{recommendation.replace(/_/g, " ")}</Badge>;
}

const MATCH_TIER_TONE = {
  RELATED: "bg-blue-50 text-blue-700 border-blue-100",
  ADJACENT: "bg-indigo-50 text-indigo-700 border-indigo-100",
  UNRECOGNIZED: "bg-slate-100 text-slate-600 border-slate-200",
};

export function renderMatchTierBadge(matchTier) {
  const tone = MATCH_TIER_TONE[matchTier] || MATCH_TIER_TONE.UNRECOGNIZED;
  return <Badge className={`${tone} font-semibold px-2.5 py-1 text-[11px]`}>{matchTier}</Badge>;
}
