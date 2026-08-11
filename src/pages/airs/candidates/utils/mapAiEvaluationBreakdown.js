// Adapts the raw GET /airs/campaign-candidates/{campaign_candidate_id}/ai-evaluation
// response into the shape the AI Evaluation tab renders. Field names are kept
// exactly as returned by the backend — only grouped/defaulted so the UI never
// has to null-check nested paths.
import { arr, numberOr } from "./candidateDataUtils";

export function mapAiEvaluationBreakdown(raw) {
  const data = raw?.data ?? raw ?? null;
  const breakdown = data?.ai_evaluation_breakdown ?? data;
  if (!breakdown) return null;
  const responseJson = breakdown.ai_response_json ?? {};

  return {
    campaignCandidateId: breakdown.campaign_candidate_id ?? null,
    status: breakdown.ai_evaluation_status ?? breakdown.status ?? null,
    effectiveScore: numberOr(breakdown.effective_ai_score ?? breakdown.effective_score ?? responseJson.scores?.overall_score, 0),
    confidence: breakdown.ai_confidence ?? breakdown.confidence ?? responseJson.confidence_score,
    recommendation: breakdown.ai_recommendation ?? breakdown.recommendation ?? responseJson.recommendation ?? null,
    scores: responseJson.scores ?? breakdown.scores ?? {},
    strengths: arr(breakdown.ai_strengths ?? breakdown.strengths ?? responseJson.strengths),
    weaknesses: arr(breakdown.ai_weaknesses ?? breakdown.weaknesses ?? responseJson.gaps),
    raw: breakdown,
  };
}
