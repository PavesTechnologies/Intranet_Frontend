// Mock data for the Final Status tab (M10) — composite outcome and pipeline
// status. Mock only; rank is computed against the shared mock candidate pool
// so it stays meaningful without a real backend ranking service.
import { MOCK_CANDIDATES } from "../../../mock/candidateMockData";

const STAGE_ORDER = ["Applied", "Screening", "Shortlisted", "Interview", "Selected"];

function buildTimeline(candidate) {
  if (candidate.stage === "Rejected") {
    return [
      { stage: "Applied", date: candidate.appliedOn, status: "done" },
      { stage: "Screening", date: candidate.appliedOn, status: "done" },
      { stage: "Rejected", date: candidate.appliedOn, status: "rejected" },
    ];
  }
  const activeIndex = STAGE_ORDER.indexOf(candidate.stage);
  return STAGE_ORDER.map((stage, i) => ({
    stage,
    date: i <= activeIndex ? candidate.appliedOn : null,
    status: i < activeIndex ? "done" : i === activeIndex ? "current" : "upcoming",
  }));
}

function recruiterDecisionFor(stage) {
  switch (stage) {
    case "Selected":
      return "Extend Offer";
    case "Rejected":
      return "Do Not Proceed";
    case "Interview":
      return "Awaiting Interview Feedback";
    case "Shortlisted":
      return "Move to Interview";
    default:
      return "Pending Screening Review";
  }
}

// A candidate already at a terminal pipeline stage (Rejected/Selected) must
// resolve to the matching final recommendation — otherwise "Rejected" +
// "Shortlisted" could show on the same screen. Only in-flight stages fall
// back to the composite-score heuristic.
function recommendationFor(candidate) {
  if (candidate.stage === "Rejected") return "REJECTED";
  if (candidate.stage === "Selected") return "SHORTLISTED";
  if (candidate.composite >= 75) return "SHORTLISTED";
  if (candidate.composite >= 55) return "MANUAL_REVIEW";
  return "REJECTED";
}

export function getFinalStatusMock(candidate) {
  const ranked = [...MOCK_CANDIDATES].sort((a, b) => b.composite - a.composite);
  const rankIndex = ranked.findIndex((c) => c.id === candidate.id);

  const finalRecommendation = recommendationFor(candidate);

  const hiringRecommendation =
    candidate.stage === "Rejected"
      ? "Candidate has already been rejected in the pipeline — no further action recommended."
      : candidate.stage === "Selected"
      ? "Candidate has already been selected in the pipeline — proceed with offer formalities."
      : finalRecommendation === "SHORTLISTED"
      ? "Recommended for the next hiring round based on composite score and pipeline stage."
      : finalRecommendation === "MANUAL_REVIEW"
      ? "Composite score is borderline — recommend a manual recruiter review before proceeding."
      : "Composite score falls below the shortlisting bar — recommend rejection unless overridden by a recruiter.";

  return {
    compositeScore: candidate.composite,
    finalRank: rankIndex >= 0 ? `#${rankIndex + 1} of ${ranked.length}` : "Not ranked",
    pipelineStage: candidate.stage,
    recruiterDecision: recruiterDecisionFor(candidate.stage),
    statusTimeline: buildTimeline(candidate),
    deterministicResult: { score: candidate.scoreBreakdown.score, status: candidate.scoreBreakdown.status },
    semanticResult: { score: candidate.semantic, status: candidate.semantic >= 65 ? "PASSED" : "FAILED" },
    aiResult: { score: candidate.ats, status: candidate.ats >= 60 ? "PASSED" : "FAILED" },
    compositeFormula: "Composite = (Deterministic × 30%) + (Semantic × 40%) + (AI ATS × 30%)",
    finalRecommendation,
    hiringRecommendation,
  };
}
