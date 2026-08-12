import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  X,
  FileText,
  ChevronRight,
  ArrowRight,
  ListFilter,
  Activity,
  User,
  ShieldAlert,
  Loader2,
  RotateCcw,
} from "lucide-react";
import Modal from "../../../../components/ui/Modal";
import PipelineCandidateScorecardPage from "../../pipeline/PipelineCandidateScorecardPage";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import { useAuth } from "../../../../contexts/AuthContext";
import {
  getBulkUploadProgress,
  getBulkUploadFiles,
  getBulkUploadFileLog,
  getBulkUploadFileDetail,
  getBulkUploadFileTimeline,
  replayBulkUploadFile,
} from "../../service/resumeIntake";
import { STAGE_LABELS } from "../intake/constants/intakeConstants";
import { formatResumeDate } from "../utils/resumeIntakeUtils";

// duration_ms is only populated once a stage has actually finished; a stage
// that's still RUNNING (or one where the backend only set started_at/completed_at
// without a computed duration) previously rendered nothing at all. Falling back
// to computing it from the timestamps, and labeling an in-flight stage instead
// of leaving it blank.
function formatStageDuration(st) {
  if (typeof st.duration_ms === "number") return `${st.duration_ms}ms`;
  if (st.started_at && st.completed_at) {
    const ms = new Date(st.completed_at).getTime() - new Date(st.started_at).getTime();
    if (Number.isFinite(ms) && ms >= 0) return `${ms}ms`;
  }
  if (st.started_at && !st.completed_at) return "In progress…";
  return "";
}

// The full BulkUploadStatus enum (API reference §2) — must match the same
// set used in useBulkUploadJobs.js so this modal's own poll stops exactly
// when the job is actually done, including a PARTIAL_FAILURE/CANCELLED end state.
const TERMINAL_BULK_STATUSES = ["COMPLETED", "PARTIAL_FAILURE", "FAILED", "CANCELLED"];

// Job-level badge (BulkUploadStatus). Distinct from the file-level badge below —
// a job's own terminal states are COMPLETED/PARTIAL_FAILURE/FAILED/CANCELLED,
// not the file-level vocabulary, so reusing one badge for both silently showed
// "In Progress" forever for any job that finished as PARTIAL_FAILURE.
function renderJobStatusBadge(st) {
  const uppercase = String(st || "").toUpperCase();
  if (uppercase === "COMPLETED") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</span>;
  }
  if (uppercase === "PARTIAL_FAILURE") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><AlertTriangle className="w-3 h-3 mr-1" /> Partial Failure</span>;
  }
  if (uppercase === "FAILED") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><ShieldAlert className="w-3 h-3 mr-1" /> Failed</span>;
  }
  if (uppercase === "CANCELLED") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Cancelled</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> In Progress</span>;
}

// File-level badge (BulkUploadFileStatus) — a file's terminal success state is
// PROCESSED (success or duplicate; there's no separate DUPLICATE file-status
// value), not COMPLETED.
function renderFileStatusBadge(st) {
  const uppercase = String(st || "").toUpperCase();
  if (uppercase === "PROCESSED") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Processed</span>;
  }
  if (uppercase === "FAILED") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><ShieldAlert className="w-3 h-3 mr-1" /> Failed</span>;
  }
  if (uppercase === "CANCELLED") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Cancelled</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {uppercase === "QUEUED" ? "Queued" : "Running"}</span>;
}

export default function BulkJobDetailModal({ job, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("files"); // "files" | "log"
  const [progress, setProgress] = useState(job?.progress || null);
  const [files, setFiles] = useState([]);
  const [fileLogs, setFileLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Selected file for timeline/detail inspection
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [fileDetail, setFileDetail] = useState(null);
  const [fileTimeline, setFileTimeline] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // File id currently being resolved to a candidate for the "View Candidate" action
  const [resolvingFileId, setResolvingFileId] = useState(null);

  // Candidate whose scorecard is open as a stacked popup on top of this modal
  // ({ candidateId, resume } or null). Kept as local state instead of
  // navigating away, so this batch-details modal stays mounted underneath
  // untouched (same tab, same poll) when the popup is closed.
  const [scorecardCandidate, setScorecardCandidate] = useState(null);

  // Same reasoning as ResumeUploadHistoryList: HR_ADMIN can't access this
  // screen at all, so the replay action is gated to RECRUITER (verify with
  // backend that RECRUITER is authorized to call /bulk-uploads/{jobId}/files/{fileId}/replay).
  const { hasRole } = useAuth();
  const isRecruiter = hasRole(["RECRUITER"]);

  // File id currently being replayed via the "Replay" action
  const [replayingFileId, setReplayingFileId] = useState(null);

  // Bumped after a successful file replay to force an immediate refetch —
  // the poll below stops once the job reaches a terminal status, so without
  // this, replaying one file inside an already-PARTIAL_FAILURE job would
  // leave the UI stale until the modal is reopened.
  const [refreshToken, setRefreshToken] = useState(0);

  const jobId = job?.bulk_upload_job_id || job?.id || job?.task_id;

  useEffect(() => {
    if (!isOpen || !jobId) return undefined;

    let cancelled = false;
    let isFetching = false;
    let timerId = null;

    const fetchBatchData = async (isFirst = false) => {
      if (isFetching) return;
      isFetching = true;
      if (isFirst) setIsLoading(true);

      let isCompleted = false;

      try {
        const [progRes, filesRes, logRes] = await Promise.allSettled([
          getBulkUploadProgress(jobId),
          getBulkUploadFiles(jobId),
          getBulkUploadFileLog(jobId),
        ]);

        if (cancelled) return;

        if (progRes.status === "fulfilled" && progRes.value?.data) {
          const pData = progRes.value.data;
          setProgress(pData);
          const st = String(pData.status || "").toUpperCase();
          if (TERMINAL_BULK_STATUSES.includes(st)) {
            isCompleted = true;
          }
        }
        if (filesRes.status === "fulfilled") {
          const items = filesRes.value?.data?.items || filesRes.value?.data || [];
          setFiles(Array.isArray(items) ? items : []);
        }
        if (logRes.status === "fulfilled") {
          const entries = logRes.value?.data?.entries || logRes.value?.data || [];
          setFileLogs(Array.isArray(entries) ? entries : []);
        }
      } catch (err) {
        // Handle error gracefully
      } finally {
        isFetching = false;
        if (!cancelled && isFirst) setIsLoading(false);

        // Schedule next poll ONLY after response returns and if job is not completed
        if (!cancelled && !isCompleted) {
          clearTimeout(timerId);
          timerId = setTimeout(() => fetchBatchData(false), 5000);
        }
      }
    };

    fetchBatchData(true);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [isOpen, jobId, refreshToken]);

  const handleInspectFile = async (fileId) => {
    if (!jobId || !fileId) return;
    setSelectedFileId(fileId);
    setIsLoadingDetail(true);
    try {
      const [detailRes, timelineRes] = await Promise.allSettled([
        getBulkUploadFileDetail(jobId, fileId),
        getBulkUploadFileTimeline(jobId, fileId),
      ]);

      if (detailRes.status === "fulfilled") {
        setFileDetail(detailRes.value?.data || null);
      }
      if (timelineRes.status === "fulfilled") {
        setFileTimeline(timelineRes.value?.data || null);
      }
    } catch (err) {
      // transient fail
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // A processed file's candidate_id isn't in the file-list row itself (§5.7's
  // BulkUploadFileGridItem doesn't include it) — only the single-file detail
  // endpoint (§5.8) resolves resume/candidate, so this looks it up on click
  // and forwards straight to the same candidate scorecard the Resume Upload
  // History list already links to, instead of the in-modal timeline drawer.
  const handleViewCandidate = async (f) => {
    const fileId = f.id || f.file_id;
    if (!jobId || !fileId) return;

    setResolvingFileId(fileId);
    try {
      const detailRes = await getBulkUploadFileDetail(jobId, fileId);
      const candidate = detailRes?.data?.candidate;
      if (!candidate?.id) {
        toast.error("No candidate has been resolved for this file yet.");
        return;
      }
      setScorecardCandidate({
        candidateId: candidate.id,
        resume: {
          candidate_full_name: candidate.full_name,
          candidate_email: candidate.email,
          created_at: f.created_at,
          campaign_candidate_id:
            candidate.campaign_candidate_id ??
            candidate.campaignCandidateId ??
            detailRes?.data?.campaign_candidate_id ??
            detailRes?.data?.campaignCandidateId ??
            f.campaign_candidate_id ??
            f.campaignCandidateId,
        },
      });
    } catch (err) {
      toast.error("Failed to resolve the candidate for this file.");
    } finally {
      setResolvingFileId(null);
    }
  };

  // HR_ADMIN-only manual replay for a single FAILED file. Forces an
  // immediate refetch (and resumes polling) afterward, since the batch poll
  // above may have already stopped if the job itself reached a terminal
  // status before this one file got replayed.
  const handleReplayFile = async (f) => {
    const fileId = f.id || f.file_id;
    if (!jobId || !fileId) return;

    setReplayingFileId(fileId);
    try {
      await replayBulkUploadFile(jobId, fileId);
      toast.success("Replay queued for this file.");
      setRefreshToken((t) => t + 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to replay this file.");
    } finally {
      setReplayingFileId(null);
    }
  };

  if (!isOpen || !job) return null;

  const pct = Math.min(100, Math.round(progress?.percent_complete ?? 0));
  const status = progress?.status || job.status || "PROCESSING";

  // A duplicate-resolved file is still reported as PROCESSED (§2: there's no
  // distinct DUPLICATE file-status value). Its own file-detail response used
  // to come back with resume/candidate both null, but the backend now sets
  // task_log.resume_id for the exact-duplicate branch, so get_file_detail
  // resolves the *existing* candidate it matched — "View Candidate" works for
  // duplicates too now, not just fresh files. The file-log cross-reference
  // below is kept purely for the status badge (context: "this was a
  // duplicate"), not to gate the action anymore. A handful of duplicates
  // detected before that backend fix still resolve to null — handleViewCandidate
  // already degrades those to a toast instead of navigating, so no special
  // case is needed here for them.
  const duplicateFilenames = new Set(
    fileLogs
      .filter((l) => String(l.result || "").toUpperCase() === "DUPLICATE")
      .map((l) => l.filename)
  );

  const fileHeaders = ["Filename", "Status", "Retry Count", "Uploaded Date", "Action"];
  const fileColumns = ["filename", "status", "retry", "date", "action"];
  const fileRows = files.map((f) => {
    const st = String(f.status || f.file_status).toUpperCase();
    const filename = f.original_filename || f.filename;
    const isDuplicate = st === "PROCESSED" && duplicateFilenames.has(filename);

    let action;
    if (st === "PROCESSED") {
      const isResolving = resolvingFileId === (f.id || f.file_id);
      action = (
        <Button
          variant="ghost"
          size="small"
          onClick={() => handleViewCandidate(f)}
          disabled={isResolving}
          className="!text-blue-600 hover:!text-blue-700 hover:bg-blue-50 text-xs"
        >
          {isResolving ? "Loading..." : (
            <>{isDuplicate ? "View Existing Candidate" : "View Candidate"} <ArrowRight size={14} className="ml-1" /></>
          )}
        </Button>
      );
    } else {
      // A file that fails before AI extraction succeeds (or is still
      // queued/running) never gets a Resume/candidate row at all — nothing
      // for "View Candidate" to resolve yet, so fall back to the stage timeline.
      const isReplaying = replayingFileId === (f.id || f.file_id);
      action = (
        <div className="flex items-center gap-1 justify-center">
          <Button
            variant="ghost"
            size="small"
            onClick={() => handleInspectFile(f.id || f.file_id)}
            className="!text-blue-600 hover:!text-blue-700 hover:bg-blue-50 text-xs"
          >
            Inspect Timeline <ChevronRight size={14} className="ml-1" />
          </Button>
          {isRecruiter && st === "FAILED" && (
            <Button
              variant="ghost"
              size="small"
              onClick={() => handleReplayFile(f)}
              disabled={isReplaying}
              className="!text-amber-600 hover:!text-amber-700 hover:bg-amber-50 text-xs"
            >
              {isReplaying ? "Replaying..." : (
                <>Replay <RotateCcw size={14} className="ml-1" /></>
              )}
            </Button>
          )}
        </div>
      );
    }

    return {
      filename: (
        <div className="flex items-center gap-2 font-semibold text-slate-800 text-xs">
          <FileText size={15} className="text-blue-600 shrink-0" />
          <span className="truncate max-w-[200px]">{filename || f.id}</span>
        </div>
      ),
      status: isDuplicate ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3 mr-1" /> Duplicate
        </span>
      ) : renderFileStatusBadge(f.status || f.file_status),
      retry: <span className="text-xs text-slate-600 font-mono">{f.retry_count ?? 0}</span>,
      date: <span className="text-xs text-slate-500">{formatResumeDate(f.created_at)}</span>,
      action,
    };
  });

  const logHeaders = ["Filename", "Result", "Reason / Detail", "Timestamp"];
  const logColumns = ["filename", "result", "reason", "timestamp"];
  const logRows = fileLogs.map((l) => ({
    filename: <span className="font-medium text-slate-800 text-xs">{l.filename}</span>,
    result: (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
        l.result === "SUCCESS" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
        l.result === "DUPLICATE" ? "bg-amber-50 text-amber-700 border border-amber-200" :
        "bg-rose-50 text-rose-700 border border-rose-200"
      }`}>
        {l.result}
      </span>
    ),
    reason: <span className="text-xs text-slate-600 truncate max-w-xs">{l.reason || "—"}</span>,
    timestamp: <span className="text-xs text-slate-400">{formatResumeDate(l.timestamp)}</span>,
  }));

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={`Batch Details: ${job.original_filename || "ZIP Upload Job"}`} width="850px">
      <div className="space-y-6">
        {/* Batch Metric Card */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileArchive size={20} className="text-blue-600" />
              <span className="font-bold text-slate-900 text-sm">{job.original_filename || "Archive"}</span>
              <span className="text-xs text-slate-500 font-normal">({job.campaign_name || "Campaign"})</span>
            </div>
            {renderJobStatusBadge(status)}
          </div>

          <div className="space-y-1.5 mb-4">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Overall Processing Completion</span>
              <span className="font-mono font-bold text-slate-900">{pct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 text-center">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-400 uppercase font-semibold">Total Files</div>
              <div className="text-base font-bold text-slate-800">{progress?.total_files ?? files.length ?? 0}</div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
              <div className="text-xs text-emerald-600 uppercase font-semibold">Processed</div>
              <div className="text-base font-bold text-emerald-700">{progress?.processed_count ?? 0}</div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-rose-200">
              <div className="text-xs text-rose-600 uppercase font-semibold">Failed</div>
              <div className="text-base font-bold text-rose-700">{progress?.failed_count ?? 0}</div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-amber-200">
              <div className="text-xs text-amber-600 uppercase font-semibold">Duplicates</div>
              <div className="text-base font-bold text-amber-700">{progress?.duplicate_count ?? 0}</div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500 uppercase font-semibold">Remaining</div>
              <div className="text-base font-bold text-slate-700">{progress?.remaining_count ?? 0}</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("files")}
            className={`py-2 px-4 border-b-2 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              activeTab === "files" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <ListFilter size={14} /> Batch Files ({files.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("log")}
            className={`py-2 px-4 border-b-2 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              activeTab === "log" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <Activity size={14} /> Audit Log ({fileLogs.length})
          </button>
        </div>

        {/* Content Tabs */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <LoadingSpinner text="Fetching batch information..." />
          </div>
        ) : activeTab === "files" ? (
          files.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border rounded-xl bg-slate-50 text-xs">
              No individual files reported in this batch yet.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <GenericTable headers={fileHeaders} rows={fileRows} columns={fileColumns} loading={false} />
            </div>
          )
        ) : (
          fileLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border rounded-xl bg-slate-50 text-xs">
              No audit log entries recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <GenericTable headers={logHeaders} rows={logRows} columns={logColumns} loading={false} />
            </div>
          )
        )}

        {/* Nested File Timeline Inspector Modal/Drawer */}
        {selectedFileId && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end transition-opacity">
            <div className="w-[500px] bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-blue-600" />
                    <h3 className="font-bold text-slate-900 text-sm">File Stage Timeline</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFileId(null)}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                {isLoadingDetail ? (
                  <div className="p-12 text-center text-slate-400">
                    <LoadingSpinner text="Loading file details & timeline..." />
                  </div>
                ) : (
                  <div className="space-y-5 text-xs">
                    {/* Candidate Info Card */}
                    {fileDetail?.candidate && (
                      <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                        <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                          <User size={15} className="text-slate-500" />
                          {fileDetail.candidate.full_name || "Unknown Candidate"}
                        </div>
                        <div className="text-slate-500 text-[11.5px]">{fileDetail.candidate.email}</div>
                        {fileDetail.candidate.jurisdiction && (
                          <div className="inline-block mt-1 px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-semibold">
                            Jurisdiction: {fileDetail.candidate.jurisdiction}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timeline Stages */}
                    <div>
                      <div className="font-bold text-slate-800 text-xs mb-3">Pipeline Execution Stages</div>
                      {fileTimeline?.stages?.length > 0 ? (
                        <div className="space-y-2 border-l-2 border-slate-200 pl-4">
                          {fileTimeline.stages.map((st, idx) => (
                            <div key={idx} className="relative pb-2">
                              <div className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full ${
                                st.status === "SUCCESS" || st.status === "COMPLETED" ? "bg-emerald-500" :
                                st.status === "RUNNING" ? "bg-blue-600 animate-pulse" :
                                st.status === "FAILED" ? "bg-rose-500" : "bg-slate-300"
                              }`} />
                              <div className="flex items-center justify-between font-semibold text-slate-800">
                                <span>{STAGE_LABELS[st.stage] || st.stage}</span>
                                <span className="font-mono text-[10px] text-slate-400">{formatStageDuration(st)}</span>
                              </div>
                              {st.error_message && (
                                <p className="text-rose-600 text-[11px] mt-1 bg-rose-50 p-2 rounded border border-rose-200">
                                  {st.error_message}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic">No stages recorded yet for this file.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <Button variant="secondary" size="small" onClick={() => setSelectedFileId(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>

    <Modal
      isOpen={!!scorecardCandidate}
      onClose={() => setScorecardCandidate(null)}
      title="Candidate Scorecard"
      width="1100px"
    >
      {scorecardCandidate && (
        <PipelineCandidateScorecardPage
          candidateId={scorecardCandidate.candidateId}
          resumeRow={scorecardCandidate.resume}
          onBack={() => setScorecardCandidate(null)}
          variant="modal"
        />
      )}
    </Modal>
    </>
  );
}
