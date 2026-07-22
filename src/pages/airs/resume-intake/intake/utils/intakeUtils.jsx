import React from "react";
import { Badge } from "../../../../../components/ui/badge";
import { PARSE_STATUS_BADGE_TONE, PARSE_STATUS_LABEL, getConfidenceTier } from "../constants/intakeConstants";

export function renderParseStatusBadge(status) {
  const tone = PARSE_STATUS_BADGE_TONE[status] || PARSE_STATUS_BADGE_TONE.PENDING;
  return <Badge className={`${tone} font-semibold px-2.5 py-1 text-xs`}>{PARSE_STATUS_LABEL[status] || status}</Badge>;
}

export function renderConfidenceBadge(score) {
  const tier = getConfidenceTier(score);
  return (
    <Badge className={`${tier.tone} font-semibold px-2.5 py-1 text-xs`}>
      {tier.pct !== undefined ? `${tier.pct}% confidence` : "Confidence unavailable"}
    </Badge>
  );
}

export function formatDuration(ms) {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatDateRange(startDate, endDate, isCurrent) {
  if (isCurrent) return `${startDate} — Present`;
  return `${startDate} — ${endDate || "—"}`;
}

export function formatExperienceYears(years) {
  if (years === null || years === undefined) return null;
  return `${years} year${years === 1 ? "" : "s"}`;
}

export function computeSkillCoverage(candidateSkills) {
  if (!candidateSkills || candidateSkills.length === 0) return { pct: null, verified: 0, total: 0 };
  const verified = candidateSkills.filter((s) => s.status === "AUTO_VERIFIED").length;
  return { pct: Math.round((verified / candidateSkills.length) * 100), verified, total: candidateSkills.length };
}
