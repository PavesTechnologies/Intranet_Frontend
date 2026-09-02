import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import ErrorState from "../skill-ontology/components/ErrorState";
import LoadingSpinner from "../../../components/LoadingSpinner";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import Pagination from "@/components/Pagination/pagination";
import useCandidateQueue from "./hooks/useCandidateQueue";
import useM12Permissions from "./hooks/useM12Permissions";
import QueueFilters from "./components/QueueFilters";
import QueueTable from "./components/QueueTable";
import RejectAtInterviewModal from "./components/RejectAtInterviewModal";
import { advanceToInterview, selectCandidate, rejectAtInterview } from "./services/pipelineActionsService";
import { getCampaignsByHiringManager } from "../campaigns/services/campaignservice";

// HM Review / Interview Queue — scoped to one campaign at a time via
// ?campaign=, matching CandidateRankingPage's convention. Row actions call
// Epic 1's 3 real endpoints (pipelineActionsService.js); each is a
// deterministic stage transition, so on success the candidate's local
// stage is set directly rather than re-parsed from the response.
export default function InterviewQueuePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const campaignId = searchParams.get("campaign");
  const permissions = useM12Permissions();

  // Campaign filter — lets the hiring manager switch which of their own
  // active campaigns this queue is scoped to, instead of only landing here
  // via a specific campaign's "Review Interviews" button. Defaults to the
  // first active campaign so the page always has one to call the backend
  // with, even when opened straight from the sidebar with no ?campaign=.
  const [activeCampaigns, setActiveCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCampaignsLoading(true);
      try {
        const res = await getCampaignsByHiringManager({ show_closed: false });
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.items)
            ? res.data.items
            : Array.isArray(res)
              ? res
              : [];
        const active = list.filter((c) => (c.status || "").toUpperCase() === "ACTIVE");
        if (cancelled) return;
        setActiveCampaigns(active);
        if (!campaignId && active.length > 0) {
          setSearchParams({ campaign: String(active[0].id) }, { replace: true });
        }
      } catch (err) {
        if (!cancelled) toast.error("Failed to load your campaigns.");
      } finally {
        if (!cancelled) setCampaignsLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // Only fetch once on mount — the campaign list itself doesn't depend on
    // which campaign is currently selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const campaignOptions = activeCampaigns.map((c) => ({ label: c.name, value: String(c.id) }));

  const {
    candidates,
    totalResults,
    search,
    setSearch,
    stageFilter,
    setStageFilter,
    currentPage,
    setCurrentPage,
    totalPages,
    loading,
    error,
    refetch,
    applyStageChange,
  } = useCandidateQueue(campaignId);

  const [confirmAction, setConfirmAction] = useState(null); // { kind: "advance" | "select", candidate }
  const [rejectTarget, setRejectTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!campaignId && campaignsLoading) {
    return (
      <div className="p-8 bg-[#F8FAFC] min-h-screen flex justify-center">
        <LoadingSpinner text="Loading your campaigns..." />
      </div>
    );
  }

  if (!campaignId) {
    return (
      <div className="p-8 bg-[#F8FAFC] min-h-screen">
        <ErrorState
          title="No active campaign"
          message="You have no active campaigns to review. Open a campaign and choose &quot;Review Interviews&quot; instead."
          onRetry={() => navigate("/airs/campaigns")}
        />
      </div>
    );
  }

  const fail = (err, fallback) => toast.error(err?.response?.data?.message || fallback);

  const handleAdvance = async () => {
    const candidate = confirmAction.candidate;
    setIsSubmitting(true);
    try {
      await advanceToInterview(candidate.id);
      applyStageChange(candidate.id, "INTERVIEW");
      toast.success(`${candidate.name} advanced to Interview.`);
      setConfirmAction(null);
    } catch (err) {
      fail(err, "Could not advance this candidate to Interview.");
      setConfirmAction(null);
      refetch(); // the candidate's actual stage may have moved under us — re-sync
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelect = async () => {
    const candidate = confirmAction.candidate;
    setIsSubmitting(true);
    try {
      await selectCandidate(candidate.id);
      applyStageChange(candidate.id, "SELECTED");
      toast.success(`${candidate.name} selected.`);
      setConfirmAction(null);
    } catch (err) {
      fail(err, "Could not select this candidate.");
      setConfirmAction(null);
      refetch();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (reason) => {
    setIsSubmitting(true);
    try {
      await rejectAtInterview(rejectTarget.id, reason);
      applyStageChange(rejectTarget.id, "REJECTED");
      toast.success(`${rejectTarget.name} rejected.`);
      setRejectTarget(null);
    } catch (err) {
      // Reason is preserved (modal stays open) — this may just be a
      // transient error, not necessarily a stale stage.
      fail(err, "Could not reject this candidate.");
      refetch();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Interview Queue</h1>
        <p className="text-xs text-slate-500 mt-1">
          Candidates awaiting hiring-manager review or currently in interview for this campaign.
        </p>
      </div>

      <QueueFilters
        search={search}
        setSearch={setSearch}
        stageFilter={stageFilter}
        setStageFilter={setStageFilter}
        campaignOptions={campaignOptions}
        campaignId={campaignId}
        onCampaignChange={(value) => setSearchParams({ campaign: value })}
      />

      {error ? (
        <ErrorState
          title="Couldn't load candidates"
          message="We couldn't load candidates for this campaign. Please try again."
          onRetry={refetch}
        />
      ) : (
        <QueueTable
          candidates={candidates}
          isLoading={loading}
          permissions={permissions}
          campaignId={campaignId}
          onAdvance={(candidate) => setConfirmAction({ kind: "advance", candidate })}
          onSelect={(candidate) => setConfirmAction({ kind: "select", candidate })}
          onReject={setRejectTarget}
        />
      )}

      {!loading && !error && totalResults > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={() => setCurrentPage(currentPage - 1)}
          onNext={() => setCurrentPage(currentPage + 1)}
        />
      )}

      <ConfirmationModal
        isOpen={confirmAction?.kind === "advance"}
        title="Advance to Interview"
        message={`Advance ${confirmAction?.candidate?.name} from HM Review to the Interview stage?`}
        confirmText="Advance"
        variant="primary"
        isLoading={isSubmitting}
        onConfirm={handleAdvance}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmationModal
        isOpen={confirmAction?.kind === "select"}
        title="Select Candidate"
        message={`Select ${confirmAction?.candidate?.name} for this role?`}
        confirmText="Select"
        variant="primary"
        isLoading={isSubmitting}
        onConfirm={handleSelect}
        onCancel={() => setConfirmAction(null)}
      />

      {rejectTarget && (
        <RejectAtInterviewModal
          candidateName={rejectTarget.name}
          isSubmitting={isSubmitting}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleReject}
        />
      )}
    </div>
  );
}
