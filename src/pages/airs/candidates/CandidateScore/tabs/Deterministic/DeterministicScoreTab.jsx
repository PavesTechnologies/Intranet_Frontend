import React, { useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorState from "@/pages/airs/skill-ontology/components/ErrorState";
import useDeterministicScore from "../../../hooks/useDeterministicScore";
import SummaryCard from "./components/SummaryCard";
import SkillsTabNav from "./components/SkillsTabNav";
import SkillsTable from "./components/SkillsTable";
import MissingSkillsList from "./components/MissingSkillsList";
import AdditionalSkillsList from "./components/AdditionalSkillsList";
import PaginatedSkillsSection from "./components/PaginatedSkillsSection";
import ValidationSection from "./components/ValidationSection";
import ScoreCalculation from "./components/ScoreCalculation";
import ConfigurationCard from "./components/ConfigurationCard";

// Deterministic Score tab — GET /airs/campaign-candidates/{campaign_candidate_id}/deterministic.
export default function DeterministicScoreTab({ candidate }) {
  const { breakdown, loading, error, refetch } = useDeterministicScore(candidate?.id);
  const [skillsTab, setSkillsTab] = useState("mandatory");

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <LoadingSpinner text="Loading deterministic score..." />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load deterministic score"
        message="We couldn't load this candidate's deterministic score breakdown. Please try again."
        onRetry={refetch}
      />
    );
  }

  if (!breakdown) {
    return <ErrorState title="No data available" message="No deterministic score breakdown found for this candidate." />;
  }

  return (
    <div className="space-y-5">
      <SummaryCard summary={breakdown.summary} />

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <SkillsTabNav
          activeTab={skillsTab}
          onChange={setSkillsTab}
          counts={{
            mandatory: breakdown.mandatorySkills.length,
            preferred: breakdown.preferredSkills.length,
            missing: breakdown.missingMandatorySkills.length,
            additional: breakdown.additionalCandidateSkills.length,
          }}
        />
        <div className="mt-4">
          {skillsTab === "mandatory" && (
            <PaginatedSkillsSection items={breakdown.mandatorySkills}>
              {(pageItems) => <SkillsTable items={pageItems} variant="mandatory" />}
            </PaginatedSkillsSection>
          )}
          {skillsTab === "preferred" && (
            <PaginatedSkillsSection items={breakdown.preferredSkills}>
              {(pageItems) => <SkillsTable items={pageItems} variant="preferred" />}
            </PaginatedSkillsSection>
          )}
          {skillsTab === "missing" && (
            <PaginatedSkillsSection items={breakdown.missingMandatorySkills}>
              {(pageItems) => <MissingSkillsList items={pageItems} />}
            </PaginatedSkillsSection>
          )}
          {skillsTab === "additional" && (
            <PaginatedSkillsSection items={breakdown.additionalCandidateSkills}>
              {(pageItems) => <AdditionalSkillsList items={pageItems} />}
            </PaginatedSkillsSection>
          )}
        </div>
      </div>

      <ValidationSection
        experienceValidation={breakdown.experienceValidation}
        educationValidation={breakdown.educationValidation}
      />

      <ScoreCalculation scoreCalculation={breakdown.scoreCalculation} configuration={breakdown.configuration} />

      <ConfigurationCard configuration={breakdown.configuration} />
    </div>
  );
}
