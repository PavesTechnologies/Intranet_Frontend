// Adapts the mapped candidate record (from GET /airs/campaign-candidates/{id},
// candidate.deterministic_score_breakdown) into the shape the Deterministic
// Score tab renders. Nothing here is computed — every value comes straight
// from the backend's score_breakdown response.
export function getDeterministicMock(candidate) {
  const sb = candidate.scoreBreakdown;

  return {
    scoreCard: {
      overallScore: sb.score,
      status: sb.status,
      threshold: candidate.deterministicThreshold,
      coverage: sb.mandatoryCoveragePct,
    },
    hierarchy: sb,
    manualSkills: candidate.manualSkills,
    additionalSkills: candidate.additionalSkills,
    experienceValidation: candidate.experienceValidation,
    educationValidation: candidate.educationValidation,
    scoreCalculation: candidate.scoreCalculation,
    // Raw backend deterministic_score_breakdown payload — including fields
    // (e.g. configuration) that don't have a dedicated section elsewhere in
    // this tab — surfaced as-is for the expandable JSON view.
    rawJson: {
      candidate_id: candidate.id,
      deterministic_score_breakdown: candidate.rawScoreBreakdown,
    },
  };
}
