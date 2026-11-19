import React, { useEffect } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorState from "@/pages/airs/skill-ontology/components/ErrorState";
import useAiEvaluation from "../../../hooks/useAiEvaluation";
import AiSummaryCard from "./components/AiSummaryCard";
import AiInsightsCard from "./components/AiInsightsCard";

// AI Review Score tab — GET /airs/campaign-candidates/{campaign_candidate_id}/ai-evaluation.
export default function AiEvaluationTab({ candidate, onLayerFailure }) {
  const { breakdown, failure, loading, error, refetch } = useAiEvaluation(candidate?.id);

  // Optional: lets a host page (PipelineCandidateScorecardPage) flag/retry a
  // dead-lettered layer from this tab's own fresh response.
  useEffect(() => {
    if (!loading && !error) onLayerFailure?.("ai", failure);
  }, [loading, error, failure, onLayerFailure]);

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <LoadingSpinner text="Loading AI review..." />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load AI review"
        message="We couldn't load this candidate's AI review result. Please try again."
        onRetry={refetch}
      />
    );
  }

  if (!breakdown) {
    return <ErrorState title="No data available" message="No AI review result found for this candidate." />;
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
