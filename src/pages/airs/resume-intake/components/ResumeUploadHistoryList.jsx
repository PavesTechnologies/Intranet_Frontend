import React from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Archive, ArrowRight } from "lucide-react";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import { renderParseStatusBadge, renderSourceBadge, formatResumeDate } from "../utils/resumeIntakeUtils.jsx";
import LoadingSpinner from "../../../../components/LoadingSpinner.jsx";

// Progress indicators mapping to statuses
const PARSE_STATUS_PROGRESS = {
  PENDING: 0,
  PARSING: 55,
  PARSED: 100,
  FAILED: 100,
};

const progressColor = (status) => {
  if (status === "FAILED") return "bg-rose-500";
  if (status === "PARSED") return "bg-emerald-500";
  return "bg-blue-600";
};

export default function ResumeUploadHistoryList({ files, isLoading, onViewDetails }) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 p-12 text-center text-slate-400 rounded-xl">
        <LoadingSpinner text="Loading Resumes..."></LoadingSpinner>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
        <Archive className="h-10 w-10 mx-auto stroke-1 mb-2" />
        No resumes found matching the criteria.
      </div>
    );
  }

  const headers = [
    "Candidate",
    "Upload Source",
    "Format & Date",
    "Parsing Progress",
    "Status",
    "Actions"
  ];

  const columns = [
    "candidate",
    "source",
    "fileDetails",
    "progress",
    "status",
    "actions"
  ];

  const rows = files.map((f) => {
    const initials = (f.candidate_full_name || "??")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const isFinished = f.parse_status === "PARSED" || f.parse_status === "FAILED";

    return {
      onRowClick: () => onViewDetails(f),
      rowClass: "cursor-pointer",
      candidate: (
        <div className="flex items-center gap-3 text-left w-full">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
            {initials}
          </div>
          <div className="flex flex-col min-w-0 text-left">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[12.5px] font-bold text-slate-900 truncate">
                {f.candidate_full_name}
              </span>
              {f.is_active_version && (
                <span className="inline-flex items-center bg-blue-50 text-blue-700 border border-blue-100 font-semibold px-1.5 py-0.5 rounded text-[9.5px]">
                  Active v{f.version_number}
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 truncate">{f.candidate_email}</span>
          </div>
        </div>
      ),
      source: renderSourceBadge(f.source),
      fileDetails: (
        <div className="flex flex-col text-center">
          <span className="text-[12px] font-semibold text-slate-800">{f.file_format}</span>
          <span className="text-[10px] text-slate-400">{formatResumeDate(f.created_at)}</span>
        </div>
      ),
      progress: (
        <div className="w-36 flex flex-col justify-center text-left mx-auto">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>Progress</span>
            <span className="font-mono">{PARSE_STATUS_PROGRESS[f.parse_status] ?? 0}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressColor(f.parse_status)}`}
              style={{ width: `${PARSE_STATUS_PROGRESS[f.parse_status] ?? 0}%` }}
            />
          </div>
        </div>
      ),
      status: renderParseStatusBadge(f.parse_status),
      actions: (
        <div className="flex items-center gap-1 justify-center">
          <Button
            variant="ghost"
            size="icon"
            title="View details log"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(f);
            }}
            className="h-8 w-8 !text-slate-500 hover:!text-slate-700"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {isFinished && (
            <Button
              variant="ghost"
              size="icon"
              title="Review candidate profile"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/airs/resume-intake/review/${f.candidate_id}`, { state: { resume: f } });
              }}
              className="h-8 w-8 !text-blue-600 hover:!text-blue-700 hover:bg-blue-50"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    };
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-6">
      <div className="font-bold text-[14px] mb-4 text-slate-900">Resume Upload History</div>
      <div className="overflow-x-auto">
        <GenericTable headers={headers} rows={rows} columns={columns} loading={false} />
      </div>
    </div>
  );
}
