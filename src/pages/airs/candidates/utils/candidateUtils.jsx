import React from "react";
import { Badge } from "../../../../components/ui/badge";
import { CANDIDATE_STAGE_BADGE_TONE } from "../constants/candidateConstants";

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

export function renderStageBadge(stage) {
  const tone = CANDIDATE_STAGE_BADGE_TONE[stage] || CANDIDATE_STAGE_BADGE_TONE.Screening;
  return <Badge className={`${tone} font-semibold px-2.5 py-1 text-xs`}>{stage}</Badge>;
}

const riskTone = (risk) => {
  if (risk > 60) return "bg-rose-50 text-rose-700 border-rose-100";
  if (risk > 35) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-emerald-50 text-emerald-700 border-emerald-100";
};

export function renderRiskBadge(risk) {
  return <Badge className={`${riskTone(risk)} font-semibold px-2.5 py-1 text-xs`}>{risk}</Badge>;
}
