// Mock data for the AI Evaluation Score tab (M09) — LLM-based ATS evaluation.
// Mock only; reuses the candidate's existing strengths/weaknesses/summary so
// the narrative stays consistent with the rest of the scorecard.
function confidenceLabel(score) {
  if (score >= 80) return "HIGH";
  if (score >= 55) return "MEDIUM";
  return "LOW";
}

function riskLevel(risk) {
  if (risk > 60) return "HIGH";
  if (risk > 35) return "MEDIUM";
  return "LOW";
}

function recommendationFor(atsScore) {
  if (atsScore >= 70) return "Strong Match — Proceed to Interview";
  if (atsScore >= 50) return "Moderate Match — Manual Review Recommended";
  return "Weak Match — Likely Reject";
}

export function getAiEvaluationMock(candidate) {
  const atsScore = candidate.ats;
  const riskFactors = [];
  if (candidate.missingSkills.length) riskFactors.push(`${candidate.missingSkills.length} mandatory skill(s) not evident in the resume`);
  if (candidate.risk > 60) riskFactors.push("Short average tenure across recent roles");
  if (!riskFactors.length) riskFactors.push("No material risk factors identified");

  return {
    atsScore,
    aiConfidence: confidenceLabel(atsScore),
    aiRecommendation: recommendationFor(atsScore),
    strengths: candidate.strengths,
    weaknesses: candidate.weaknesses,
    riskAnalysis: {
      riskScore: candidate.risk,
      riskLevel: riskLevel(candidate.risk),
      riskFactors,
    },
    resumeSummary: candidate.summary,
    improvementSuggestions: [
      "Quantify impact with metrics (%, $, time saved) for the most recent role.",
      candidate.missingSkills.length
        ? `Add measurable project experience covering: ${candidate.missingSkills.join(", ")}.`
        : "Highlight leadership or mentorship scope to strengthen seniority signals.",
      "Trim older, less relevant roles to keep the resume focused on the target profile.",
    ],
    keywordAnalysis: {
      matchedKeywords: candidate.matchedSkills,
      missingKeywords: candidate.missingSkills,
      keywordDensityPct: candidate.matchedSkills.length
        ? Math.round((candidate.matchedSkills.length / (candidate.matchedSkills.length + candidate.missingSkills.length)) * 1000) / 10
        : 0,
    },
    aiExplanation: `The AI model evaluated resume content, keyword alignment, and role progression against the JD. ATS score reflects ${candidate.matchedSkills.length} matched and ${candidate.missingSkills.length} missing keyword(s), combined with tenure and seniority signals.`,
  };
}
