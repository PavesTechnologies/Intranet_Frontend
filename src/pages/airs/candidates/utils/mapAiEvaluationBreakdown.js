// Adapts the raw GET /airs/campaign-candidates/{campaign_candidate_id}/ai-evaluation
// response into the shape the AI Evaluation Score tab renders. Field names are
// kept as close to the backend as possible — only grouped/defaulted so the UI
// never has to null-check nested paths.
import { arr } from "./candidateDataUtils";

export function mapAiEvaluationBreakdown(raw) {
  const data = raw?.data ?? raw ?? null;
  if (!data) return null;

  const scores = data.ai_response_json?.scores ?? {};

  return {
    campaignCandidateId: data.campaign_candidate_id,
    status: data.ai_evaluation_status,
    effectiveScore: data.effective_ai_score,
    confidence: data.ai_confidence,
    recommendation: data.ai_recommendation,
    strengths: arr(data.ai_strengths),
    weaknesses: arr(data.ai_weaknesses),
    scores: {
      technicalMatch: scores.technical_match,
      experienceMatch: scores.experience_match,
      educationMatch: scores.education_match,
      domainMatch: scores.domain_match,
      overallScore: scores.overall_score,
    },
    raw: data,
  };
}
