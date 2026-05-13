import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AlertIcon, CalendarIcon } from "../../../../components/icons";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Pagination from "../../../../components/Pagination/pagination";
import SearchInput from "../../../../components/filter/Searchbar";

const RISKS_PAGE_SIZE = 2;

function formatStatus(status) {
  if (!status) return "";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getStatusColor(status) {
  const colors = {
    Identified: "bg-blue-100 text-blue-800",
    Analyzed: "bg-purple-100 text-purple-800",
    Monitoring: "bg-amber-100 text-amber-800",
    Mitigated: "bg-emerald-100 text-emerald-800",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

function getSeverityColor(severity) {
  const colors = {
    Critical: "bg-red-100 text-red-800",
    High: "bg-orange-100 text-orange-800",
    Medium: "bg-amber-100 text-amber-800",
    Low: "bg-green-100 text-green-800",
  };
  return colors[severity] || "bg-gray-100 text-gray-700";
}

function getRiskClass(score) {
  if (score >= 20) {
    return {
      card: "bg-red-50 border-red-200",
      badge: "bg-red-100 text-red-800 border-red-300",
    };
  }

  if (score >= 12) {
    return {
      card: "bg-orange-50 border-orange-200",
      badge: "bg-orange-100 text-orange-800 border-orange-300",
    };
  }

  if (score >= 6) {
    return {
      card: "bg-amber-50 border-amber-200",
      badge: "bg-amber-100 text-amber-800 border-amber-300",
    };
  }

  return {
    card: "bg-emerald-50 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
  };
}

function getInitials(name) {
  if (!name) return "?";

  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return null;

  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "numeric",
    year: "2-digit",
  });
}

export default function RisksPanel({
  projectId,
  selectedIssue,
  refreshKey,
  onSelectRisk,
}) {
  const [riskData, setRiskData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [riskPage, setRiskPage] = useState(1);
  const [riskSearch, setRiskSearch] = useState("");

  const axiosInstance = useMemo(() => {
    const instance = axios.create({
      baseURL: window.__APP_CONFIG__.PMS_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    instance.interceptors.request.use(
      (config) => {
        const latestToken = localStorage.getItem("token");

        if (latestToken) {
          config.headers.Authorization = `Bearer ${latestToken}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    return instance;
  }, []);

  useEffect(() => {
    setRiskPage(1);
    setRiskSearch("");
    setRiskData(null);
  }, [selectedIssue]);

  useEffect(() => {
    if (!selectedIssue) {
      setRiskData(null);
      return;
    }

    let cancelled = false;

    async function loadRisks() {
      setIsLoading(true);

      try {
        const isSearching = riskSearch.trim().length > 0;

        const params = {
          projectId,
          page: riskPage,
          size: RISKS_PAGE_SIZE,
          linkedType: selectedIssue.linkedType,
          linkedId: selectedIssue.linkedId,
          ...(isSearching && { search: riskSearch.trim() }),
        };

        const endpoint = isSearching
          ? "/api/risks/linked/search"
          : "/api/risks/linked";

        const res = await axiosInstance.get(endpoint, { params });

        if (!cancelled) {
          setRiskData(res.data);
        }
      } catch (err) {
        console.error("Failed loading risks", err);

        if (!cancelled) {
          setRiskData(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadRisks();

    return () => {
      cancelled = true;
    };
  }, [
    selectedIssue,
    riskPage,
    riskSearch,
    projectId,
    refreshKey,
    axiosInstance,
  ]);

  const risks = riskData?.items || [];
  const summary = riskData?.summary;
  const pagination = riskData?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const isSearching = riskSearch.trim().length > 0;

  const displayRisks = useMemo(() => risks, [risks]);

  const showPagination =
    selectedIssue && totalPages > 1 && displayRisks.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {selectedIssue && summary && (
        <div className="grid flex-shrink-0 grid-cols-3 gap-2 sm:gap-3">
          <SummaryCard label="Total risks" value={summary.totalRisks} />
          <SummaryCard
            label="High severity"
            value={summary.highSeverityCount}
            variant="danger"
          />
          <SummaryCard
            label="Avg score"
            value={Number(summary.avgRiskScore).toFixed(1)}
            variant="info"
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex-shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3.5 sm:px-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold text-slate-900">
                {selectedIssue ? `Risks for ${selectedIssue.title}` : "Risks"}
              </h2>

              {selectedIssue && (
                <p className="mt-0.5 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    {selectedIssue.linkedType}-{selectedIssue.linkedId}
                  </span>
                  &nbsp;·&nbsp;
                  {isLoading
                    ? "Loading…"
                    : isSearching
                      ? `${pagination?.totalItems ?? displayRisks.length} result${
                          (pagination?.totalItems ?? displayRisks.length) !== 1
                            ? "s"
                            : ""
                        }`
                      : `${summary?.totalRisks ?? 0} risk${
                          summary?.totalRisks !== 1 ? "s" : ""
                        }`}
                </p>
              )}
            </div>

            {selectedIssue && (
              <div className="w-full flex-shrink-0 sm:w-52">
                <SearchInput
                  value={riskSearch}
                  onSearch={(val) => {
                    const nextSearch = val || "";

                    setRiskSearch((prev) => {
                      if (prev === nextSearch) return prev;

                      setRiskPage(1);
                      return nextSearch;
                    });
                  }}
                  placeholder="Search risks…"
                />
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!selectedIssue ? (
            <EmptyState />
          ) : isLoading ? (
            <LoadingSpinner size="md" text="Loading risks…" />
          ) : displayRisks.length === 0 ? (
            <EmptyRisks isSearching={isSearching} />
          ) : (
            <div className="space-y-2.5 p-3 sm:p-4">
              {displayRisks.map((risk) => {
                const { card, badge } = getRiskClass(risk.riskScore);
                const date = formatDate(risk.dueDate ?? risk.createdDate);

                return (
                  <button
                    key={risk.id}
                    onClick={() => onSelectRisk(risk)}
                    className={`w-full rounded-xl border p-3.5 text-left transition-all hover:shadow-md active:scale-[0.99] ${card}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold ${badge}`}
                      >
                        {risk.riskScore ?? "—"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold leading-tight text-slate-900">
                          {risk.title}
                        </p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {risk.status && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${getStatusColor(
                                formatStatus(risk.status)
                              )}`}
                            >
                              {formatStatus(risk.status)}
                            </span>
                          )}

                          {risk.severity && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${getSeverityColor(
                                risk.severity
                              )}`}
                            >
                              {risk.severity}
                            </span>
                          )}

                          {date && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                              <CalendarIcon className="h-3 w-3" />
                              {date}
                            </span>
                          )}
                        </div>

                        {risk.prob != null && risk.impact != null && (
                          <p className="mt-1 text-[11px] text-slate-400">
                            P:{risk.prob} × I:{risk.impact}
                          </p>
                        )}
                      </div>

                      {risk.owner && (
                        <div className="flex flex-shrink-0 flex-col items-center gap-1">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700">
                            {getInitials(risk.owner)}
                          </div>

                          <span className="hidden w-14 truncate text-center text-[10px] leading-tight text-slate-500 sm:block">
                            {risk.owner.split(" ")[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {showPagination && (
          <div className="flex-shrink-0 border-t border-slate-200">
            <Pagination
              currentPage={riskPage}
              totalPages={totalPages}
              onPrevious={() => setRiskPage((p) => Math.max(1, p - 1))}
              onNext={() => setRiskPage((p) => Math.min(totalPages, p + 1))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, variant }) {
  const styles = {
    danger: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    default: "bg-white border-slate-200 text-slate-900",
  };

  const labelStyles = {
    danger: "text-red-500",
    info: "text-blue-500",
    default: "text-slate-500",
  };

  return (
    <div
      className={`rounded-xl border p-3 shadow-sm sm:p-4 ${
        styles[variant] || styles.default
      }`}
    >
      <p
        className={`mb-1 text-[10px] font-semibold uppercase tracking-widest ${
          labelStyles[variant] || labelStyles.default
        }`}
      >
        {label}
      </p>

      <p className="text-2xl font-semibold">{value ?? "—"}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-10 text-center text-slate-400">
      <AlertIcon className="mx-auto mb-3 h-10 w-10 opacity-30" />
      <p className="text-sm">Select an issue to view its risks</p>
    </div>
  );
}

function EmptyRisks({ isSearching }) {
  return (
    <div className="p-10 text-center text-slate-400">
      <AlertIcon className="mx-auto mb-3 h-10 w-10 opacity-30" />
      <p className="text-sm">
        {isSearching ? "No matching risks" : "No risks found"}
      </p>
    </div>
  );
}