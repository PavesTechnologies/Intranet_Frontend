import { formatDateTime, numberOr, textOrDash } from "./candidateDataUtils";

// deterministic_score and ai_evaluation_score come back on a 0-100 scale, but
// semantic_score is the raw 0-1 cosine similarity (the Relevance tab renders it
// as `overall_similarity * 100`). Left alone it shows up here as "0.9" next to
// two scores reading "85" — same card, two different scales. Anything at or
// below 1 is therefore read as a fraction and scaled up, so all three
// components are percentages by the time they reach the UI.
function asPercentScore(value) {
  const score = numberOr(value, 0);
  return score > 0 && score <= 1 ? score * 100 : score;
}

export function mapCompositeScoreBreakdown(raw) {
  const data = raw?.data ?? raw ?? null;
  if (!data) return null;

  const deterministicWeight = numberOr(data.weight_deterministic, 0);
  const semanticWeight = numberOr(data.weight_semantic, 0);
  const aiWeight = numberOr(data.weight_ai, 0);

  return {
    compositeScore: numberOr(data.composite_score, 0),
    rankingStatus: textOrDash(data.ranking_status),
    formulaVersion: textOrDash(data.formula_version),
    computedAt: formatDateTime(data.composite_score_computed_at),
    components: [
      {
        key: "deterministic",
        label: "Requirements",
        score: numberOr(data.deterministic_score, 0),
        weight: deterministicWeight,
      },
      {
        key: "semantic",
        label: "Relevance",
        score: asPercentScore(data.semantic_score),
        weight: semanticWeight,
      },
      {
        key: "ai",
        label: "AI Evaluation",
        score: numberOr(data.ai_evaluation_score, 0),
        weight: aiWeight,
      },
    ],
    formulaText: `Composite = Deterministic ${formatWeight(deterministicWeight)} + Semantic ${formatWeight(
      semanticWeight
    )} + AI ${formatWeight(aiWeight)}`,
    raw: data,
  };
}

function formatWeight(value) {
  const weight = numberOr(value, 0);
  return `${Math.round((weight <= 1 ? weight * 100 : weight) * 100) / 100}%`;
}
