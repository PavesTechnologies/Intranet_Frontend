import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import ErrorState from "../skill-ontology/components/ErrorState";
import LoadingSpinner from "../../../components/LoadingSpinner";
import Pagination from "@/components/Pagination/pagination";
import useCandidateQueue from "./hooks/useCandidateQueue";
import useM12Permissions from "./hooks/useM12Permissions";
import QueueFilters from "./components/QueueFilters";
import QueueTable from "./components/QueueTable";
import CandidateActionModals from "../campaigns/components/CandidateActionModals";
import { getCampaignsByHiringManager } from "../campaigns/services/campaignservice";

// HM Review — scoped to one campaign at a time via ?campaign=, matching
// CandidateRankingPage's convention. Row actions reuse the same
// state-machine-driven Move/Reject flow as CampaignDetails
// (CandidateActionModals + candidateActionsService): the Move dialog only
// offers whatever the allowed-transitions endpoint says is legal from
// HM Review, so this page never needs its own hardcoded transition rules.
export default function HMReviewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const campaignId = searchParams.get("campaign");
  const permissions = useM12Permissions();

  // Campaign filter — lets the hiring manager switch which of their own
  // active campaigns this queue is scoped to, instead of only landing here
  // via a specific campaign's "HM Review" button. Defaults to the first
  // active campaign so the page always has one to call the backend with,
  // even when opened straight from the sidebar with no ?campaign=.
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
    currentPage,
    setCurrentPage,
    totalPages,
    loading,
    error,
    refetch,
    removeCandidate,
  } = useCandidateQueue(campaignId);

  const [action, setAction] = useState(null); // { kind: "move" | "reject", candidate }

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
          message="You have no active campaigns to review. Open a campaign and choose &quot;HM Review&quot; instead."
          onRetry={() => navigate("/ai-screening/campaigns")}
        />
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">HM Review</h1>
        <p className="text-xs text-slate-500 mt-1">
          Candidates awaiting your review for this campaign.
        </p>
      </div>

      <QueueFilters
        search={search}
        setSearch={setSearch}
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
          onMove={(candidate) => setAction({ kind: "move", candidate })}
          onReject={(candidate) => setAction({ kind: "reject", candidate })}
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

      <CandidateActionModals
        action={action}
        campaignId={campaignId}
        onClose={() => setAction(null)}
        onDone={() => {
          removeCandidate(action.candidate.id);
          setAction(null);
        }}
      />
    </div>
  );
}
