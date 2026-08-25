import React from "react";
import { CheckCircle2, XCircle, Loader2, Circle } from "lucide-react";

export const overallStatusMeta = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "SUCCESS") return { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-100", pulse: false };
  if (s === "FAILURE" || s === "FAILED") return { label: "Failed", className: "bg-rose-50 text-rose-700 border-rose-100", pulse: false };
  if (s === "DEAD") return { label: "Dead", className: "bg-rose-100 text-rose-800 border-rose-200", pulse: false };
  if (s === "RETRY") return { label: "Retrying", className: "bg-orange-50 text-orange-700 border-orange-100", pulse: true, dotClassName: "bg-orange-500" };
  if (s === "PAUSED") return { label: "Paused", className: "bg-slate-100 text-slate-600 border-slate-200", pulse: false };
  if (s === "RUNNING") return { label: "Processing", className: "bg-blue-50 text-blue-700 border-blue-100", pulse: true, dotClassName: "bg-blue-500" };
  if (s === "QUEUED") return { label: "Queued", className: "bg-amber-50 text-amber-700 border-amber-100", pulse: false };
  return { label: status || "Unknown", className: "bg-slate-100 text-slate-700 border-slate-200", pulse: false };
};

// Dedupes a raw stages[] array (as returned by the backend, which may carry
// more than one entry per stage across retries) down to one entry per stage,
// preferring a SUCCESS entry over a later non-success one for that stage.
export function buildStageMap(stagesArray) {
  const stageMap = new Map();
  (stagesArray || []).forEach((s) => {
    const existing = stageMap.get(s.stage);
    const existingStatus = String(existing?.status || "").toUpperCase();
    const incomingStatus = String(s.status || "").toUpperCase();
    if (!existing || existingStatus === "SUCCESS") {
      if (!existing || incomingStatus === "SUCCESS") {
        stageMap.set(s.stage, s);
      }
      // existing already SUCCESS and incoming isn't: keep existing success
    } else {
      stageMap.set(s.stage, s);
    }
  });
  return stageMap;
}

// The backend's stage.completed event (see app/websocket/events.py) carries
// only a per-stage status — task_id/document_type/stage/status/error_message
// /duration_ms — with no overall_status field. Overall status has to be
// derived client-side from the accumulated stage map instead.
export function deriveOverallStatus(stageMap, stagesOrder, fallback) {
  const hasFailure = stagesOrder.some((stage) => {
    const s = String(stageMap.get(stage)?.status || "").toUpperCase();
    return s === "FAILED" || s === "FAILURE";
  });
  if (hasFailure) return "FAILED";

  const lastStage = stagesOrder[stagesOrder.length - 1];
  if (String(stageMap.get(lastStage)?.status || "").toUpperCase() === "SUCCESS") return "SUCCESS";

  if (stageMap.size > 0) return "RUNNING";
  return fallback;
}

const formatStageLabel = (stage, stageLabels) =>
  stageLabels?.[stage] ||
  String(stage || "")
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");

function StageStep({ stage, status, errorMessage, isLast, isUpcoming, stageLabels }) {
  const s = String(status || "").toUpperCase();
  let icon = <Circle className={`h-3.5 w-3.5 ${isUpcoming ? "text-blue-300" : "text-slate-300"}`} />;
  let ring = isUpcoming ? "border-blue-200 bg-blue-50 ring-4 ring-blue-100 animate-pulse" : "border-slate-200 bg-white";
  let lineDone = false;
  const isFailed = s === "FAILED" || s === "FAILURE";

  if (s === "SUCCESS") {
    icon = <CheckCircle2 className="h-4 w-4 text-white" />;
    ring = "bg-emerald-500 border-emerald-500";
    lineDone = true;
  } else if (isFailed) {
    icon = <XCircle className="h-4 w-4 text-white" />;
    ring = "bg-rose-500 border-rose-500";
  } else if (s === "RUNNING") {
    icon = <Loader2 className="h-4 w-4 text-white animate-spin" />;
    ring = "bg-blue-500 border-blue-500";
  }

  return (
    <div className="flex items-start flex-1 min-w-[80px]">
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0 w-24">
        <div className={`h-7 w-7 rounded-full border flex items-center justify-center transition-all duration-300 ${ring}`}>
          {icon}
        </div>
        <span
          className={`text-[9px] font-bold uppercase tracking-tight text-center leading-tight ${
            isUpcoming ? "text-blue-400" : "text-slate-400"
          }`}
        >
          {formatStageLabel(stage, stageLabels)}
        </span>
        {isFailed && errorMessage && (
          <span className="text-[9px] text-rose-600 font-medium text-center leading-tight">
            {errorMessage}
          </span>
        )}
      </div>
      {!isLast && (
        <div className={`flex-1 h-0.5 mx-1 mt-3.5 rounded-full ${lineDone ? "bg-emerald-400" : "bg-slate-200"}`} />
      )}
    </div>
  );
}

// The stage immediately after the last one the backend has reported on —
// i.e. the one about to start next. Highlighted with a pulsing ring so users
// can see what's coming up, not just what's done/running. No "upcoming" stage
// is shown once the pipeline has failed or fully completed.
function getUpcomingIndex(stages, stageMap) {
  let lastTouched = -1;
  for (let i = 0; i < stages.length; i++) {
    if (stageMap.has(stages[i])) lastTouched = i;
  }
  const lastStatus = lastTouched >= 0 ? String(stageMap.get(stages[lastTouched])?.status || "").toUpperCase() : null;
  if (lastStatus === "FAILED" || lastStatus === "FAILURE") return -1;

  const nextIndex = lastTouched + 1;
  return nextIndex < stages.length ? nextIndex : -1;
}

// Horizontal stage-stepper shared by JD Processing and Resume Processing —
// only the `stages` order and `stageLabels` map differ between the two.
export default function StageStepper({ stages, stageLabels, stageMap }) {
  const upcomingIndex = getUpcomingIndex(stages, stageMap);

  return (
    <div className="flex items-start overflow-x-auto pb-1">
      {stages.map((stage, idx) => {
        const stageData = stageMap.get(stage);
        return (
          <StageStep
            key={stage}
            stage={stage}
            status={stageData?.status}
            errorMessage={stageData?.error_message}
            isLast={idx === stages.length - 1}
            isUpcoming={idx === upcomingIndex}
            stageLabels={stageLabels}
          />
        );
      })}
    </div>
  );
}
