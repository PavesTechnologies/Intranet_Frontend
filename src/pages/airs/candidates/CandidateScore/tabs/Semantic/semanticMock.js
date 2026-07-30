// Mock data for the Semantic Score tab (M08) — embedding-based similarity
// scoring. Mock only; shaped to mirror a realistic vector-search backend
// response (cosine similarity, embedding model, per-skill vector matches).
const EMBEDDING_THRESHOLD = 0.65;
const EMBEDDING_MODEL = "text-embedding-3-large";

function confidenceLabel(score) {
  if (score >= 80) return "HIGH";
  if (score >= 60) return "MEDIUM";
  return "LOW";
}

export function getSemanticMock(candidate) {
  const semanticScore = candidate.semantic;
  const pairedSkills = candidate.matchedSkills.length ? candidate.matchedSkills : ["General experience"];

  const topMatches = pairedSkills.slice(0, 5).map((skill, i) => ({
    jdSkill: skill,
    candidateSkill: skill,
    similarity: Math.max(0.55, Math.round((0.97 - i * 0.06) * 100) / 100),
  }));

  const vectorMatchDetails = topMatches.map((m) => ({
    jdSkill: m.jdSkill,
    candidateSkill: m.candidateSkill,
    cosineSimilarity: m.similarity,
    embeddingModel: EMBEDDING_MODEL,
    vectorDistance: Math.round((1 - m.similarity) * 1000) / 1000,
  }));

  const missingCount = candidate.missingSkills.length;
  const similarityBreakdown = {
    lexicalPct: Math.max(10, 40 - missingCount * 5),
    contextualPct: Math.min(60, 35 + missingCount * 2),
    semanticPct: Math.max(10, 25 - missingCount * 2),
  };

  const confidence = confidenceLabel(semanticScore);
  const passedThreshold = semanticScore / 100 >= EMBEDDING_THRESHOLD;

  return {
    semanticScore,
    embeddingThreshold: EMBEDDING_THRESHOLD,
    embeddingSimilarity: Math.round((semanticScore / 100) * 1000) / 1000,
    semanticConfidence: confidence,
    topMatches,
    vectorMatchDetails,
    similarityBreakdown,
    matchedSkills: candidate.matchedSkills,
    semanticExplanation: `Candidate resume embeddings were compared against the JD's skill and responsibility embeddings using cosine similarity. ${topMatches.length} strong vector matches were found${missingCount ? `, with ${missingCount} JD concept${missingCount === 1 ? "" : "s"} showing low similarity across all resume sections` : ""}.`,
    semanticRecommendation: passedThreshold
      ? "Semantic profile aligns well with the JD — proceed to composite scoring."
      : "Semantic similarity is below the configured threshold — recommend manual review before proceeding.",
  };
}
