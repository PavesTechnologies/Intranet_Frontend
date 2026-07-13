import React from "react";
import { Badge } from "../../../../components/ui/badge";
import { SKILL_SOURCE_LABELS } from "../constants/skillOntologyConstants";

// Hand-rolled status pill, matching the style convention used by the newest
// real-backend AIRS pages (src/pages/airs/pages/Campaigns.jsx / CampaignDetails.jsx)
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

// "confidence" holds the skill's verification status (VERIFIED/UNVERIFIED),
// not a numeric score — rendered via the shared Badge component per spec.
const VERIFICATION_BADGE_TONE = {
  VERIFIED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  UNVERIFIED: "bg-amber-50 text-amber-700 border-amber-100",
};

export function renderVerificationBadge(confidence) {
  const tone = VERIFICATION_BADGE_TONE[confidence] || VERIFICATION_BADGE_TONE.UNVERIFIED;
  return (
    <Badge className={`${tone} font-semibold px-2.5 py-0.5 text-[11px]`}>
      {confidence === "VERIFIED" ? "Verified" : "Unverified"}
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
  if (values.confidence !== "VERIFIED" && values.confidence !== "UNVERIFIED") {
    errors.confidence = "Please select a verification status.";
  }
  if (values.status !== "ACTIVE" && values.status !== "INACTIVE") {
    errors.status = "Please select a status.";
  }
  return errors;
}
