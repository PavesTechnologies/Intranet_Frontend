import React from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorState from "@/pages/airs/skill-ontology/components/ErrorState";
import useAiEvaluation from "../../../hooks/useAiEvaluation";
import AiSummaryCard from "./components/AiSummaryCard";
import AiInsightsCard from "./components/AiInsightsCard";

// AI Evaluation Score tab — GET /airs/campaign-candidates/{campaign_candidate_id}/ai-evaluation.
export default function AiEvaluationTab({ candidate }) {
  const { breakdown, loading, error, refetch } = useAiEvaluation(candidate?.id);

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <LoadingSpinner text="Loading AI evaluation..." />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load AI evaluation"
        message="We couldn't load this candidate's AI evaluation result. Please try again."
        onRetry={refetch}
      />
    );
  }

  if (!breakdown) {
    return <ErrorState title="No data available" message="No AI evaluation result found for this candidate." />;
  }

  return (
    <div className="space-y-4">
      <AiSummaryCard
        status={breakdown.status}
        effectiveScore={breakdown.effectiveScore}
        confidence={breakdown.confidence}
        recommendation={breakdown.recommendation}
        scores={breakdown.scores}
      />

      <AiInsightsCard strengths={breakdown.strengths} weaknesses={breakdown.weaknesses} />
    </div>
  );
}
