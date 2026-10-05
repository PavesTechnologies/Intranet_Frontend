import React, { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import LoadingSpinner from "@/components/LoadingSpinner";
import useParsedResumeCandidate from "../hooks/useParsedResumeCandidate";
import CandidateHeader from "./components/CandidateHeader";
import CandidateTabs from "./components/CandidateTabs";
import ErrorState from "../../skill-ontology/components/ErrorState";
import CandidateOverridePanel from "../../campaigns/components/CandidateOverridePanel";
import CandidateNotesPanel from "../../campaigns/components/CandidateNotesPanel";
import { exportScorecard } from "../../campaigns/services/exportService";
import Button from "../../../../components/Button/Button";
import { Download } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../../../contexts/AuthContext";
import { SCORE_LABELS } from "../../constants/scoreLabels";

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
  { id: "deterministic", label: SCORE_LABELS.deterministic, Component: DeterministicScoreTab },
  { id: "semantic", label: SCORE_LABELS.semantic, Component: SemanticScoreTab },
  { id: "ai", label: SCORE_LABELS.ai, Component: AiEvaluationTab },
  { id: "finalStatus", label: "Overall Score", Component: FinalStatusTab },
  { id: "interview", label: "Interview", Component: InterviewTab },
];

// Candidate Scorecard — sourced entirely from GET /resumes/candidate/
// {campaign_candidate_id}/parsed-json (see useParsedResumeCandidate), the
// same endpoint the Pipeline Board and Resume Upload History scorecards use.
// There's no separate GET /campaign-candidates/{id} detail call any more —
// that response now carries identity/contact/pipeline-stage/override/score
// fields directly. `fallback` is only whatever the caller already had on
// hand (a Candidates-tab row, a Pipeline card, an interview entry) passed
// via navigate(..., { state }), used to fill in anything a given response
// still leaves out and to paint instantly while the fetch is in flight.
export default function CandidateScorePage() {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const navCandidate = location.state?.candidate;
  const fallback = useMemo(() => ({
    name: navCandidate?.name ?? navCandidate?.candidate_name,
    email: navCandidate?.email,
    phone: navCandidate?.phone,
    location: navCandidate?.location,
    role: navCandidate?.role ?? navCandidate?.current_designation,
    createdAt: navCandidate?.createdAt ?? navCandidate?.created_at,
    status: navCandidate?.status,
    campaignCandidateId: navCandidate?.id ?? navCandidate?.campaign_candidate_id ?? candidateId,
    campaignId: navCandidate?.campaignId ?? location.state?.campaignId,
    stage: navCandidate?.stage ?? navCandidate?.pipeline_stage,
    hrOverride: navCandidate?.hrOverride ?? navCandidate?.hr_override,
    overrideReason: navCandidate?.overrideReason ?? navCandidate?.override_reason,
    decisionType: navCandidate?.decisionType ?? navCandidate?.decision_type,
    decisionSource: navCandidate?.decisionSource ?? navCandidate?.decision_source,
    decisionReason: navCandidate?.decisionReason ?? navCandidate?.decision_reason,
    decisionAt: navCandidate?.decisionAt ?? navCandidate?.decision_at,
    notice: navCandidate?.notice,
    salary: navCandidate?.salary,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [navCandidate, candidateId, location.state?.campaignId]);

  const { candidate: fetchedCandidate, loading, error, status, refetch } = useParsedResumeCandidate(candidateId, fallback);
  // Applying/clearing an HR override has no detail re-fetch to lean on —
  // the endpoint returns the resume parse, not a live candidate record —
  // so the known outcome is patched in directly instead.
  const [overridePatch, setOverridePatch] = useState(null);
  useEffect(() => { setOverridePatch(null); }, [candidateId]);
  const candidate = fetchedCandidate && overridePatch ? { ...fetchedCandidate, ...overridePatch } : fetchedCandidate;

  // Lets a caller (e.g. the Interview Calendar's event chips) deep-link
  // straight into a specific tab via ?tab=interview instead of always
  // landing on the default Summary tab. Read once on mount — this page
  // doesn't keep the URL in sync as the user switches tabs afterwards.
  const [activeTab, setActiveTab] = useState(() => {
    const requested = searchParams.get("tab");
    return TABS.some((t) => t.id === requested) ? requested : TABS[0].id;
  });
  const [exporting, setExporting] = useState(false);
  const { user, hasRole } = useAuth();
  const isHrAdmin = hasRole(["HR_ADMIN"]);

  if (loading) {
    return (
      <div className="p-8 bg-[#F8FAFC] min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading candidate scorecard..." />
      </div>
    );
  }

  if (error || !candidate) {
    const messageByStatus = {
      not_found: "No resume is linked to this candidate yet.",
      pending: "This candidate's resume is still being parsed. Check back shortly.",
      error: "We couldn't load this candidate. Please try again.",
    };
    return (
      <div className="p-8 bg-[#F8FAFC] min-h-screen">
        <ErrorState
          title="Candidate not found"
          message={messageByStatus[status] || "We couldn't find this candidate. They may have been removed."}
          onRetry={status === "pending" ? refetch : () => navigate("/ai-screening/campaigns")}
        />
      </div>
    );
  }

  const ActiveTabComponent = TABS.find((t) => t.id === activeTab).Component;

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <CandidateHeader
        candidate={candidate}
        onBack={() => navigate(-1)}
        actions={
          // HR_ADMIN only; needs the campaign the scorecard belongs to,
          // since the export route is campaign-scoped.
          isHrAdmin && candidate.campaignId && (
            <Button
              variant="outline"
              size="small"
              loading={exporting}
              loadingText="Generating..."
              onClick={async () => {
                setExporting(true);
                try {
                  await exportScorecard(candidate.campaignId, candidate.id);
                  toast.success("Scorecard downloaded.");
                } catch (err) {
                  toast.error(err?.response?.data?.message || "Could not export the scorecard.");
                } finally {
                  setExporting(false);
                }
              }}
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Export scorecard
            </Button>
          )
        }
      />

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <CandidateTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

        <div className="p-5">
          <Suspense fallback={null}>
            <ActiveTabComponent candidate={candidate} onExpired={refetch} />
          </Suspense>
        </div>
      </div>

      {/* Actions on the candidate, alongside the read-only scorecard */}
      {candidate.campaignId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <CandidateOverridePanel candidate={candidate} onChanged={setOverridePatch} />
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <CandidateNotesPanel
              campaignCandidateId={candidate.id}
              currentUserId={user?.user_id || user?.id}
            />
          </div>
        </div>
      )}
    </div>
  );
}
