// Adapts the raw GET /airs/campaign-candidates/{campaign_candidate_id} response
// into the shape the Candidate Scorecard (header, Summary tab, Deterministic
// Score tab) already renders. No scores or validation results are computed
// here — everything is read directly from the backend response.
import { isEmpty, textOrDash, numberOr, arr, initialsFromName } from "./candidateDataUtils";

// Shared row shape consumed by HierarchyMatchResults' SkillTable — mirrors the
// M07-E01/S05 score_breakdown item contract (jd_skill_name, match_type, etc.).
function mapSkillRow(row = {}, mandatory) {
  return {
    jdSkillName: textOrDash(row.jd_skill_name ?? row.jdSkillName),
    mandatory,
    matchType: row.match_type ?? row.matchType ?? "MISSING",
    matchedCandidateSkill: row.matched_candidate_skill ?? row.matchedCandidateSkill ?? null,
    jdWeight: numberOr(row.jd_weight ?? row.jdWeight, 0),
    candidateScoringWeight: numberOr(row.candidate_scoring_weight ?? row.candidateScoringWeight, 0),
    hierarchyMultiplier: numberOr(row.hierarchy_multiplier ?? row.hierarchyMultiplier, 0),
    skillContribution: numberOr(row.skill_contribution ?? row.skillContribution, 0),
  };
}

function mapAdditionalSkill(row = {}) {
  return {
    canonicalName: textOrDash(row.canonical_name ?? row.skill_name ?? row.name ?? row.canonicalName),
    matchTier: row.match_tier ?? row.matchTier ?? "UNRECOGNIZED",
    scoringWeight: numberOr(row.scoring_weight ?? row.weight ?? row.scoringWeight, 0),
  };
}

export function mapCandidateScoreDetail(raw) {
  if (!raw) return null;
  const data = raw.data ?? raw;
  const det = data.deterministic_score_breakdown ?? {};

  const mandatoryRows = arr(det.mandatory_skills).map((r) => mapSkillRow(r, true));
  const preferredRows = arr(det.preferred_skills).map((r) => mapSkillRow(r, false));
  // Falls back to a combined hierarchy_matches list only if the backend
  // didn't split skills into mandatory_skills/preferred_skills.
  const hierarchyRows =
    mandatoryRows.length || preferredRows.length
      ? [...mandatoryRows, ...preferredRows]
      : arr(det.hierarchy_matches).map((r) => mapSkillRow(r, !!(r.mandatory ?? r.is_mandatory)));

  const mandatoryItems = hierarchyRows.filter((r) => r.mandatory);
  const noVerifiedSkills = mandatoryItems.length > 0 && mandatoryItems.every((r) => r.matchType === "MISSING");

  const experienceValidationRaw = det.experience_validation ?? {};
  const educationValidationRaw = det.education_validation ?? {};
  const scoreCalculationRaw = det.score_calculation ?? {};

  const missingSkillNames = mandatoryItems.filter((r) => r.matchType === "MISSING").map((r) => r.jdSkillName);
  const matchedSkillNames = hierarchyRows.filter((r) => r.matchType !== "MISSING").map((r) => r.jdSkillName);

  return {
    id: data.campaign_candidate_id ?? data.id ?? null,
    name: textOrDash(data.candidate_name),
    initials: initialsFromName(data.candidate_name),
    role: textOrDash(data.current_designation),
    experience: numberOr(data.experience, 0),
    location: textOrDash(data.location),
    createdAt: textOrDash(data.created_at),
    status: textOrDash(data.status),
    email: textOrDash(data.email),
    phone: textOrDash(data.phone),
    department: textOrDash(data.department),
    company: textOrDash(data.company),
    education: textOrDash(data.education),
    notice: textOrDash(data.notice_period),
    salary: textOrDash(data.expected_salary),
    stage: textOrDash(data.pipeline_stage),
    decisionType: data.decision_type ?? null,
    decisionSource: data.decision_source ?? null,
    decisionReason: data.decision_reason ?? null,
    decisionAt: data.decision_at ?? null,
    // M11-E04-S02 — the override panel needs the raw values, not "-", to decide
    // between offering "apply override" and "clear override".
    pipelineStage: data.pipeline_stage ?? null,
    hrOverride: data.hr_override ?? false,
    overrideReason: data.override_reason || null,
    deterministic: numberOr(data.deterministic_score, 0),
    semantic: numberOr(data.semantic_score, 0),
    ats: numberOr(data.ai_ats_score, 0),
    composite: numberOr(data.composite_score, 0),
    aiCandidateSummary: isEmpty(data.ai_candidate_summary) ? null : data.ai_candidate_summary,

    deterministicThreshold: numberOr(det.threshold, 0),
    scoreBreakdown: {
      items: hierarchyRows,
      noVerifiedSkills,
      score: numberOr(det.overall_score, 0),
      status: det.status ?? "FAILED",
      mandatoryCoveragePct: numberOr(det.mandatory_coverage_pct, 0),
      preferredSkillBonus: numberOr(preferredRows.reduce((sum, r) => sum + r.skillContribution, 0)),
    },
    manualSkills: [],
    additionalSkills: arr(det.additional_candidate_skills).map(mapAdditionalSkill),
    experienceValidation: {
      requiredExperience: numberOr(
        experienceValidationRaw.required_experience_years ?? experienceValidationRaw.required_experience,
        0
      ),
      candidateExperience: numberOr(
        experienceValidationRaw.candidate_experience_years ?? experienceValidationRaw.candidate_experience,
        numberOr(data.experience, 0)
      ),
      toleranceYears: numberOr(experienceValidationRaw.tolerance_years, 0),
      result: experienceValidationRaw.result ?? "FAIL",
    },
    educationValidation: {
      requiredDegree: textOrDash(educationValidationRaw.required_degree),
      candidateDegree: textOrDash(educationValidationRaw.candidate_degree ?? data.education),
      equivalentExperienceApplied: !!educationValidationRaw.equivalent_experience_applied,
      result: educationValidationRaw.result ?? "FAIL",
    },
    scoreCalculation: {
      skillsScore: numberOr(scoreCalculationRaw.skills_score, 0),
      experienceScore: numberOr(scoreCalculationRaw.experience_score, 0),
      educationScore: numberOr(scoreCalculationRaw.education_score, 0),
      finalScore: numberOr(scoreCalculationRaw.final_deterministic_score ?? scoreCalculationRaw.final_score, 0),
    },
    rawScoreBreakdown: det,

    // The Resume / Semantic / AI Evaluation / Final Status tabs are out of
    // scope for this change and remain on their own mock data generators —
    // these fields only keep those still-mock tabs from crashing when they
    // read off the shared candidate record.
    matchedSkills: matchedSkillNames,
    missingSkills: missingSkillNames,
    risk: 0,
    starred: false,
    appliedOn: textOrDash(data.created_at),
    summary: isEmpty(data.ai_candidate_summary) ? "" : data.ai_candidate_summary,
    strengths: [],
    weaknesses: [],
    comments: [],
  };
}
