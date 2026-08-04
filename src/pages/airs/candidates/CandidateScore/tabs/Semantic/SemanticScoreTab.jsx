import React from "react";
import { Sparkles } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorState from "@/pages/airs/skill-ontology/components/ErrorState";
import useSemanticScore from "../../../hooks/useSemanticScore";
import SemanticSummaryCard from "./components/SemanticSummaryCard";
import SimilarityBar from "./components/SimilarityBar";
import SkillChipGroup from "./components/SkillChipGroup";
import { textOrDash } from "../../../utils/candidateDataUtils";

// Semantic Score tab — GET /airs/campaign-candidates/{campaign_candidate_id}/semantic.
export default function SemanticScoreTab({ candidate }) {
  const { breakdown, loading, error, refetch } = useSemanticScore(candidate?.id);

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <LoadingSpinner text="Loading semantic score..." />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load semantic score"
        message="We couldn't load this candidate's semantic score breakdown. Please try again."
        onRetry={refetch}
      />
    );
  }

  if (!breakdown) {
    return <ErrorState title="No data available" message="No semantic score breakdown found for this candidate." />;
  }

  return (
    <div className="space-y-4">
      <SemanticSummaryCard summary={breakdown.summary} semanticPassed={breakdown.semanticPassed} />

      <SimilarityBar value={breakdown.overallSimilarity} />

      <SkillChipGroup title="Matching Skills" items={breakdown.matchingSkills} tone="matching" />

      <SkillChipGroup title="Missing Skills" items={breakdown.missingSkills} tone="missing" />

      <SkillChipGroup title="Matched Keywords" items={breakdown.matchedKeywords} tone="neutral" />

      <div className="p-4 rounded-xl bg-indigo-50">
        <div className="flex items-center gap-1.5 text-[12px] font-bold mb-1.5 text-indigo-700">
          <Sparkles size={13} /> Semantic explanation
        </div>
        <p className="text-[12.5px] leading-relaxed text-slate-900">{textOrDash(breakdown.semanticExplanation)}</p>
      </div>
    </div>
  );
}
