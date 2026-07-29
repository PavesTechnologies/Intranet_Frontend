import React, { useState, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LoadingSpinner from "../../../components/LoadingSpinner";
import CandidateHeader from "../candidates/CandidateScore/components/CandidateHeader";
import CandidateTabs from "../candidates/CandidateScore/components/CandidateTabs";
import ErrorState from "../skill-ontology/components/ErrorState";
import { MOCK_CANDIDATES } from "../candidates/mock/candidateMockData";
import { mapMockCandidateForScorecard } from "./utils/mapMockCandidateForScorecard";

const SummaryTab = lazy(() => import("../candidates/CandidateScore/tabs/Summary/SummaryTab"));
const ResumeTab = lazy(() => import("../candidates/CandidateScore/tabs/Resume/ResumeTab"));
const DeterministicScoreTab = lazy(() => import("../candidates/CandidateScore/tabs/Deterministic/DeterministicScoreTab"));
const SemanticScoreTab = lazy(() => import("../candidates/CandidateScore/tabs/Semantic/SemanticScoreTab"));
const AiEvaluationTab = lazy(() => import("../candidates/CandidateScore/tabs/AiEvaluation/AiEvaluationTab"));
const FinalStatusTab = lazy(() => import("../candidates/CandidateScore/tabs/FinalStatus/FinalStatusTab"));

const TABS = [
  { id: "summary", label: "Summary", Component: SummaryTab },
  { id: "resume", label: "Resume", Component: ResumeTab },
  { id: "deterministic", label: "Deterministic Score", Component: DeterministicScoreTab },
  { id: "semantic", label: "Semantic Score", Component: SemanticScoreTab },
  { id: "ai", label: "AI Evaluation Score", Component: AiEvaluationTab },
  { id: "finalStatus", label: "Final Status", Component: FinalStatusTab },
];

// Pipeline Board's candidate detail page — reuses the same Candidate
// Scorecard header/tabs as /airs/candidates/:candidateId, but sourced from
// the Pipeline Board's mock candidate pool instead of the live backend.
export default function PipelineCandidateScorecardPage() {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  const mockCandidate = MOCK_CANDIDATES.find((c) => c.id === candidateId) || null;
  const candidate = mockCandidate ? mapMockCandidateForScorecard(mockCandidate) : null;

  if (!candidate) {
    return (
      <div className="p-8 bg-[#F8FAFC] min-h-screen">
        <ErrorState
          title="Candidate not found"
          message="We couldn't find this candidate. They may have been removed."
          onRetry={() => navigate("/airs/pipeline")}
        />
      </div>
    );
  }

  const ActiveTabComponent = TABS.find((t) => t.id === activeTab).Component;

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <CandidateHeader candidate={candidate} onBack={() => navigate("/airs/pipeline")} />

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <CandidateTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

        <div className="p-5">
          <Suspense fallback={<LoadingSpinner text="Loading tab..." />}>
            <ActiveTabComponent candidate={candidate} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
