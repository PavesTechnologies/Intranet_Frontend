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
//
// Also embeddable as a popup (variant="modal") — e.g. BulkJobDetailModal opens
// it in a stacked Modal instead of navigating away, so `candidateId`/`resumeRow`/
// `onBack` can be passed directly instead of coming from the route.
export default function PipelineCandidateScorecardPage({
  candidateId: candidateIdProp,
  resumeRow: resumeRowProp,
  onBack: onBackProp,
  variant = "page",
}) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const candidateId = candidateIdProp ?? params.candidateId;
  const resumeRow = resumeRowProp ?? location.state?.resume;
  const fallback = {
    name: resumeRow?.candidate_full_name,
    email: resumeRow?.candidate_email,
    createdAt: resumeRow?.created_at,
  };
  const { candidate, loading, error, refetch } = useParsedResumeCandidate(candidateId, fallback);
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const isModal = variant === "modal";

  // Prefer real browser "back" so this returns to wherever the user actually
  // came from — a specific Resume Intake tab (history/processing/bulk-batches),
  // the Pipeline Board, etc. — rather than a single hardcoded guess. Only fall
  // back to a guessed route when there's no in-app history to go back to
  // (e.g. this page was opened directly via URL/refresh, where location.key
  // is react-router's "default" sentinel). Not used when embedded as a modal —
  // onBackProp (closing the popup) takes over instead.
  const canGoBack = location.key !== "default";
  const fallbackBackTo = resumeRow ? "/airs/resume-intake" : "/airs/pipeline";
  const handleBack =
    onBackProp ??
    (() => {
      if (canGoBack) navigate(-1);
      else navigate(fallbackBackTo);
    });

  if (loading) {
    return (
      <div className={isModal ? "flex items-center justify-center py-12" : "p-8 bg-[#F8FAFC] min-h-screen flex items-center justify-center"}>
        <LoadingSpinner text="Loading candidate scorecard..." />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className={isModal ? undefined : "p-8 bg-[#F8FAFC] min-h-screen"}>
        <ErrorState
          title="Candidate not found"
          message={
            error
              ? "We couldn't load this candidate. Please try again."
              : "We couldn't find this candidate. They may have been removed."
          }
          onRetry={handleBack}
        />
      </div>
    );
  }

  const ActiveTabComponent = TABS.find((t) => t.id === activeTab).Component;

  return (
    <div className={isModal ? "text-slate-900 font-sans" : "p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans"}>
      <CandidateHeader candidate={candidate} onBack={handleBack} />

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <CandidateTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

        <div className="p-5">
          <Suspense fallback={<LoadingSpinner text="Loading tab..." />}>
            <ActiveTabComponent candidate={candidate} onExpired={refetch} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
