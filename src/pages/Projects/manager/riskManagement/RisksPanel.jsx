import { AlertIcon, UserIcon, CalendarIcon } from "../../../../components/icons";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Pagination from "../../../../components/Pagination/pagination";

/* ---------- UI utils ---------- */

function formatStatus(status) {
  if (!status) return "";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getStatusColor(status) {
  const colors = {
    Identified: "bg-blue-100 text-blue-700",
    Analyzed:   "bg-purple-100 text-purple-700",
    Monitoring: "bg-yellow-100 text-yellow-700",
    Mitigated:  "bg-green-100 text-green-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

function getRiskBadgeColor(score) {
  if (score >= 20) return "bg-red-100 text-red-700 border-red-200";
  if (score >= 12) return "bg-orange-100 text-orange-700 border-orange-200";
  if (score >= 6)  return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-green-100 text-green-700 border-green-200";
}

function getRiskCardBg(score) {
  if (score >= 20) return "bg-red-50 border-red-100";
  if (score >= 12) return "bg-orange-50 border-orange-100";
  if (score >= 6)  return "bg-amber-50 border-amber-100";
  return "bg-emerald-50 border-emerald-100";
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "numeric", year: "2-digit",
  });
}

/* ---------- Component ---------- */

export default function RisksPanel({
  selectedIssue,
  data,
  isLoadingRisks,
  onPageChange,
  onSelectRisk,
}) {
  const risks      = data?.items      || [];
  const summary    = data?.summary;
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">

      {/* Summary metric cards */}
      {selectedIssue && summary && (
        <div className="grid grid-cols-3 gap-3 flex-shrink-0">
          <SummaryCard label="TOTAL RISKS"    value={summary.totalRisks}        />
          <SummaryCard label="HIGH SEVERITY"  value={summary.highSeverityCount} variant="danger" />
          <SummaryCard label="AVG SCORE"      value={summary.avgRiskScore}      variant="info"   />
        </div>
      )}

      {/* Risks list panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden">

        {/* Panel header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50 flex justify-between items-start flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">
              {selectedIssue ? `Risks for ${selectedIssue.title}` : "Risks"}
            </h2>
            {selectedIssue && (
              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                <div>
                  Issue ID:{" "}
                  <span className="font-semibold text-slate-800">
                    {selectedIssue.linkedType}-{selectedIssue.linkedId}
                  </span>
                </div>
                <div>
                  Source:{" "}
                  <span className="font-semibold text-slate-800">
                    {selectedIssue.linkedType}
                  </span>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">
              {isLoadingRisks
                ? "Loading..."
                : selectedIssue
                ? `${summary?.totalRisks || 0} risk${summary?.totalRisks !== 1 ? "s" : ""} identified`
                : "Select an issue to view risks"}
            </p>
          </div>
        </div>

        {/* Panel body — internal scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {!selectedIssue ? (
            <EmptyState />
          ) : isLoadingRisks ? (
            <LoadingSpinner size="md" text="Loading risks..." />
          ) : risks.length === 0 ? (
            <EmptyRisks />
          ) : (
            <div className="p-4 space-y-3">
              {risks.map((risk) => {
                const badgeColor  = getRiskBadgeColor(risk.riskScore);
                const cardBg      = getRiskCardBg(risk.riskScore);
                const statusLabel = formatStatus(risk.status);
                const date        = formatDate(risk.dueDate ?? risk.createdDate);

                return (
                  <button
                    key={risk.id}
                    onClick={() => onSelectRisk(risk)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition hover:shadow-md ${cardBg}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Score badge + content */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Circular score badge */}
                        <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-sm flex-shrink-0 ${badgeColor}`}>
                          {risk.riskScore ?? "—"}
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 text-sm truncate">
                            {risk.title}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {statusLabel && (
                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${getStatusColor(statusLabel)}`}>
                                {statusLabel}
                              </span>
                            )}
                            {date && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <CalendarIcon className="w-3 h-3" />
                                {date}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Owner */}
                      {risk.owner && (
                        <div className="flex items-center gap-1 text-xs text-slate-600 flex-shrink-0">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{risk.owner}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="border-t border-slate-200 flex-shrink-0">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPrevious={() => onPageChange(pagination.page - 1)}
              onNext={() => onPageChange(pagination.page + 1)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function SummaryCard({ label, value, variant }) {
  const styles = {
    danger:  "bg-red-50 border-red-200 text-red-700",
    info:    "bg-blue-50 border-blue-200 text-blue-700",
    default: "bg-white border-slate-200 text-slate-900",
  };

  return (
    <div className={`p-4 rounded-xl border shadow-sm ${styles[variant] || styles.default}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide mb-1 opacity-70">
        {label}
      </div>
      <div className="text-2xl font-bold">{value ?? "—"}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-8 text-center text-slate-500">
      <AlertIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p className="text-sm">Select an issue to view associated risks</p>
    </div>
  );
}

function EmptyRisks() {
  return (
    <div className="p-8 text-center text-slate-500">
      <AlertIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p className="text-sm">No risks for this issue</p>
    </div>
  );
}
