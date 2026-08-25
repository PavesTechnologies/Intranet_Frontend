// Adapts the raw GET /airs/campaign-candidates/{campaign_candidate_id}/semantic
// response into the shape the Relevance Score tab renders. Field names are kept
// exactly as returned by the backend — only grouped/defaulted so the UI never
// has to null-check nested paths.
import { arr } from "./candidateDataUtils";

export function mapSemanticScoreBreakdown(raw) {
  const data = raw?.data ?? raw ?? null;
  const breakdown = data?.semantic_score_breakdown ?? null;
  if (!breakdown) return null;

  return {
    summary: breakdown.summary ?? {},
    overallSimilarity: breakdown.overall_similarity,
    semanticPassed: breakdown.semantic_passed,
    semanticThreshold: breakdown.semantic_threshold,
    matchingSkills: arr(breakdown.matching_skills),
    missingSkills: arr(breakdown.missing_skills),
    matchedKeywords: arr(breakdown.matched_keywords),
    semanticExplanation: breakdown.semantic_explanation ?? null,
    raw: breakdown,
  };
}
