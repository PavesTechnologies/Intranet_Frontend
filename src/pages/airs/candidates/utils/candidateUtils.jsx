import React from "react";
import { AlertTriangle, UserCog } from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import {
  CANDIDATE_STAGE_BADGE_TONE,
  PIPELINE_STAGE_LABEL,
  PIPELINE_STAGE_BADGE_TONE,
  AI_RECOMMENDATION_BADGE_TONE,
  DECISION_TYPE_BADGE_TONE,
  DECISION_SOURCE_LABEL,
} from "../constants/candidateConstants";
import { DASH } from "./candidateDataUtils";

export function filterCandidates(candidates, { search = "", stage = "All" } = {}) {
  const term = search.trim().toLowerCase();
  return candidates.filter((c) => {
    const matchesSearch = !term || c.name.toLowerCase().includes(term) || c.role.toLowerCase().includes(term);
    const matchesStage = stage === "All" || c.stage === stage;
    return matchesSearch && matchesStage;
  });
}

export function sortCandidates(candidates, sortValue = "composite:desc") {
  const [field, dir] = sortValue.split(":");
  const mult = dir === "asc" ? 1 : -1;
  return [...candidates].sort((a, b) => (a[field] - b[field]) * mult);
}

export function paginate(items, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    totalPages,
    currentPage: current,
  };
}

export function computeCandidateStats(candidates) {
  const shortlisted = candidates.filter((c) => ["Shortlisted", "Interview", "Selected"].includes(c.stage)).length;
  const selected = candidates.filter((c) => c.stage === "Selected").length;
  const avgComposite = candidates.length
    ? Math.round(candidates.reduce((sum, c) => sum + c.composite, 0) / candidates.length)
    : 0;
  return { total: candidates.length, shortlisted, selected, avgComposite };
}

// `stage` comes straight off the real API as an UPPER_SNAKE_CASE enum
// (e.g. "HM_REVIEW"); PIPELINE_STAGE_* is checked first, falling back to the
// title-case CANDIDATE_STAGE_BADGE_TONE for any mock-data callers.
export function renderStageBadge(stage) {
  const key = String(stage || "").toUpperCase();
  const tone = PIPELINE_STAGE_BADGE_TONE[key] || CANDIDATE_STAGE_BADGE_TONE[stage] || CANDIDATE_STAGE_BADGE_TONE.Screening;
  const label = PIPELINE_STAGE_LABEL[key] || stage;
  return <Badge className={`${tone} font-semibold px-2.5 py-1 text-xs`}>{label}</Badge>;
}

const riskTone = (risk) => {
  if (risk > 60) return "bg-rose-50 text-rose-700 border-rose-100";
  if (risk > 35) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-emerald-50 text-emerald-700 border-emerald-100";
};

export function renderRiskBadge(risk) {
  if (risk === DASH || risk == null) {
    return <Badge className="bg-slate-100 text-slate-500 border-slate-200 font-semibold px-2.5 py-1 text-xs">—</Badge>;
  }
  return <Badge className={`${riskTone(risk)} font-semibold px-2.5 py-1 text-xs`}>{risk}</Badge>;
}

export function renderAiRecommendationBadge(recommendation) {
  if (!recommendation) return <span className="text-slate-400 text-xs">—</span>;
  const tone = AI_RECOMMENDATION_BADGE_TONE[recommendation] || "bg-slate-100 text-slate-600 border-slate-200";
  return <Badge className={`${tone} font-semibold px-2.5 py-1 text-xs`}>{recommendation}</Badge>;
}

// `decision_type` is null until a decision has actually been recorded for
// this candidate; decision_source/decision_reason surface as a tooltip
// rather than their own columns to keep the table scannable.
export function renderDecisionBadge(candidate) {
  const type = candidate.decisionType;
  if (!type) return <span className="text-slate-400 text-xs">—</span>;
  const tone = DECISION_TYPE_BADGE_TONE[type] || "bg-slate-100 text-slate-600 border-slate-200";
  const sourceLabel = candidate.decisionSource ? DECISION_SOURCE_LABEL[candidate.decisionSource] || candidate.decisionSource : "";
  const tooltip = candidate.decisionReason
    ? `${sourceLabel ? `${sourceLabel}: ` : ""}${candidate.decisionReason}`
    : sourceLabel || undefined;
  return (
    <Badge className={`${tone} font-semibold px-2.5 py-1 text-xs`} title={tooltip}>
      {type.replace(/_/g, " ")}
    </Badge>
  );
}

// is_fraud_flagged / hr_override are independent booleans, so both can show
// at once; renders a dash when neither applies rather than two empty icons.
export function renderFlags(candidate) {
  if (!candidate.isFraudFlagged && !candidate.hrOverride) {
    return <span className="text-slate-300 text-xs">—</span>;
  }
  return (
    <div className="flex items-center justify-center gap-1">
      {candidate.isFraudFlagged && (
        <span
          title="Flagged for fraud review"
          className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-rose-50 text-rose-600 border border-rose-100"
        >
          <AlertTriangle className="h-3 w-3" />
        </span>
      )}
      {candidate.hrOverride && (
        <span
          title="HR override applied"
          className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100"
        >
          <UserCog className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}
