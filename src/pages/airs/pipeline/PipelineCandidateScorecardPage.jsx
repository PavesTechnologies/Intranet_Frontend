import React, { useState, lazy, Suspense } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import LoadingSpinner from "../../../components/LoadingSpinner";
import CandidateHeader from "../candidates/CandidateScore/components/CandidateHeader";
import CandidateTabs from "../candidates/CandidateScore/components/CandidateTabs";
import ErrorState from "../skill-ontology/components/ErrorState";
import useParsedResumeCandidate from "./hooks/useParsedResumeCandidate";
// import { MOCK_CANDIDATES } from "../candidates/mock/candidateMockData";
// import { mapMockCandidateForScorecard } from "./utils/mapMockCandidateForScorecard";

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
// Scorecard header/tabs as /airs/candidates/:candidateId, sourced from the
// resume parsed-json endpoint (the campaign-candidates detail endpoint isn't
// implemented on the backend). `location.state.resume` is the Resume Upload
// History row (candidate name/email/etc.) forwarded on navigation, since
// parsed-json only returns resume/parsing data, not candidate profile fields.
export default function PipelineCandidateScorecardPage() {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const resumeRow = location.state?.resume;
  const fallback = {
    name: resumeRow?.candidate_full_name,
    email: resumeRow?.candidate_email,
    createdAt: resumeRow?.created_at,
  };
  const { candidate, loading, error } = useParsedResumeCandidate(candidateId, fallback);
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  // Came from Resume Upload History (resumeRow present) → back should return
  // there instead of the Pipeline Board, which this page otherwise defaults to.
  const backTo = resumeRow ? "/airs/resume-intake" : "/airs/pipeline";

  if (loading) {
    return (
      <div className="p-8 bg-[#F8FAFC] min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading candidate scorecard..." />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="p-8 bg-[#F8FAFC] min-h-screen">
        <ErrorState
          title="Candidate not found"
          message={
            error
              ? "We couldn't load this candidate. Please try again."
              : "We couldn't find this candidate. They may have been removed."
          }
          onRetry={() => navigate(backTo)}
        />
      </div>
    );
  }

  const ActiveTabComponent = TABS.find((t) => t.id === activeTab).Component;

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <CandidateHeader candidate={candidate} onBack={() => navigate(backTo)} />

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
