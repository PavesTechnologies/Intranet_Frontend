import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  Clock,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { getMyJDUploads } from "../service/jdservice";
import { Badge } from "../../../components/ui/badge";
import LoadingSpinner from "../../../components/LoadingSpinner";
import ExpandableList from "../../../components/List/List";
import Pagination from "../../../components/Pagination/pagination";

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

const formatStageLabel = (stage) =>
  STAGE_LABELS[stage] ||
  String(stage || "")
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");

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

const overallStatusMeta = (status) => {
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

function StageStep({ stage, status, errorMessage, isLast }) {
  const s = String(status || "").toUpperCase();
  let icon = <Circle className="h-3.5 w-3.5 text-slate-300" />;
  let ring = "border-slate-200 bg-white";
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
        <div className={`h-7 w-7 rounded-full border flex items-center justify-center ${ring}`}>
          {icon}
        </div>
        <span className="text-[9px] font-bold uppercase tracking-tight text-slate-400 text-center leading-tight">
          {formatStageLabel(stage)}
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

export default function JdProcessingList() {
  const [uploads, setUploads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const fetchUploads = async (silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const res = await getMyJDUploads();
      setUploads(res?.data || []);
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
            const meta = overallStatusMeta(u.status);
            const stageMap = new Map();
            (u.stages || []).forEach((s) => {
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
            const isSuccess = String(u.status).toUpperCase() === "SUCCESS";

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
                    {isSuccess && u.jd_id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/airs/jds/${u.jd_id}`);
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
                      >
                        View JD <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                }
              >
                <li className="list-none">
                  <p className="text-[11px] text-slate-400 font-mono mb-3">
                    Task #{String(u.task_id || "").slice(0, 8)}
                  </p>

                  {u.error_message && (
                    <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg px-3 py-2 text-[11px] font-medium mb-4">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      {u.error_message}
                    </div>
                  )}

                  <div className="flex items-start overflow-x-auto pb-1">
                    {ALL_STAGES.map((stage, idx) => {
                      const stageData = stageMap.get(stage);
                      return (
                        <StageStep
                          key={stage}
                          stage={stage}
                          status={stageData?.status}
                          errorMessage={stageData?.error_message}
                          isLast={idx === ALL_STAGES.length - 1}
                        />
                      );
                    })}
                  </div>
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
