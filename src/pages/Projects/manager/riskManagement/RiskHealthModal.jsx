import React, { useEffect, useState } from "react";
import axios from "axios";
import { X, AlertTriangle, ShieldCheck, Info, TrendingUp } from "lucide-react";

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/* ── Colour maps ── */
const healthStyles = {
  LOW: {
    card: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  MEDIUM: {
    card: "bg-amber-50  text-amber-700  border-amber-200",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  HIGH: {
    card: "bg-red-50    text-red-700    border-red-200",
    dot: "bg-red-500",
    bar: "bg-red-500",
  },
  CRITICAL: {
    card: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
    bar: "bg-purple-500",
  },
};

const levelBtnStyles = {
  LOW: {
    active: "bg-emerald-600 border-emerald-600 text-white",
    idle: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
  },
  MEDIUM: {
    active: "bg-amber-500  border-amber-500  text-white",
    idle: "border-amber-200  text-amber-700  hover:bg-amber-50",
  },
  HIGH: {
    active: "bg-red-600    border-red-600    text-white",
    idle: "border-red-200    text-red-700    hover:bg-red-50",
  },
  CRITICAL: {
    active: "bg-purple-600 border-purple-600 text-white",
    idle: "border-purple-200 text-purple-700 hover:bg-purple-50",
  },
};

const RiskHealthModal = ({ projectId, open, onClose }) => {
  const [summary, setSummary] = useState(null);
  const [currentRisk, setCurrentRisk] = useState(null);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      try {
        const [summaryRes, projectRes] = await Promise.all([
          axios.get(
            `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/project-risk-status/${projectId}`,
            { headers },
          ),
          axios.get(
            `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}`,
            { headers },
          ),
        ]);
        setSummary(summaryRes.data);
        setCurrentRisk(projectRes.data.riskLevel);
        setSelectedRisk(projectRes.data.riskLevel);
      } catch (err) {
        console.error("Failed to load risk data", err);
      }
    };
    fetchData();
  }, [open, projectId]);

  const updateRiskLevel = async () => {
    try {
      setLoading(true);
      await axios.patch(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/risk-level`,
        { riskLevel: selectedRisk },
        { headers },
      );
      onClose();
    } catch (err) {
      console.error("Failed to update risk level", err);
    } finally {
      setLoading(false);
    }
  };

  if (!open || !summary || !currentRisk) return null;

  const utilization = Math.round(
    (summary.totalRiskScore / summary.maxRiskScore) * 100,
  );
  const isOverride = selectedRisk !== summary.riskHealth;
  const isNoChange = selectedRisk === currentRisk;
  const sysStyle = healthStyles[summary.riskHealth] ?? healthStyles.LOW;

  return (
    /* ── Backdrop — bottom-sheet on mobile, centred card on sm+ ── */
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center sm:justify-center">
      {/* ── Card ── */}
      <div
        className="
        bg-white w-full
        sm:max-w-3xl sm:mx-4
        rounded-t-2xl sm:rounded-2xl
        shadow-2xl flex flex-col
        max-h-[92dvh] sm:max-h-[88vh]
        overflow-hidden
      "
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800 leading-tight">
                Project Risk Overview
              </h2>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Review and set the project risk level
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6">
          {/* ══ LEFT COLUMN ══ */}
          <div className="space-y-4">
            {/* System calculated banner */}
            <div
              className={`border rounded-xl p-4 text-center ${sysStyle.card}`}
            >
              <p className="text-[10px] uppercase tracking-widest font-semibold opacity-70 mb-1">
                System Calculated
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className={`w-2 h-2 rounded-full ${sysStyle.dot}`} />
                <span className="text-2xl sm:text-3xl font-black">
                  {summary.riskHealth}
                </span>
              </div>
            </div>

            {/* Current level chip */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <span className="text-xs text-slate-500 font-medium">
                Current Project Level
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${healthStyles[currentRisk]?.card ?? ""}`}
              >
                {currentRisk}
              </span>
            </div>

            {/* Score utilization bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Score Utilization
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {utilization}%
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${sysStyle.bar}`}
                  style={{ width: `${Math.min(utilization, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                <span>Score: {summary.totalRiskScore}</span>
                <span>Max: {summary.maxRiskScore}</span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Stat label="Active Risks" value={summary.totalActiveRisks} />
              <Stat label="Total Score" value={summary.totalRiskScore} />
            </div>
          </div>

          {/* ══ RIGHT COLUMN ══ */}
          <div className="space-y-4">
            {/* Risk distribution */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Distribution
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <RiskPill label="High" value={summary.highRisks} color="red" />
                <RiskPill
                  label="Medium"
                  value={summary.mediumRisks}
                  color="yellow"
                />
                <RiskPill label="Low" value={summary.lowRisks} color="green" />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100" />

            {/* Final risk selector */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Set Final Risk Level
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {RISK_LEVELS.map((level) => {
                  const s = levelBtnStyles[level];
                  const isActive = selectedRisk === level;
                  return (
                    <button
                      key={level}
                      onClick={() => setSelectedRisk(level)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all duration-150
                        ${isActive ? s.active : `bg-white ${s.idle}`}
                        ${isActive ? "shadow-sm scale-[1.02]" : ""}
                      `}
                    >
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle
                        ${isActive ? "bg-white/70" : (healthStyles[level]?.dot ?? "bg-slate-400")}`}
                      />
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Override warning */}
            {isOverride && (
              <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  You're overriding the system-calculated risk recommendation.
                </span>
              </div>
            )}

            {/* No change notice */}
            {isNoChange && !isOverride && (
              <div className="flex gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Selected level matches the current project risk. No change
                  will be made.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-shrink-0">
          <span className="text-[11px] text-slate-400 hidden sm:block">
            {isOverride
              ? "⚠ Manual override active"
              : "Matches system recommendation"}
          </span>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={updateRiskLevel}
              disabled={loading || isNoChange}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold
                hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Updating…
                </span>
              ) : (
                "Apply Risk Level"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Sub components ── */
const Stat = ({ label, value }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
    <div className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
      {label}
    </div>
    <div className="text-xl font-black text-slate-800 mt-0.5">{value}</div>
  </div>
);

const RiskPill = ({ label, value, color }) => {
  const styles = {
    red: "bg-red-50    border-red-100    text-red-600",
    yellow: "bg-amber-50  border-amber-100  text-amber-600",
    green: "bg-emerald-50 border-emerald-100 text-emerald-600",
  };
  return (
    <div className={`rounded-xl border p-3 text-center ${styles[color]}`}>
      <div className="text-[10px] uppercase tracking-wide font-semibold opacity-70">
        {label}
      </div>
      <div className="text-2xl font-black mt-0.5">{value}</div>
    </div>
  );
};

export default RiskHealthModal;
