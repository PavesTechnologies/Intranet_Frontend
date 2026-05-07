import {
  AlertCircle,
  Download,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ---------- UI utils ---------- */

function formatStatus(status) {
  if (!status) return "";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getStatusColor(status) {
  const colors = {
    Identified: "bg-blue-100 text-blue-700",
    Analyzed: "bg-purple-100 text-purple-700",
    Monitoring: "bg-yellow-100 text-yellow-700",
    Mitigated: "bg-green-100 text-green-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

function getRiskColor(score) {
  if (score >= 20)
    return { bg: "bg-red-50", text: "text-red-700" };
  if (score >= 12)
    return { bg: "bg-orange-50", text: "text-orange-700" };
  if (score >= 6)
    return { bg: "bg-yellow-50", text: "text-yellow-700" };
  return { bg: "bg-green-50", text: "text-green-700" };
}

/* ---------- Component ---------- */

export default function RisksPanel({
  selectedIssue,
  data,               // <-- full API response
  isLoadingRisks,
  onPageChange,
  onSelectRisk,
}) {
  const risks = data?.items || [];
  const summary = data?.summary;
  const pagination = data?.pagination;

  return (
    <div className="col-span-2 space-y-6">
      {/* Summary */}
      {selectedIssue && summary && (
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="TOTAL RISKS" value={summary.totalRisks} />
          <SummaryCard
            label="HIGH SEVERITY"
            value={summary.highSeverityCount}
            variant="danger"
          />
          <SummaryCard
            label="AVG SCORE"
            value={summary.avgRiskScore}
            variant="info"
          />
        </div>
      )}

      {/* Risks List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50 flex justify-between items-center">
          <div>
            <h2 className="font-semibold text-slate-900">
              Risks {selectedIssue ? `for ${selectedIssue.title}` : ""}
            </h2>
            {selectedIssue && (
              <div className="text-xs text-slate-500 mt-1 space-y-1">
                <div>
                  Issue ID: <span className="font-semibold text-slate-800">{selectedIssue.linkedType}-{selectedIssue.linkedId}</span>
                </div>
                <div>
                  Source: <span className="font-semibold text-slate-800">{selectedIssue.linkedType}</span>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {isLoadingRisks
                ? "Loading..."
                : selectedIssue
                ? `${summary?.totalRisks || 0} risks identified`
                : "Select an issue to view risks"}
            </p>
          </div>
          {/* {selectedIssue && (
            // <button className="p-2 hover:bg-slate-200 rounded-lg transition">
            //   <Download className="w-4 h-4 text-slate-600" />
            // </button>
          )} */}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {!selectedIssue ? (
            <EmptyState />
          ) : isLoadingRisks ? (
            <LoadingState />
          ) : risks.length === 0 ? (
            <EmptyRisks />
          ) : (
            <div className="p-4 space-y-3">
              {risks.map((risk) => {
                const colors = getRiskColor(risk.riskScore);
                const statusLabel = formatStatus(risk.status);

                return (
                  <button
                    key={risk.id}
                    onClick={() => onSelectRisk(risk)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition hover:shadow-md ${colors.bg} border-slate-200`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className={`text-lg font-bold ${colors.text}`}>
                          {risk.riskScore}
                        </div>

                        <div className="font-semibold text-slate-900 mt-1 text-sm">
                          {risk.title}
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                          <span
                            className={`text-xs px-2 py-1 rounded ${getStatusColor(
                              statusLabel
                            )}`}
                          >
                            {statusLabel}
                          </span>
                          <span className="text-xs text-slate-600">
                            P:{risk.prob} I:{risk.impact}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-1 text-xs text-slate-600">
                        <User className="w-3 h-3" />
                        {risk.owner}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination?.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="text-xs text-slate-600">
              Page <span className="font-semibold">{pagination.page}</span> of{" "}
              <span className="font-semibold">{pagination.totalPages}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-1 hover:bg-slate-300 disabled:opacity-50 rounded transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-1 hover:bg-slate-300 disabled:opacity-50 rounded transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function SummaryCard({ label, value, variant }) {
  const styles = {
    danger: "bg-red-50 border-red-200 text-red-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
    default: "bg-white border-slate-200 text-slate-900",
  };

  return (
    <div className={`p-4 rounded-lg border ${styles[variant] || styles.default}`}>
      <div className="text-xs font-semibold mb-2 opacity-80">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-8 text-center text-slate-500">
      <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
      <p className="text-sm">Select an issue to view associated risks</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="p-8 text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p className="text-sm text-slate-500 mt-2">Loading risks...</p>
    </div>
  );
}

function EmptyRisks() {
  return (
    <div className="p-8 text-center text-slate-500">
      <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
      <p className="text-sm">No risks for this issue</p>
    </div>
  );
}
