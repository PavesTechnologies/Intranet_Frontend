import React from "react";
import HierarchyMatchResults from "../../../components/detail/HierarchyMatchResults";
import { getDeterministicMock } from "./deterministicMock";
import ScoreCard from "./components/ScoreCard";
import ValidationSection from "./components/ValidationSection";
import ScoreCalculation from "./components/ScoreCalculation";
import ScoreBreakdownJsonViewer from "./components/ScoreBreakdownJsonViewer";

// M07 — Deterministic Score tab. Sections B–E (Hierarchy Match Results,
// Mandatory/Preferred Skills tables, Additional Candidate Skills) reuse the
// existing HierarchyMatchResults component as-is rather than re-implementing
// the same score_breakdown rendering twice.
export default function DeterministicScoreTab({ candidate }) {
  const deterministic = getDeterministicMock(candidate);

  return (
    <div className="space-y-4">
      <ScoreCard scoreCard={deterministic.scoreCard} />

      <HierarchyMatchResults
        scoreBreakdown={deterministic.hierarchy}
        manualSkills={deterministic.manualSkills}
        additionalSkills={deterministic.additionalSkills}
      />

      <ValidationSection
        experienceValidation={deterministic.experienceValidation}
        educationValidation={deterministic.educationValidation}
      />

      <ScoreCalculation scoreCalculation={deterministic.scoreCalculation} />

      <ScoreBreakdownJsonViewer json={deterministic.rawJson} />
    </div>
  );
}
