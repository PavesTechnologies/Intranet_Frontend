import React, { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import LoadingSpinner from "../../../components/LoadingSpinner";
import CandidateHeader from "../candidates/CandidateScore/components/CandidateHeader";
import CandidateTabs from "../candidates/CandidateScore/components/CandidateTabs";
import ErrorState from "../skill-ontology/components/ErrorState";
import useParsedResumeCandidate from "../candidates/hooks/useParsedResumeCandidate";
import CandidateOverridePanel from "../campaigns/components/CandidateOverridePanel";
import CandidateNotesPanel from "../campaigns/components/CandidateNotesPanel";
import { exportScorecard } from "../campaigns/services/exportService";
import Button from "../../../components/Button/Button";
import { Download } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../../contexts/AuthContext";
import { SCORE_LABELS } from "../constants/scoreLabels";
// import { MOCK_CANDIDATES } from "../candidates/mock/candidateMockData";
// import { mapMockCandidateForScorecard } from "./utils/mapMockCandidateForScorecard";

const SummaryTab = lazy(() => import("../candidates/CandidateScore/tabs/Summary/SummaryTab"));
const ResumeTab = lazy(() => import("../candidates/CandidateScore/tabs/Resume/ResumeTab"));
const DeterministicScoreTab = lazy(() => import("../candidates/CandidateScore/tabs/Deterministic/DeterministicScoreTab"));
const SemanticScoreTab = lazy(() => import("../candidates/CandidateScore/tabs/Semantic/SemanticScoreTab"));
const AiEvaluationTab = lazy(() => import("../candidates/CandidateScore/tabs/AiEvaluation/AiEvaluationTab"));
const InterviewTab = lazy(() => import("../candidates/CandidateScore/tabs/Interview/InterviewTab"));
const FinalStatusTab = lazy(() => import("../candidates/CandidateScore/tabs/FinalStatus/FinalStatusTab"));

const TABS = [
  { id: "summary", label: "Summary", Component: SummaryTab },
  { id: "resume", label: "Resume", Component: ResumeTab },
  { id: "deterministic", label: SCORE_LABELS.deterministic, Component: DeterministicScoreTab },
  { id: "semantic", label: SCORE_LABELS.semantic, Component: SemanticScoreTab },
  { id: "ai", label: SCORE_LABELS.ai, Component: AiEvaluationTab },
  { id: "finalStatus", label: "Final Status", Component: FinalStatusTab },
  { id: "interview", label: "Interview", Component: InterviewTab },
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
  const campaignCandidateId =
    resumeRow?.campaign_candidate_id ??
    resumeRow?.campaignCandidateId ??
    resumeRow?.campaignCandidate?.id ??
    resumeRow?.campaign_candidate?.id ??
    // CampaignDetails' candidate table passes its already-mapped row
    // (mapCampaignCandidateRow), whose id IS the campaign_candidate_id.
    resumeRow?.id ??
    // Pipeline routes are opened with the campaign-candidate id; keep that id
    // available for score tabs even when router state is lost on refresh.
    (candidateIdProp ? null : params.candidateId);
  const fallback = useMemo(
    () => ({
      // `resumeRow` is either a raw Resume Upload History row (snake_case) or
      // an already-mapped campaign-candidate row from CampaignDetails'
      // CandidateTable (mapCampaignCandidateRow, camelCase) — support both.
      name: resumeRow?.candidate_full_name ?? resumeRow?.name,
      email: resumeRow?.candidate_email ?? resumeRow?.email,
      createdAt: resumeRow?.created_at ?? resumeRow?.createdAt,
      // Resume Upload History rows carry campaign_candidate_id, but the
      // parsed-json endpoint (this page's only data source) doesn't — thread it
      // through here so the Deterministic/Semantic/AI Evaluation tabs can call
      // /campaign-candidates/{campaign_candidate_id}/... with the right id.
      campaignCandidateId,
      campaignId: resumeRow?.campaign_id ?? resumeRow?.campaignId,
      // pipeline_stage/decision_* are only present once the resume's candidate
      // is linked to a campaign — same fields Resume Upload History already
      // renders via renderPipelineStageBadge.
      stage: resumeRow?.pipeline_stage ?? resumeRow?.stage,
      decisionType: resumeRow?.decision_type ?? resumeRow?.decisionType,
      decisionSource: resumeRow?.decision_source ?? resumeRow?.decisionSource,
      decisionReason: resumeRow?.decision_reason ?? resumeRow?.decisionReason,
      decisionAt: resumeRow?.decision_at ?? resumeRow?.decisionAt,
    }),
    [
      campaignCandidateId,
      resumeRow?.campaign_id,
      resumeRow?.campaignId,
      resumeRow?.candidate_email,
      resumeRow?.email,
      resumeRow?.candidate_full_name,
      resumeRow?.name,
      resumeRow?.created_at,
      resumeRow?.createdAt,
      resumeRow?.pipeline_stage,
      resumeRow?.stage,
      resumeRow?.decision_type,
      resumeRow?.decisionType,
      resumeRow?.decision_source,
      resumeRow?.decisionSource,
      resumeRow?.decision_reason,
      resumeRow?.decisionReason,
      resumeRow?.decision_at,
      resumeRow?.decisionAt,
    ]
  );
  const { candidate: fetchedCandidate, loading, error, status, refetch } = useParsedResumeCandidate(candidateId, fallback);
  // Applying/clearing an HR override has no detail re-fetch to lean on here
  // either — same optimistic-patch approach as CandidateScorePage.
  const [overridePatch, setOverridePatch] = useState(null);
  useEffect(() => { setOverridePatch(null); }, [candidateId]);
  const candidate = fetchedCandidate && overridePatch ? { ...fetchedCandidate, ...overridePatch } : fetchedCandidate;
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const isModal = variant === "modal";
  const { user, hasRole } = useAuth();
  const isHrAdmin = hasRole(["HR_ADMIN"]);
  const [exporting, setExporting] = useState(false);

  // Prefer real browser "back" so this returns to wherever the user actually
  // came from — a specific Resume Intake tab (history/processing/bulk-batches),
  // the Pipeline Board, etc. — rather than a single hardcoded guess. Only fall
  // back to a guessed route when there's no in-app history to go back to
  // (e.g. this page was opened directly via URL/refresh, where location.key
  // is react-router's "default" sentinel). Not used when embedded as a modal —
  // onBackProp (closing the popup) takes over instead.
  const canGoBack = location.key !== "default";
  const fallbackBackTo = resumeRow ? "/ai-screening/resume-intake" : "/ai-screening/pipeline";
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
    const messageByStatus = {
      not_found: "No resume is linked to this candidate yet.",
      pending: "This candidate's resume is still being parsed. Check back shortly.",
      error: "We couldn't load this candidate. Please try again.",
    };
    return (
      <div className={isModal ? undefined : "p-8 bg-[#F8FAFC] min-h-screen"}>
        <ErrorState
          title="Candidate not found"
          message={messageByStatus[status] || "We couldn't find this candidate. They may have been removed."}
          onRetry={status === "pending" ? refetch : handleBack}
        />
      </div>
    );
  }

  const ActiveTabComponent = TABS.find((t) => t.id === activeTab).Component;

  return (
    <div className={isModal ? "text-slate-900 font-sans" : "p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans"}>
      <CandidateHeader
        candidate={candidate}
        onBack={handleBack}
        actions={
          !isModal && isHrAdmin && candidate.campaignId && (
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
          <Suspense fallback={<LoadingSpinner text="Loading tab..." />}>
            <ActiveTabComponent candidate={candidate} onExpired={refetch} />
          </Suspense>
        </div>
      </div>

      {/* Actions on the candidate, alongside the read-only scorecard — only
          meaningful once this record is linked to a campaign (campaignId set
          by the parsed-json response). Skipped in the modal popup variant to
          keep it compact. */}
      {!isModal && candidate.campaignId && (
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
