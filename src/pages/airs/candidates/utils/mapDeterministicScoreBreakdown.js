// Adapts the raw GET /airs/campaign-candidates/{campaign_candidate_id}/deterministic
// response into the shape the Requirements Score tab renders. Field names are
// kept exactly as returned by the backend — only grouped/defaulted so the UI
// never has to null-check nested paths.
import { arr } from "./candidateDataUtils";

export function mapDeterministicScoreBreakdown(raw) {
  const data = raw?.data ?? raw ?? null;
  const breakdown = data?.deterministic_score_breakdown ?? null;
  if (!breakdown) return null;

  return {
    summary: breakdown.summary ?? {},
    mandatorySkills: arr(breakdown.mandatory_skills),
    preferredSkills: arr(breakdown.preferred_skills),
    missingMandatorySkills: arr(breakdown.missing_mandatory_skills),
    additionalCandidateSkills: arr(breakdown.additional_candidate_skills),
    hierarchyMatches: arr(breakdown.hierarchy_matches),
    experienceValidation: breakdown.experience_validation ?? null,
    educationValidation: breakdown.education_validation ?? null,
    scoreCalculation: breakdown.score_calculation ?? null,
    configuration: breakdown.configuration ?? null,
    raw: breakdown,
  };
}
