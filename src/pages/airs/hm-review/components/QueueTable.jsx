import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Ban } from "lucide-react";
import GenericTable from "@/components/Table/table";
import LoadingSpinner from "@/components/LoadingSpinner";
import { renderStageBadge } from "../../candidates/utils/candidateUtils.jsx";
import EmptyState from "./EmptyState";

export default function QueueTable({ candidates, isLoading, permissions, campaignId, onMove, onReject }) {
  const navigate = useNavigate();
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl py-16 flex items-center justify-center">
        <LoadingSpinner text="Loading candidates..." />
      </div>
    );
  }

  if (candidates.length === 0) return <EmptyState />;

  const headers = ["Candidate", "Role", "Stage", "Composite Score", "Actions"];
  const columns = ["candidate", "role", "stage", "score", "actions"];

  // c.id is the campaign_candidate_id (mapCampaignCandidateRow), matching
  // the id CandidateScorePage expects at /airs/candidates/:candidateId
  // elsewhere in AIRS (CampaignDetails, PipelineBoardPage).
  const goToCandidate = (c) => navigate(`/ai-screening/candidates/${c.id}`, { state: { candidate: c, campaignId } });

  const rows = candidates.map((c) => ({
    id: c.id,
    onRowClick: () => goToCandidate(c),
    rowClass: "cursor-pointer",
    candidate: (
      <div className="text-left">
        <div className="font-semibold text-slate-900">{c.name}</div>
        <div className="text-[11px] text-slate-400">{c.location}</div>
      </div>
    ),
    role: <span className="text-slate-600">{c.role}</span>,
    stage: renderStageBadge(c.stage),
    score: <span className="font-semibold text-slate-900">{c.composite}</span>,
    actions: (
      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {permissions.canMoveCandidate && (
          <button
            type="button"
            title="Move to another stage"
            onClick={() => onMove(c)}
            className="h-8 w-8 inline-flex items-center justify-center text-slate-400 hover:text-indigo-600"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </button>
        )}
        {permissions.canRejectCandidate && (
          <button
            type="button"
            title="Reject with a reason"
            onClick={() => onReject(c)}
            className="h-8 w-8 inline-flex items-center justify-center text-slate-400 hover:text-red-600"
          >
            <Ban className="h-4 w-4" />
          </button>
        )}
      </div>
    ),
  }));

  return <GenericTable headers={headers} columns={columns} rows={rows} />;
}
