import React from "react";
import { Badge } from "../../../../components/ui/badge";
import { SKILL_SOURCE_LABELS } from "../constants/skillOntologyConstants";

// Hand-rolled status pill, matching the style convention used by the newest
// real-backend AIRS pages (src/pages/airs/campaigns/Campaigns.jsx / CampaignDetails.jsx)
// rather than the shared Badge component — kept visually consistent with its
// sidebar neighbor.
const STATUS_PILL = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-100",
  INACTIVE: "bg-slate-100 text-slate-500 border-slate-200",
};

export function renderStatusPill(status) {
  const cls = STATUS_PILL[status] || STATUS_PILL.INACTIVE;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
      {status === "ACTIVE" ? "Active" : "Inactive"}
    </span>
  );
}

// "confidence" holds the skill's verification status (verified/unverified,
// lowercase per backend convention), not a numeric score — rendered via the
// shared Badge component per spec. Normalized before comparison since data
// may arrive with inconsistent casing.
const VERIFICATION_BADGE_TONE = {
  verified: "bg-emerald-50 text-emerald-700 border-emerald-100",
  unverified: "bg-amber-50 text-amber-700 border-amber-100",
};

export function renderVerificationBadge(confidence) {
  const normalized = confidence?.toLowerCase();
  const tone = VERIFICATION_BADGE_TONE[normalized] || VERIFICATION_BADGE_TONE.unverified;
  return (
    <Badge className={`${tone} font-semibold px-2.5 py-0.5 text-[11px]`}>
      {normalized === "verified" ? "Verified" : "Unverified"}
    </Badge>
  );
}

export function getSourceLabel(source) {
  return SKILL_SOURCE_LABELS[source] || source;
}

const EMBEDDING_PILL = {
  GENERATED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  PENDING: "bg-amber-50 text-amber-700 border-amber-100",
  OUTDATED: "bg-rose-50 text-rose-700 border-rose-100",
};

const EMBEDDING_LABEL = {
  GENERATED: "Generated",
  PENDING: "Pending",
  OUTDATED: "Outdated",
};

export function renderEmbeddingPill(embeddingStatus) {
  const cls = EMBEDDING_PILL[embeddingStatus] || EMBEDDING_PILL.PENDING;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
      {EMBEDDING_LABEL[embeddingStatus] || embeddingStatus}
    </span>
  );
}

export function formatDate(isoDate) {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

export function isDuplicateSkillName(name, existingSkills, excludeSkillId) {
  const term = name.trim().toLowerCase();
  if (!term) return false;
  return existingSkills.some(
    (s) => s.id !== excludeSkillId && s.canonicalName.trim().toLowerCase() === term
  );
}

export function findAliasConflict(alias, existingSkills, currentSkillId) {
  const term = alias.trim().toLowerCase();
  if (!term) return null;
  for (const skill of existingSkills) {
    if (skill.id === currentSkillId) continue;
    if (skill.canonicalName.trim().toLowerCase() === term) return { skill, reason: "canonical" };
    const aliasHit = (skill.aliases || []).find((a) => a.trim().toLowerCase() === term);
    if (aliasHit) return { skill, reason: "alias" };
  }
  return null;
}

export function validateSkillForm(values, existingSkills = [], excludeSkillId) {
  const errors = {};
  if (!values.canonicalName.trim()) errors.canonicalName = "Canonical name is required.";
  else if (isDuplicateSkillName(values.canonicalName, existingSkills, excludeSkillId)) {
    errors.canonicalName = "A skill with this canonical name already exists.";
  }
  if (!values.category) errors.category = "Please select a category.";
  const confidenceNormalized = values.confidence?.toLowerCase();
  if (confidenceNormalized !== "verified" && confidenceNormalized !== "unverified") {
    errors.confidence = "Please select a verification status.";
  }
  if (values.status !== "ACTIVE" && values.status !== "INACTIVE") {
    errors.status = "Please select a status.";
  }
  return errors;
}
