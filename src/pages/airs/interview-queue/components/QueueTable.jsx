import React from "react";
import { ArrowRightCircle, CheckCircle2, XCircle } from "lucide-react";
import GenericTable from "@/components/Table/table";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { renderStageBadge } from "../../candidates/utils/candidateUtils.jsx";
import EmptyState from "./EmptyState";

export default function QueueTable({ candidates, isLoading, permissions, onAdvance, onSelect, onReject }) {
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

  const rows = candidates.map((c) => ({
    id: c.id,
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
      <div className="flex items-center justify-center gap-1.5">
        {c.stage === "HM_REVIEW" && permissions.canAdvanceToInterview && (
          <Button variant="outline" size="small" onClick={() => onAdvance(c)}>
            <ArrowRightCircle className="h-3.5 w-3.5" /> Advance to Interview
          </Button>
        )}
        {c.stage === "INTERVIEW" && permissions.canSelectCandidate && (
          <Button variant="outline" size="small" onClick={() => onSelect(c)}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Select
          </Button>
        )}
        {c.stage === "INTERVIEW" && permissions.canRejectAtInterview && (
          <Button variant="danger" size="small" onClick={() => onReject(c)}>
            <XCircle className="h-3.5 w-3.5" /> Reject
          </Button>
        )}
      </div>
    ),
  }));

  return <GenericTable headers={headers} columns={columns} rows={rows} />;
}
