import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import ExpandableList from "../../../../components/List/List";
import StageStepper, { overallStatusMeta, buildStageMap, deriveOverallStatus } from "../../components/ProcessingStageStepper";
import useAirsSocket from "../../websockets/useAirsSocket";
import { dispatchAirsEvent } from "../../websockets/airsEventDispatch";
import { RESUME_PROCESSING_STAGES, STAGE_LABELS } from "../intake/constants/intakeConstants";
import { formatResumeDate } from "../utils/resumeIntakeUtils.jsx";

// Translates the resume-specific parse_status vocabulary (PENDING/PARSING/
// PARSED/FAILED, from GET /resumes) into the same overall-status vocabulary
// JD processing uses (QUEUED/RUNNING/SUCCESS/FAILED), so the shared
// overallStatusMeta badge styling applies identically to both.
const PARSE_STATUS_TO_OVERALL = {
  PENDING: "QUEUED",
  PARSING: "RUNNING",
  PARSED: "SUCCESS",
  FAILED: "FAILED",
};

// Seeds the stepper with what the initial REST row already tells us (only
// the current stage, not full history) so the card never renders blank
// before the first WS push arrives.
function seedStages(file) {
  const currentStage = file.pipeline_stage || file.current_stage;
  const status = String(file.parse_status || "").toUpperCase();
  if (!currentStage) return [];
  if (status === "PARSING") return [{ stage: currentStage, status: "RUNNING" }];
  if (status === "FAILED") return [{ stage: currentStage, status: "FAILED", error_message: file.error_message }];
  return [];
}

export default function ResumeProcessingCard({ file, onTerminal }) {
  const resumeId = file.id || file.resume_id;
  const taskId = file.task_id || resumeId;

  const [stages, setStages] = useState(() => seedStages(file));
  const hasNotifiedTerminal = useRef(false);

  useAirsSocket(taskId ? `/ws/resumes/processing-status/${taskId}` : null, {
    onEvent: (message) =>
      dispatchAirsEvent(message, {
        // No overall_status field on this event (see app/websocket/events.py)
        // — only stage/status/error_message/duration_ms — so overall status
        // is derived below from the accumulated stage map.
        "stage.completed": (data) => {
          if (!data?.stage) return;
          setStages((prev) => {
            const next = [...prev];
            const idx = next.findIndex((s) => s.stage === data.stage);
            const entry = { stage: data.stage, status: data.status, error_message: data.error_message };
            if (idx >= 0) next[idx] = { ...next[idx], ...entry };
            else next.push(entry);
            return next;
          });
        },
        // Resumes are linked to their campaign candidate at upload time, so
        // there is nothing this card needs to change on task.linked — kept
        // in the map so the event is explicitly acknowledged, not silently
        // dropped by an unhandled-event path.
        "task.linked": () => {},
      }),
  });

  const stageMap = buildStageMap(stages);
  const failedStage = stages.find((s) => String(s.status).toUpperCase() === "FAILED");
  const overallStatus = deriveOverallStatus(
    stageMap,
    RESUME_PROCESSING_STAGES,
    PARSE_STATUS_TO_OVERALL[String(file.parse_status || "").toUpperCase()] || "QUEUED"
  );

  useEffect(() => {
    const isTerminal = ["SUCCESS", "FAILED", "FAILURE"].includes(overallStatus);
    if (isTerminal && !hasNotifiedTerminal.current) {
      hasNotifiedTerminal.current = true;
      onTerminal?.();
    }
  }, [overallStatus, onTerminal]);

  const meta = overallStatusMeta(overallStatus);
  const errorMessage = failedStage?.error_message || file.error_message;

  return (
    <ExpandableList
      title={file.candidate_full_name || file.file_name || "Untitled Resume"}
      headerRight={
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            {formatResumeDate(file.created_at)}
          </span>
          <Badge className={`font-semibold px-2.5 py-1 text-xs gap-1.5 ${meta.className}`}>
            {meta.pulse && <span className={`w-1.5 h-1.5 rounded-full animate-ping ${meta.dotClassName}`}></span>}
            {meta.label}
          </Badge>
        </div>
      }
    >
      <li className="list-none">
        <p className="text-[11px] text-slate-400 font-mono mb-3">
          Task #{String(taskId || "").slice(0, 8)}
        </p>

        {errorMessage && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg px-3 py-2 text-[11px] font-medium mb-4">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            {errorMessage}
          </div>
        )}

        <StageStepper stages={RESUME_PROCESSING_STAGES} stageLabels={STAGE_LABELS} stageMap={stageMap} />
      </li>
    </ExpandableList>
  );
}
