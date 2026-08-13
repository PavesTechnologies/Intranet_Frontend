import React, { useState, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LoadingSpinner from "@/components/LoadingSpinner";
import useCandidateDetail from "../hooks/useCandidateDetail";
import CandidateHeader from "./components/CandidateHeader";
import CandidateTabs from "./components/CandidateTabs";
import ErrorState from "../../skill-ontology/components/ErrorState";
import CandidateOverridePanel from "../../campaigns/components/CandidateOverridePanel";
import CandidateNotesPanel from "../../campaigns/components/CandidateNotesPanel";
import { useAuth } from "../../../../contexts/AuthContext";

const SummaryTab = lazy(() => import("./tabs/Summary/SummaryTab"));
const ResumeTab = lazy(() => import("./tabs/Resume/ResumeTab"));
const DeterministicScoreTab = lazy(() => import("./tabs/Deterministic/DeterministicScoreTab"));
const SemanticScoreTab = lazy(() => import("./tabs/Semantic/SemanticScoreTab"));
const AiEvaluationTab = lazy(() => import("./tabs/AiEvaluation/AiEvaluationTab"));
const InterviewTab = lazy(() => import("./tabs/Interview/InterviewTab"));
const FinalStatusTab = lazy(() => import("./tabs/FinalStatus/FinalStatusTab"));

const TABS = [
  { id: "summary", label: "Summary", Component: SummaryTab },
  { id: "resume", label: "Resume", Component: ResumeTab },
  { id: "deterministic", label: "Deterministic Score", Component: DeterministicScoreTab },
  { id: "semantic", label: "Semantic Score", Component: SemanticScoreTab },
  { id: "ai", label: "AI Evaluation Score", Component: AiEvaluationTab },
  { id: "interview", label: "Interview", Component: InterviewTab },
  { id: "finalStatus", label: "Final Status", Component: FinalStatusTab },
];

export default function CandidateScorePage() {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const { candidate, loading, error, refetch } = useCandidateDetail(candidateId);
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const { user } = useAuth();

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
          onRetry={() => navigate("/airs/candidates")}
        />
      </div>
    );
  }

  const ActiveTabComponent = TABS.find((t) => t.id === activeTab).Component;

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <CandidateHeader candidate={candidate} onBack={() => navigate(-1)} />

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <CandidateTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

        <div className="p-5">
          <Suspense fallback={null}>
            <ActiveTabComponent candidate={candidate} />
          </Suspense>
        </div>
      </div>

      {/* M11-E04 — actions on the candidate, alongside the read-only scorecard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <CandidateOverridePanel candidate={candidate} onChanged={refetch} />
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <CandidateNotesPanel
            campaignCandidateId={candidate.id}
            currentUserId={user?.user_id || user?.id}
          />
        </div>
      </div>
    </div>
  );
}
