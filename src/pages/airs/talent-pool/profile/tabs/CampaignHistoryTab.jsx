import React from "react";
import { Badge } from "@/components/ui/badge";
import GenericTable from "@/components/Table/table";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorState from "@/pages/airs/skill-ontology/components/ErrorState";
import useResumeVersions from "../../hooks/useResumeVersions";

// Campaign History tab — there's no backend endpoint that lists every
// campaign a candidate has been part of directly, so this is built from the
// real GET /resumes/candidate/{candidate_id}/versions response instead:
// every version's `campaigns[]` (campaign_name + pipeline_stage) flattened
// into one table. No overall score/AI recommendation/outcome columns —
// that data isn't part of this response.
export default function CampaignHistoryTab({ candidateId }) {
  const { versions, loading, error, refetch } = useResumeVersions(candidateId);

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner text="Loading campaign history..." />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load campaign history"
        message="Something went wrong while loading this candidate's campaign usage. Please try again."
        onRetry={refetch}
      />
    );
  }

  const rows = versions.flatMap((v) =>
    (v.campaigns || []).map((c, i) => ({
      id: `${v.resume_id ?? v.id}-${i}`,
      campaign: <span className="font-semibold text-slate-900">{c.campaign_name}</span>,
      stage: (
        <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-semibold px-2.5 py-1 text-[11px]">
          {c.pipeline_stage}
        </Badge>
      ),
      version: `V${v.version_number}`,
    }))
  );

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center">
        <p className="text-xs font-bold text-slate-700">No campaign history yet</p>
        <p className="text-[11px] text-slate-400 mt-1">Campaigns this candidate's resume has been used in will appear here.</p>
      </div>
    );
  }

  const headers = ["Campaign", "Pipeline Stage", "From Resume Version"];
  const columns = ["campaign", "stage", "version"];

  return <GenericTable headers={headers} columns={columns} rows={rows} />;
}
