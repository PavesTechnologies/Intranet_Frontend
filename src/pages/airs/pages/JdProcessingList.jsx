import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Clock,
  RefreshCw,
  ArrowRight,
  Trash2,
  RotateCcw,
} from "lucide-react";
import {
  getMyJDUploads,
  deleteJDProcessingTask,
  retryJDProcessingTask,
  getJDProcessingStatus,
  getJDById,
} from "../service/jdservice";
import { useAuth } from "../../../contexts/AuthContext";
import { Badge } from "../../../components/ui/badge";
import LoadingSpinner from "../../../components/LoadingSpinner";
import ExpandableList from "../../../components/List/List";
import Pagination from "../../../components/Pagination/pagination";
import StageStepper, { overallStatusMeta, buildStageMap } from "../components/ProcessingStageStepper";
import ProcessingErrorPanel from "../components/ProcessingErrorPanel";
import RetryAttemptBadge from "../components/RetryAttemptBadge";
import useAirsSocket from "../websockets/useAirsSocket";
import { dispatchAirsEvent } from "../websockets/airsEventDispatch";

const ITEMS_PER_PAGE = 10;

const ALL_STAGES = [
  "VALIDATION",
  "STORAGE",
  "TEXT_EXTRACTION",
  "TEXT_CLEANING",
  "AI_EXTRACTION",
  "JSON_VALIDATION",
  "SKILL_NORMALIZATION",
  "EMBEDDING_GENERATION",
  "PERSISTENCE",
];

const TERMINAL_STAGE = ALL_STAGES[ALL_STAGES.length - 1];

const STAGE_LABELS = {
  VALIDATION: "Validation",
  STORAGE: "Storage",
  TEXT_EXTRACTION: "Text Extraction",
  TEXT_CLEANING: "Text Cleaning",
  AI_EXTRACTION: "AI Extraction",
  JSON_VALIDATION: "JSON Validation",
  SKILL_NORMALIZATION: "Skill Normalization",
  EMBEDDING_GENERATION: "Embedding Generation",
  PERSISTENCE: "Persistence",
};

// The socket only carries stage.completed — there's no task.completed /
// task.failed event yet — so the terminal state is backfilled with a single-row
// REST poll: immediately when PERSISTENCE lands, and otherwise after this much
// silence on a task that's still mid-flight.
const SILENCE_BACKFILL_MS = 30000;

// /my-uploads excludes SUCCESS, so a row vanishes the moment it succeeds. Rows
// that completed in this session are held on screen this long afterwards so the
// user actually sees the green state instead of the row blinking out.
const COMPLETED_ROW_GRACE_MS = 15000;

const isFailureStatus = (status) => ["FAILURE", "FAILED", "DEAD"].includes(String(status || "").toUpperCase());

const formatDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function JdProcessingList() {
  const [uploads, setUploads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [retryingTaskId, setRetryingTaskId] = useState(null);
  const [viewingJdId, setViewingJdId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isHRAdmin = hasRole(["HR_ADMIN"]);

  // task_id -> timestamp the task finished locally. Read by fetchUploads to
  // keep just-completed rows visible even though the endpoint drops them.
  const completedAtRef = useRef(new Map());
  // task_id -> pending silence-backfill timer.
  const backfillTimersRef = useRef(new Map());

  const fetchUploads = async (silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const res = await getMyJDUploads();
      const fresh = res?.data || [];
      setUploads((prev) => {
        const freshIds = new Set(fresh.map((u) => u.task_id));
        const now = Date.now();
        // Rows the server no longer returns but that completed moments ago.
        const retained = prev.filter((u) => {
          if (freshIds.has(u.task_id)) return false;
          const completedAt = completedAtRef.current.get(u.task_id);
          return completedAt && now - completedAt < COMPLETED_ROW_GRACE_MS;
        });
        return [...retained, ...fresh];
      });
    } catch (err) {
      if (!silent) toast.error("Failed to load JD processing uploads.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUploads(false);
  }, []);

  const clearBackfillTimer = (taskId) => {
    const timer = backfillTimersRef.current.get(taskId);
    if (timer) {
      clearTimeout(timer);
      backfillTimersRef.current.delete(taskId);
    }
  };

  // Pulls the authoritative row for one task and patches it in place. This is
  // what closes the gap left by the missing terminal socket event.
  const backfillRow = async (taskId) => {
    clearBackfillTimer(taskId);
    try {
      const res = await getJDProcessingStatus(taskId);
      const row = res?.data;
      if (!row) return;
      if (isFailureStatus(row.status) || String(row.status).toUpperCase() === "SUCCESS") {
        completedAtRef.current.set(taskId, Date.now());
      }
      setUploads((prev) => prev.map((u) => (u.task_id === taskId ? { ...u, ...row } : u)));
    } catch {
      // Silent — the row keeps whatever the socket last gave it.
    }
  };

  const scheduleSilenceBackfill = (taskId) => {
    clearBackfillTimer(taskId);
    backfillTimersRef.current.set(
      taskId,
      setTimeout(() => backfillRow(taskId), SILENCE_BACKFILL_MS)
    );
  };

  useEffect(
    () => () => {
      backfillTimersRef.current.forEach((timer) => clearTimeout(timer));
      backfillTimersRef.current.clear();
    },
    []
  );

  const handleViewJD = async (jdId) => {
    setViewingJdId(jdId);
    try {
      await getJDById(jdId);
      navigate(`/ai-screening/jds/${jdId}`);
    } catch (err) {
      // Error toast already shown by getJDById.
    } finally {
      setViewingJdId(null);
    }
  };

  const handleDeleteTask = async (taskId) => {
    setDeletingTaskId(taskId);
    try {
      await deleteJDProcessingTask(taskId);
      await fetchUploads(true);
    } catch (err) {
      // Error toast already shown by deleteJDProcessingTask.
    } finally {
      setDeletingTaskId(null);
    }
  };

  // Deliberately no refetch on success: the backend answers 202 and the real
  // state change arrives as task.reset on the socket.
  const handleRetryTask = async (taskId) => {
    setRetryingTaskId(taskId);
    try {
      await retryJDProcessingTask(taskId);
    } catch (err) {
      // Error toast already shown by retryJDProcessingTask.
    } finally {
      setRetryingTaskId(null);
    }
  };

  // Live updates after the initial REST load — patches only the affected
  // upload record, never a full refetch/reload.
  useAirsSocket("/ws/job-descriptions/my-uploads", {
    onOpen: () => fetchUploads(true), // reconnect only: reconcile any missed events
    onEvent: (message) =>
      dispatchAirsEvent(message, {
        "stage.completed": (data) => {
          if (!data?.task_id) return;
          setUploads((prev) =>
            prev.map((u) => {
              if (u.task_id !== data.task_id) return u;
              const stages = [...(u.stages || [])];
              const idx = stages.findIndex((s) => s.stage === data.stage);
              const stageEntry = {
                stage: data.stage,
                status: data.status,
                error_message: data.error_message,
                duration_ms: data.duration_ms,
                attempt_number: data.attempt_number,
                max_attempts: data.max_attempts,
                retries_remaining: data.retries_remaining,
              };
              if (idx >= 0) stages[idx] = { ...stages[idx], ...stageEntry };
              else stages.push(stageEntry);

              // A failed STAGE is not a failed TASK: the pipeline may still
              // have attempts left in its retry budget, and only the backend
              // knows. So this event never marks the task failed — it only
              // paints that one stage red in the stepper. The overall status
              // (and with it the Retry button) stays whatever the task-level
              // field says, refreshed by backfillRow() below; otherwise the
              // card offers a Retry the backend answers with a 409.
              // The task-level retry counters are likewise NOT written from
              // this event: its attempt_number/max_attempts are stage-level and
              // count against a different reference point.
              return {
                ...u,
                stages,
                // Only ever nudges QUEUED -> RUNNING; never to a terminal state.
                status: String(u.status || "").toUpperCase() === "QUEUED" ? "RUNNING" : u.status,
                error_message: data.error_message ?? u.error_message,
              };
            })
          );

          // PERSISTENCE has no follow-up event, and a failed stage changes the
          // task-level retry budget this card renders — both need the
          // authoritative row. Everything else just re-arms the silence timer.
          if (data.stage === TERMINAL_STAGE || isFailureStatus(data.status)) backfillRow(data.task_id);
          else scheduleSilenceBackfill(data.task_id);
        },
        // A retry just started: the pipeline replays from its checkpoint, so
        // the old stages must be DROPPED rather than merged — otherwise the
        // replayed VALIDATION/STORAGE/... events read as extra attempts
        // stacked on top of the run that failed.
        "task.reset": (data) => {
          if (!data?.task_id) return;
          completedAtRef.current.delete(data.task_id);
          scheduleSilenceBackfill(data.task_id);
          setUploads((prev) =>
            prev.map((u) =>
              u.task_id === data.task_id
                ? {
                    ...u,
                    stages: [],
                    status: "QUEUED",
                    retry_count: 0,
                    retries_remaining: u.max_attempts ?? u.retries_remaining,
                    error_message: null,
                    error_detail: null,
                  }
                : u
            )
          );
        },
        "task.linked": (data) => {
          if (!data?.task_id) return;
          completedAtRef.current.set(data.task_id, Date.now());
          setUploads((prev) =>
            prev.map((u) => (u.task_id === data.task_id ? { ...u, jd_id: data.document_id ?? u.jd_id } : u))
          );
        },
      }),
  });

  const totalPages = Math.max(1, Math.ceil(uploads.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginatedUploads = uploads.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-500">
          Real-time status of job descriptions submitted for AI parsing and skill extraction.
        </p>
        <button
          onClick={() => fetchUploads(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition disabled:opacity-50 flex-shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <LoadingSpinner text="Loading uploads..." />
        </div>
      ) : uploads.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
          <Clock className="h-10 w-10 mx-auto stroke-1 mb-2" />
          No job descriptions are currently processing.
        </div>
      ) : (
        <>
          {paginatedUploads.map((u) => {
            const status = String(u.status || "").toUpperCase();
            const meta = overallStatusMeta(u.status);
            const stageMap = buildStageMap(u.stages);
            const isSuccess = status === "SUCCESS";
            const isFailure = isFailureStatus(status);
            const isDeleting = deletingTaskId === u.task_id;
            const isRetryPending = retryingTaskId === u.task_id;

            return (
              <ExpandableList
                key={u.task_id}
                title={u.title || "Untitled Job Description"}
                headerRight={
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                      {formatDate(u.queued_at)}
                    </span>
                    <Badge className={`font-semibold px-2.5 py-1 text-xs gap-1.5 ${meta.className}`}>
                      {meta.pulse && (
                        <span className={`w-1.5 h-1.5 rounded-full animate-ping ${meta.dotClassName}`}></span>
                      )}
                      {meta.label}
                    </Badge>
                    <RetryAttemptBadge
                      status={u.status}
                      retryCount={u.retry_count}
                      maxAttempts={u.max_attempts}
                      className="hidden md:inline"
                    />
                    {isSuccess && u.jd_id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewJD(u.jd_id);
                        }}
                        disabled={viewingJdId === u.jd_id}
                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition disabled:opacity-50"
                      >
                        View JD <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isFailure && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetryTask(u.task_id);
                        }}
                        disabled={isRetryPending}
                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition disabled:opacity-50"
                      >
                        <RotateCcw className={`h-3.5 w-3.5 ${isRetryPending ? "animate-spin" : ""}`} />
                        {isRetryPending ? "Retrying..." : "Retry"}
                      </button>
                    )}
                    {isFailure && isHRAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(u.task_id);
                        }}
                        disabled={isDeleting}
                        className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 transition disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                }
              >
                <li className="list-none">
                  <p className="text-[11px] text-slate-400 font-mono mb-3">
                    Task #{String(u.task_id || "").slice(0, 8)}
                  </p>

                  <ProcessingErrorPanel
                    message={u.error_message}
                    detail={u.error_detail}
                    className="mb-4"
                  />

                  <StageStepper stages={ALL_STAGES} stageLabels={STAGE_LABELS} stageMap={stageMap} />
                </li>
              </ExpandableList>
            );
          })}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          />
        </>
      )}
    </div>
  );
}
