import React from "react";
import { CheckCircle2, XCircle, Tags, Sparkles } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorState from "@/pages/airs/skill-ontology/components/ErrorState";
import AccordionSection from "../../components/AccordionSection";
import useSemanticScore from "../../../hooks/useSemanticScore";
import SemanticSummaryCard from "./components/SemanticSummaryCard";
import SkillChipGroup from "./components/SkillChipGroup";
import { textOrDash } from "../../../utils/candidateDataUtils";

// Relevance Score tab — GET /airs/campaign-candidates/{campaign_candidate_id}/semantic.
export default function SemanticScoreTab({ candidate }) {
  const { breakdown, loading, error, refetch } = useSemanticScore(candidate?.id);

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <LoadingSpinner text="Loading relevance score..." />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load relevance score"
        message="We couldn't load this candidate's relevance score breakdown. Please try again."
        onRetry={refetch}
      />
    );
  }

  if (!breakdown) {
    return <ErrorState title="No data available" message="No relevance score breakdown found for this candidate." />;
  }

  return (
    <div className="space-y-4">
      <SemanticSummaryCard
        summary={breakdown.summary}
        semanticPassed={breakdown.semanticPassed}
        overallSimilarity={breakdown.overallSimilarity}
      />

      <div className="bg-white border border-slate-200 rounded-xl px-4">
        <AccordionSection icon={CheckCircle2} title="Matching Skills" count={breakdown.matchingSkills?.length ?? 0}>
          <SkillChipGroup items={breakdown.matchingSkills} tone="matching" paginate={false} />
        </AccordionSection>

        <AccordionSection icon={XCircle} title="Missing Skills" count={breakdown.missingSkills?.length ?? 0}>
          <SkillChipGroup items={breakdown.missingSkills} tone="missing" />
        </AccordionSection>

        <AccordionSection icon={Tags} title="Matched Keywords" count={breakdown.matchedKeywords?.length ?? 0} defaultOpen={false}>
          <SkillChipGroup items={breakdown.matchedKeywords} tone="neutral" paginate={false} />
        </AccordionSection>

        <AccordionSection icon={Sparkles} title="Semantic Explanation" collapsible={false}>
          <p className="text-[12.5px] leading-relaxed text-slate-700">{textOrDash(breakdown.semanticExplanation)}</p>
        </AccordionSection>
      </div>
    </div>
  );
}
