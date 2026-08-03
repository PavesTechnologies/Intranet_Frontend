import React from "react";
import { FileArchive, CheckCircle2, AlertTriangle, Clock, ArrowRight, Loader2 } from "lucide-react";
import GenericTable from "../../../../components/Table/table";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Button from "../../../../components/Button/Button";
import { formatResumeDate } from "../utils/resumeIntakeUtils";

export default function BulkUploadJobsList({ jobs, isLoading, onSelectJob }) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 p-12 text-center text-slate-400 rounded-xl">
        <LoadingSpinner text="Loading bulk upload batches..." />
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
        <FileArchive className="h-10 w-10 mx-auto stroke-1 mb-2 text-slate-300" />
        No bulk ZIP uploads found.
      </div>
    );
  }

  // BulkUploadStatus (API reference §2): PENDING/EXTRACTING/PROCESSING are
  // in-progress; COMPLETED/PARTIAL_FAILURE/FAILED/CANCELLED are terminal.
  // PARTIAL_FAILURE/CANCELLED were missing here, so any job that finished
  // with even one failed/duplicate file showed "Processing" forever.
  const renderStatusBadge = (st) => {
    const uppercase = String(st || "").toUpperCase();
    if (uppercase === "COMPLETED") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
        </span>
      );
    }
    if (uppercase === "PARTIAL_FAILURE") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3 mr-1" /> Partial Failure
        </span>
      );
    }
    if (uppercase === "FAILED") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3 h-3 mr-1" /> Failed
        </span>
      );
    }
    if (uppercase === "CANCELLED") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing
      </span>
    );
  };

  const headers = ["Archive File", "Campaign", "Progress Status", "File Counts", "Submitted", "Actions"];
  const columns = ["archive", "campaign", "progress", "counts", "submitted", "actions"];

  const rows = jobs.map((job) => {
    const prog = job.progress || {};
    const pct = Math.min(100, Math.round(prog.percent_complete ?? 0));
    const processed = prog.processed_count ?? 0;
    const total = prog.total_files ?? 0;
    const failed = prog.failed_count ?? 0;

    return {
      archive: (
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-700 border border-blue-100">
            <FileArchive size={16} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[12.5px] font-bold text-slate-900 truncate">
              {job.original_filename || "ZIP Archive"}
            </span>
            <span className="text-[10.5px] text-slate-400 font-mono">Job: {(job.bulk_upload_job_id || job.id)?.substring(0, 8)}...</span>
          </div>
        </div>
      ),
      campaign: <span className="text-[12px] font-semibold text-slate-800">{job.campaign_name || "—"}</span>,
      progress: (
        <div className="w-36 flex flex-col justify-center text-left">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>{renderStatusBadge(job.status || prog.status)}</span>
            <span className="font-mono font-bold text-slate-900">{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ),
      counts: (
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="font-bold text-emerald-700">{processed}</span>
          <span className="text-slate-400">/</span>
          <span className="font-bold text-slate-800">{total}</span>
          {failed > 0 && <span className="text-[10px] bg-rose-50 text-rose-600 px-1 rounded font-semibold ml-1">{failed} failed</span>}
        </div>
      ),
      submitted: <span className="text-xs text-slate-400">{formatResumeDate(job.created_at)}</span>,
      actions: (
        <Button
          variant="ghost"
          size="small"
          onClick={() => onSelectJob(job)}
          className="!text-blue-600 hover:!text-blue-700 hover:bg-blue-50 text-xs"
        >
          View Progress <ArrowRight size={14} className="ml-1" />
        </Button>
      ),
    };
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-6">
      <div className="font-bold text-[14px] mb-4 text-slate-900">Bulk ZIP Upload Batches</div>
      <div className="overflow-x-auto">
        <GenericTable headers={headers} rows={rows} columns={columns} loading={false} />
      </div>
    </div>
  );
}
