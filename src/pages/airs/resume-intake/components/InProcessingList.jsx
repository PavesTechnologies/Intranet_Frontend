import React from "react";
import { Loader2 } from "lucide-react";
import GenericTable from "../../../../components/Table/table";
import LoadingSpinner from "../../../../components/LoadingSpinner.jsx";
import { renderParseStatusBadge, renderSourceBadge, formatResumeDate } from "../utils/resumeIntakeUtils.jsx";
import { STAGE_LABELS } from "../intake/constants/intakeConstants";
import { getStageProgressPct } from "../intake/mock/inProcessingMockData";

export default function InProcessingList({ files, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 p-12 text-center text-slate-400 rounded-xl">
        <LoadingSpinner text="Loading in-progress resumes..."></LoadingSpinner>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
        <Loader2 className="h-10 w-10 mx-auto stroke-1 mb-2" />
        Nothing is currently queued or parsing.
      </div>
    );
  }

  const headers = ["Candidate", "Upload Source", "Campaign", "Current Stage", "Queued", "Status"];
  const columns = ["candidate", "source", "campaign", "stage", "queued", "status"];

  const rows = files.map((f) => {
    const initials = (f.candidate_full_name || "??")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const stagePct = getStageProgressPct(f.current_stage);

    return {
      candidate: (
        <div className="flex items-center gap-3 text-left w-full">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
            {initials}
          </div>
          <div className="flex flex-col min-w-0 text-left">
            <span className="text-[12.5px] font-bold text-slate-900 truncate">{f.candidate_full_name}</span>
            <span className="text-[11px] text-slate-500 truncate">{f.candidate_email}</span>
          </div>
        </div>
      ),
      source: renderSourceBadge(f.source),
      campaign: (
        <span className="text-[12px] text-slate-700">{f.campaign_name || "—"}</span>
      ),
      stage: (
        <div className="w-40 flex flex-col justify-center text-left mx-auto">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>{f.current_stage ? STAGE_LABELS[f.current_stage] : "Queued"}</span>
            <span className="font-mono">{stagePct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500"
              style={{ width: `${stagePct}%` }}
            />
          </div>
        </div>
      ),
      queued: (
        <span className="text-[10px] text-slate-400">{formatResumeDate(f.created_at)}</span>
      ),
      status: renderParseStatusBadge(f.parse_status),
    };
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-6">
      <div className="font-bold text-[14px] mb-4 text-slate-900">In Processing</div>
      <div className="overflow-x-auto">
        <GenericTable headers={headers} rows={rows} columns={columns} loading={false} />
      </div>
    </div>
  );
}
