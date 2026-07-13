import React from "react";
import { FileText, Eye, RefreshCw, Trash2, Archive } from "lucide-react";
import Button from "../../../../components/Button/Button";
import { renderUploadStatusBadge } from "../utils/resumeIntakeUtils.jsx";

const progressColor = (status) => {
  if (status === "Duplicate flagged" || status === "Failed") return "bg-rose-500";
  if (status === "Parsed") return "bg-emerald-500";
  return "bg-blue-600";
};

export default function ResumeUploadHistoryList({ files, onViewDetails, onRetry, onDelete }) {
  if (files.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
        <Archive className="h-10 w-10 mx-auto stroke-1 mb-2" />
        No uploads found matching the criteria.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="font-bold text-[14px] mb-4 text-slate-900">Upload history</div>
      <div className="space-y-3">
        {files.map((f) => (
          <div key={f.id} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-50">
              <FileText size={15} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-semibold truncate text-slate-900">{f.name}</span>
                <span className="text-[11px] text-slate-400">
                  {f.sizeLabel} · {f.fileCount} file{f.fileCount > 1 ? "s" : ""} · {f.uploadedAt}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div className={`h-full rounded-full transition-all ${progressColor(f.status)}`} style={{ width: `${f.progress}%` }} />
              </div>
            </div>
            {renderUploadStatusBadge(f.status)}
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" title="View details" onClick={() => onViewDetails(f)} className="h-8 w-8 !text-blue-500 hover:!text-blue-600">
                <Eye className="h-4 w-4" />
              </Button>
              {f.status === "Failed" && (
                <Button variant="ghost" size="icon" title="Retry upload" onClick={() => onRetry(f.id)} className="h-8 w-8 text-amber-500 hover:text-amber-600">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" title="Remove from history" onClick={() => onDelete(f.id)} className="h-8 w-8 text-rose-500 hover:text-rose-600">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
