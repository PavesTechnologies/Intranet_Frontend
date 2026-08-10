import { formatDateTime, numberOr, textOrDash } from "./candidateDataUtils";

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
        label: "Deterministic",
        score: numberOr(data.deterministic_score, 0),
        weight: deterministicWeight,
      },
      {
        key: "semantic",
        label: "Semantic",
        score: numberOr(data.semantic_score, 0),
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
