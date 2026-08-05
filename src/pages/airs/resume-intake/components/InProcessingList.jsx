import React from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, Cpu } from "lucide-react";
import GenericTable from "../../../../components/Table/table";
import LoadingSpinner from "../../../../components/LoadingSpinner.jsx";
import Button from "../../../../components/Button/Button";
import { renderParseStatusBadge, renderSourceBadge, formatResumeDate } from "../utils/resumeIntakeUtils.jsx";
import InProcessingStageCell from "./InProcessingStageCell";
import { STAGE_LABELS } from "../intake/constants/intakeConstants";

export default function InProcessingList({ files, isLoading }) {
  const navigate = useNavigate();

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

  const headers = ["Candidate", "Upload Source", "Format & Date", "Current Stage", "Status", "Actions"];
  const columns = ["candidate", "source", "fileDetails", "stage", "status", "actions"];

  const handleOpenProcessStep = (f) => {
    navigate("/airs/resume-intake/new", { state: { existingResume: f } });
  };

  const rows = files.map((f) => {
    const resumeId = f.id || f.resume_id;
    const initials = (f.candidate_full_name || "??")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    return {
      candidate: (
        <button
          type="button"
          onClick={() => handleOpenProcessStep(f)}
          className="flex items-center gap-3 text-left w-full group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100 group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-200 transition-colors">
            {initials}
          </div>
          <div className="flex flex-col min-w-0 text-left">
            <span className="text-[12.5px] font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
              {f.candidate_full_name}
            </span>
            <span className="text-[11px] text-slate-500 truncate">{f.candidate_email}</span>
          </div>
        </button>
      ),
      source: renderSourceBadge(f.source),
      fileDetails: (
        <div className="flex flex-col text-center">
          <span className="text-[12px] font-semibold text-slate-800">{f.file_format}</span>
          <span className="text-[10px] text-slate-400">{formatResumeDate(f.created_at)}</span>
        </div>
      ),
      stage: (() => {
        const rawStage = f.pipeline_stage || f.current_stage || null;
        const stageLabel = rawStage ? (STAGE_LABELS[rawStage] || rawStage) : null;
        if (f.parse_status === "PENDING") {
          return <span className="text-[11px] text-slate-400 italic">Waiting in queue…</span>;
        }
        if (f.parse_status === "PARSING" && stageLabel) {
          return (
            <div className="flex items-center gap-1.5">
              <Cpu size={13} className="text-blue-500 animate-pulse shrink-0" />
              <span className="text-[11.5px] font-semibold text-blue-700">{stageLabel}</span>
            </div>
          );
        }
        return <span className="text-[11px] text-slate-400">—</span>;
      })(),
      status: (
        <div className="flex flex-col items-center gap-1">
          {renderParseStatusBadge(f.parse_status)}
          <InProcessingStageCell
            resumeId={resumeId}
            parseStatus={f.parse_status}
            initialStage={f.pipeline_stage || f.current_stage}
          />
        </div>
      ),
      actions: (
        <div className="flex items-center gap-1 justify-center">
          <Button
            variant="ghost"
            size="icon"
            title="View processing step"
            onClick={() => handleOpenProcessStep(f)}
            className="h-8 w-8 !text-blue-600 hover:!text-blue-700 hover:bg-blue-50"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ),
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
