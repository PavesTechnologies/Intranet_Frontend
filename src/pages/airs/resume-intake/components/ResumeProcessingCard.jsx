import React, { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "react-toastify";
import { Badge } from "../../../../components/ui/badge";
import ExpandableList from "../../../../components/List/List";
import StageStepper, { overallStatusMeta, buildStageMap } from "../../components/ProcessingStageStepper";
import ProcessingErrorPanel from "../../components/ProcessingErrorPanel";
import RetryAttemptBadge from "../../components/RetryAttemptBadge";
import useAirsSocket from "../../websockets/useAirsSocket";
import { dispatchAirsEvent } from "../../websockets/airsEventDispatch";
import { useAuth } from "../../../../contexts/AuthContext";
import { pipelineStatus, retryResume } from "../../service/resumeIntake";
import { retryErrorMessage } from "../../utils/retryErrors";
import { RESUME_PROCESSING_STAGES, STAGE_LABELS } from "../intake/constants/intakeConstants";
import { formatResumeDate } from "../utils/resumeIntakeUtils.jsx";

// Translates the resume-specific parse_status vocabulary (PENDING/PARSING/
// PARSED/FAILED, from GET /resumes) into the same overall-status vocabulary
// JD processing uses (QUEUED/RUNNING/SUCCESS/FAILED), so the shared
// overallStatusMeta badge styling applies identically to both. RETRY passes
// through unchanged — it means the same thing in both pipelines.
const PARSE_STATUS_TO_OVERALL = {
  PENDING: "QUEUED",
  PARSING: "RUNNING",
  PARSED: "SUCCESS",
  FAILED: "FAILED",
  RETRY: "RETRY",
};

const TERMINAL_STAGE = RESUME_PROCESSING_STAGES[RESUME_PROCESSING_STAGES.length - 1];

const isFailureStatus = (status) => ["FAILED", "FAILURE", "DEAD"].includes(String(status || "").toUpperCase());

// Seeds the stepper with what the initial REST row already tells us (only
// the current stage, not full history) so the card never renders blank
// before the first WS push arrives. Once the row carries a full stages[] —
// one entry per stage, in pipeline order — that's used as-is instead.
function seedStages(file) {
  if (Array.isArray(file.stages) && file.stages.length > 0) return file.stages;

  const currentStage = file.pipeline_stage || file.current_stage;
  const status = String(file.parse_status || "").toUpperCase();
  if (!currentStage) return [];
  if (status === "PARSING") return [{ stage: currentStage, status: "RUNNING" }];
  if (status === "FAILED") return [{ stage: currentStage, status: "FAILED", error_message: file.error_message }];
  return [];
}

export default function ResumeProcessingCard({ file, onTerminal }) {
  const resumeId = file.id || file.resume_id;

  const [stages, setStages] = useState(() => seedStages(file));
  // Retries re-queue the resume under a NEW task id, so the socket
  // subscription can't stay pinned to the id this card was mounted with.
  const [taskId, setTaskId] = useState(file.task_id || resumeId);
  // Fields the socket can't supply, refreshed from processing-status: the
  // task-level retry budget and the error pair.
  const [taskDetail, setTaskDetail] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const hasNotifiedTerminal = useRef(false);

  const { hasRole } = useAuth();
  const isRecruiter = hasRole(["RECRUITER"]);

  // The socket carries no terminal event, so the final state (and the
  // task-level retry counters) is pulled once the last stage lands or a stage
  // fails. Silent by design — the user didn't ask for this fetch.
  const backfillDetail = async (id) => {
    if (!id) return;
    try {
      const res = await pipelineStatus(id);
      if (res?.data) setTaskDetail(res.data);
    } catch {
      // Keep whatever the socket last gave us.
    }
  };

  useAirsSocket(taskId ? `/ws/resumes/processing-status/${taskId}` : null, {
    onEvent: (message) =>
      dispatchAirsEvent(message, {
        // Stage-scoped only (see app/websocket/events.py): stage/status/
        // error_message/duration_ms plus the stage-level attempt counters.
        // Carries no overall_status, and a FAILED stage here must not be read
        // as a failed task — see the status note below.
        "stage.completed": (data) => {
          if (!data?.stage) return;
          setStages((prev) => {
            const next = [...prev];
            const idx = next.findIndex((s) => s.stage === data.stage);
            const entry = {
              stage: data.stage,
              status: data.status,
              error_message: data.error_message,
              duration_ms: data.duration_ms,
              attempt_number: data.attempt_number,
              max_attempts: data.max_attempts,
              retries_remaining: data.retries_remaining,
            };
            if (idx >= 0) next[idx] = { ...next[idx], ...entry };
            else next.push(entry);
            return next;
          });

          if (data.stage === TERMINAL_STAGE || isFailureStatus(data.status)) {
            backfillDetail(data.task_id || taskId);
          }
        },
        // A retry restarted the pipeline: the stored stages must be DROPPED
        // before the replayed VALIDATION/…/PERSISTENCE events arrive, or the
        // fresh run reads as extra attempts stacked on the failed one. Resume
        // retries always re-queue under a new task id, so the subscription
        // moves with it.
        "task.reset": (data) => {
          setStages([]);
          setTaskDetail(null);
          hasNotifiedTerminal.current = false;
          if (data?.new_task_id) setTaskId(data.new_task_id);
        },
        // Resumes are linked to their campaign candidate at upload time, so
        // there is nothing this card needs to change on task.linked — kept
        // in the map so the event is explicitly acknowledged, not silently
        // dropped by an unhandled-event path.
        "task.linked": () => {},
      }),
  });

  const stageMap = buildStageMap(stages);
  const failedStage = stages.find((s) => isFailureStatus(s.status));

  // The card's overall status comes from the TASK (parse_status), never from
  // the stage rows. A failed stage only paints that one step red in the
  // stepper — the pipeline may still have retries left in its budget, and only
  // the backend knows. Deriving "Failed" from a stage row is what made the card
  // offer a Retry the backend then rejected with a 409.
  const restStatus = String(taskDetail?.parse_status || file.parse_status || "").toUpperCase();
  const taskStatus = PARSE_STATUS_TO_OVERALL[restStatus] || "QUEUED";
  // Only ever nudges QUEUED -> RUNNING once stages start landing; never to a
  // terminal state.
  const displayStatus = taskStatus === "QUEUED" && stages.length > 0 ? "RUNNING" : taskStatus;

  useEffect(() => {
    const isTerminal = ["SUCCESS", "FAILED", "FAILURE"].includes(displayStatus);
    if (isTerminal && !hasNotifiedTerminal.current) {
      hasNotifiedTerminal.current = true;
      onTerminal?.();
    }
  }, [displayStatus, onTerminal]);

  const handleRetry = async () => {
    if (!resumeId) return;
    setIsRetrying(true);
    try {
      const res = await retryResume(resumeId);
      toast.success(res?.message || "Retry queued for this resume.");
      // No optimistic clear here — task.reset does it, and carries the new
      // task id this card has to follow.
    } catch (err) {
      toast.error(retryErrorMessage(err, "Failed to retry this resume."));
    } finally {
      setIsRetrying(false);
    }
  };

  const meta = overallStatusMeta(displayStatus);
  const errorMessage = taskDetail?.error_message || failedStage?.error_message || file.error_message;
  const errorDetail = taskDetail?.error_detail || failedStage?.error_detail || file.error_detail;
  const canRetry = isRecruiter && isFailureStatus(displayStatus);

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
          <RetryAttemptBadge
            status={displayStatus}
            retryCount={taskDetail?.retry_count ?? file.retry_count}
            maxAttempts={taskDetail?.max_attempts ?? file.max_attempts}
            className="hidden md:inline"
          />
          {canRetry && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRetry();
              }}
              disabled={isRetrying}
              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition disabled:opacity-50"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
              {isRetrying ? "Retrying..." : "Retry"}
            </button>
          )}
        </div>
      }
    >
      <li className="list-none">
        <p className="text-[11px] text-slate-400 font-mono mb-3">
          Task #{String(taskId || "").slice(0, 8)}
        </p>

        <ProcessingErrorPanel message={errorMessage} detail={errorDetail} className="mb-4" />

        <StageStepper stages={RESUME_PROCESSING_STAGES} stageLabels={STAGE_LABELS} stageMap={stageMap} />
      </li>
    </ExpandableList>
  );
}
