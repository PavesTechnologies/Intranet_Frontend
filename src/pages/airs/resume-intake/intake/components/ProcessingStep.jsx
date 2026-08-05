import React, { useEffect } from "react";
import { Check, X, Loader2, AlertTriangle, ChevronRight } from "lucide-react";
import Button from "../../../../../components/Button/Button";
import { STAGE_LABELS, STAGE_STATUS_STYLE, STAGE_FAILURE_COPY } from "../constants/intakeConstants";
import { formatDuration } from "../utils/intakeUtils.jsx";

function StageIcon({ status }) {
  const style = STAGE_STATUS_STYLE[status];
  if (status === "SUCCESS") return <div className={`w-7 h-7 rounded-full ${style.dot} flex items-center justify-center`}><Check size={14} className="text-white" /></div>;
  if (status === "FAILED") return <div className={`w-7 h-7 rounded-full ${style.dot} flex items-center justify-center`}><X size={14} className="text-white" /></div>;
  if (status === "RUNNING")
    return (
      <div className={`w-7 h-7 rounded-full ${style.dot} flex items-center justify-center ring-4 ring-blue-100`}>
        <Loader2 size={14} className="text-white animate-spin" />
      </div>
    );
  return <div className={`w-7 h-7 rounded-full border-2 border-slate-300 bg-white`} />;
}

const FAILURE_STATUSES = ["FAILURE", "FAILED"];

export default function ProcessingStep({ resume, status, statusError, onComplete, onRetryStatusCheck, onBackToUpload }) {
  const isFailure = FAILURE_STATUSES.includes(status.overall_status);
  const isSuccess = status.overall_status === "SUCCESS";

  useEffect(() => {
    if (isSuccess) {
      const t = setTimeout(onComplete, 900);
      return () => clearTimeout(t);
    }
  }, [isSuccess, onComplete]);

  const failedStage = status.stages.find((s) => s.status === "FAILED");

  return (
    <div className="max-w-3xl">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">Processing resume</h2>
            <p className="text-[12.5px] text-slate-500 mt-0.5">{resume.candidate_name} · {resume.file_format} · Task {status.task_id}</p>
          </div>
          {isSuccess && (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700">
              <Check size={14} /> Complete
            </span>
          )}
          {isFailure && (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-rose-700">
              <X size={14} /> Failed
            </span>
          )}
        </div>

        {statusError && (
          <div className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-[12.5px] font-bold text-amber-800">Couldn't refresh processing status</div>
                <div className="text-[11.5px] text-amber-700 mt-0.5">{statusError} · showing the last known progress below.</div>
              </div>
            </div>
            <Button variant="outline" size="small" onClick={onRetryStatusCheck} className="shrink-0">
              Retry
            </Button>
          </div>
        )}

        <div className="p-6">
          <ol>
            {status.stages.map((s, i) => {
              const style = STAGE_STATUS_STYLE[s.status];
              const isLast = i === status.stages.length - 1;
              return (
                <li key={s.stage} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <StageIcon status={s.status} />
                    {!isLast && <div className={`w-0.5 flex-1 my-0.5 ${status.stages[i + 1].status !== "PENDING" || s.status === "SUCCESS" ? style.line : "bg-slate-200"}`} style={{ minHeight: 22 }} />}
                  </div>
                  <div className={`pb-5 ${isLast ? "" : ""} flex-1`}>
                    <div className="flex items-baseline justify-between">
                      <span className={`text-[13px] font-semibold ${s.status === "PENDING" ? "text-slate-400" : "text-slate-900"}`}>
                        {STAGE_LABELS[s.stage]}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">{s.status === "SUCCESS" || s.status === "FAILED" ? formatDuration(s.duration_ms) : ""}</span>
                    </div>
                    {s.status === "RUNNING" && <div className="text-[11.5px] text-blue-700 font-medium mt-0.5">In progress...</div>}
                    {s.status === "FAILED" && <div className="text-[11.5px] text-rose-600 font-medium mt-0.5">Failed</div>}
                  </div>
                </li>
              );
            })}
          </ol>

          {isFailure && (
            <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-rose-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-rose-800">
                    {failedStage ? `${STAGE_LABELS[failedStage.stage]} failed` : "Processing failed"}
                  </div>
                  <div className="text-[12.5px] text-rose-700 mt-1">
                    {failedStage ? (
                      <>
                        <span className="font-semibold">What this means: </span>
                        {STAGE_FAILURE_COPY[failedStage.stage]}
                      </>
                    ) : (
                      status.error_message || "The parsing pipeline was unable to complete for this file."
                    )}
                  </div>
                  {(failedStage?.error_message || status.error_message) && (
                    <details className="mt-2">
                      <summary className="text-[11.5px] text-rose-500 cursor-pointer select-none">Technical details</summary>
                      <div className="text-[11px] text-rose-500 font-mono mt-1 break-all">
                        {failedStage?.error_message || status.error_message}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          {isFailure && (
            <Button variant="primary" size="medium" onClick={onBackToUpload}>
              Upload a different file
            </Button>
          )}
          {isSuccess && (
            <Button variant="primary" size="medium" onClick={onComplete}>
              View parsed resume <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
