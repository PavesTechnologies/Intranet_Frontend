// Adapts the raw GET /airs/campaign-candidates/{campaign_candidate_id}/ai-evaluation
// response into the shape the AI Evaluation tab renders. Field names are kept
// exactly as returned by the backend — only grouped/defaulted so the UI never
// has to null-check nested paths.
import { arr, numberOr } from "./candidateDataUtils";

export function mapAiEvaluationBreakdown(raw) {
  const data = raw?.data ?? raw ?? null;
  const breakdown = data?.ai_evaluation_breakdown ?? null;
  if (!breakdown) return null;

  return {
    status: breakdown.status ?? null,
    effectiveScore: numberOr(breakdown.effective_score, 0),
    confidence: breakdown.confidence,
    recommendation: breakdown.recommendation ?? null,
    scores: breakdown.scores ?? {},
    strengths: arr(breakdown.strengths),
    weaknesses: arr(breakdown.weaknesses),
    raw: breakdown,
  };
}
