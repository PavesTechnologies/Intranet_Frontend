import React from "react";
import { FileText, Eye, Archive } from "lucide-react";
import Button from "../../../../components/Button/Button";
import { Badge } from "../../../../components/ui/badge";
import { renderParseStatusBadge, renderSourceBadge, formatResumeDate } from "../utils/resumeIntakeUtils.jsx";
import LoadingSpinner from "../../../../components/LoadingSpinner.jsx";

// No progress percentage comes back from the API, so the bar is driven off
// parse_status instead: empty while pending, half-filled and animated while
// parsing, full once parsed/failed (colored to match the outcome).
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
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 p-12 text-center text-slate-400">
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

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="font-bold text-[14px] mb-4 text-slate-900">Resume list</div>
      <div className="space-y-3">
        {files.map((f) => (
          <div key={f.id} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-50">
              <FileText size={15} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold truncate text-slate-900">{f.candidate_full_name}</span>
                {f.is_active_version && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-semibold px-2 py-0.5 text-[10px]">
                    Active v{f.version_number}
                  </Badge>
                )}
                {!f.is_active_version && (
                  <span className="text-[11px] text-slate-400">v{f.version_number}</span>
                )}
              </div>
              <div className="text-[11.5px] text-slate-500 truncate mb-1.5">
                {f.candidate_email} · {f.file_format} · {formatResumeDate(f.created_at)}
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${progressColor(f.parse_status)}`}
                  style={{ width: `${PARSE_STATUS_PROGRESS[f.parse_status] ?? 0}%` }}
                />
              </div>
            </div>
            {renderSourceBadge(f.source)}
            {renderParseStatusBadge(f.parse_status)}
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" title="View details" onClick={() => onViewDetails(f)} className="h-8 w-8 !text-blue-500 hover:!text-blue-600">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
