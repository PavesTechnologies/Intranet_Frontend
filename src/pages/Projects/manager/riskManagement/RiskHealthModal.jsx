import React, { useEffect, useMemo, useState } from "react";
import api from "../../../../api/axiosInstance";
import {
  X,
  AlertTriangle,
  ShieldCheck,
  Info,
  TrendingUp,
} from "lucide-react";

import Button from "../../../../components/Button/Button";

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/* ─────────────────────────────────────────────
   Colour maps
───────────────────────────────────────────── */
const healthStyles = {
  LOW: {
    card: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },

  MEDIUM: {
    card: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },

  HIGH: {
    card: "bg-red-50 text-red-700 border-red-200",
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
    active: "bg-amber-500 border-amber-500 text-white",
    idle: "border-amber-200 text-amber-700 hover:bg-amber-50",
  },

  HIGH: {
    active: "bg-red-600 border-red-600 text-white",
    idle: "border-red-200 text-red-700 hover:bg-red-50",
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

  // ✅ TOKEN SAFE AXIOS INSTANCE
  const axiosInstance = useMemo(() => {
    const instance = api.create({
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
    if (!open) return;

    let cancelled = false;

    const fetchData = async () => {
      try {
        const [summaryRes, projectRes] = await Promise.all([
          axiosInstance.get(
            `/api/projects/project-risk-status/${projectId}`
          ),

          axiosInstance.get(`/api/projects/${projectId}`),
        ]);

        if (cancelled) return;

        setSummary(summaryRes.data);

        setCurrentRisk(projectRes.data.riskLevel);

        setSelectedRisk(projectRes.data.riskLevel);
      } catch (err) {
        console.error("Failed to load risk data", err);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [open, projectId, axiosInstance]);

  const updateRiskLevel = async () => {
    try {
      setLoading(true);

      await axiosInstance.patch(
        `/api/projects/${projectId}/risk-level`,
        {
          riskLevel: selectedRisk,
        }
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
    (summary.totalRiskScore / summary.maxRiskScore) * 100
  );

  const isOverride = selectedRisk !== summary.riskHealth;

  const isNoChange = selectedRisk === currentRisk;

  const sysStyle =
    healthStyles[summary.riskHealth] ?? healthStyles.LOW;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm sm:items-center sm:justify-center">
      <div
        className="
          flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl
          sm:max-h-[88vh] sm:max-w-3xl sm:rounded-2xl sm:mx-4
        "
      >
        {/* HEADER */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
            </div>

            <div>
              <h2 className="text-sm font-bold leading-tight text-slate-800 sm:text-base">
                Project Risk Overview
              </h2>

              <p className="hidden text-[11px] text-slate-400 sm:block">
                Review and set the project risk level
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:grid sm:grid-cols-2 sm:gap-6 sm:px-6 sm:space-y-0">
          {/* LEFT */}
          <div className="space-y-4">
            <div
              className={`rounded-xl border p-4 text-center ${sysStyle.card}`}
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest opacity-70">
                System Calculated
              </p>

              <div className="flex items-center justify-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${sysStyle.dot}`}
                />

                <span className="text-2xl font-black sm:text-3xl">
                  {summary.riskHealth}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-xs font-medium text-slate-500">
                Current Project Level
              </span>

              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                  healthStyles[currentRisk]?.card ?? ""
                }`}
              >
                {currentRisk}
              </span>
            </div>

            {/* <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                  <TrendingUp className="h-3 w-3" />
                  Score Utilization
                </span>

                <span className="text-sm font-bold text-slate-700">
                  {utilization}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${sysStyle.bar}`}
                  style={{
                    width: `${Math.min(utilization, 100)}%`,
                  }}
                />
              </div>

              <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                <span>Score: {summary.totalRiskScore}</span>

                <span>Max: {summary.maxRiskScore}</span>
              </div>
            </div> */}

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Stat
                label="Active Risks"
                value={summary.totalActiveRisks}
              />

              <Stat
                label="Total Score"
                value={summary.totalRiskScore}
              />
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <AlertTriangle className="h-3.5 w-3.5" />
                Distribution
              </h4>

              <div className="grid grid-cols-3 gap-2">
                <RiskPill
                  label="High"
                  value={summary.highRisks}
                  color="red"
                />

                <RiskPill
                  label="Medium"
                  value={summary.mediumRisks}
                  color="yellow"
                />

                <RiskPill
                  label="Low"
                  value={summary.lowRisks}
                  color="green"
                />
              </div>
            </div>

            <div className="border-t border-slate-100" />

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Set Final Risk Level
              </h4>

              <div className="grid grid-cols-2 gap-2">
                {RISK_LEVELS.map((level) => {
                  const styles = levelBtnStyles[level];

                  const isActive = selectedRisk === level;

                  return (
                    <button
                      key={level}
                      onClick={() => setSelectedRisk(level)}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-all duration-150
                        ${
                          isActive
                            ? styles.active
                            : `bg-white ${styles.idle}`
                        }
                        ${
                          isActive
                            ? "scale-[1.02] shadow-sm"
                            : ""
                        }
                      `}
                    >
                      <span
                        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle
                          ${
                            isActive
                              ? "bg-white/70"
                              : healthStyles[level]?.dot ??
                                "bg-slate-400"
                          }
                        `}
                      />

                      {level}
                    </button>
                  );
                })}
              </div>
            </div>

            {isOverride && (
              <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />

                <span>
                  You're overriding the system-calculated risk
                  recommendation.
                </span>
              </div>
            )}

            {isNoChange && !isOverride && (
              <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />

                <span>
                  Selected level matches the current project risk.
                  No change will be made.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-6">
          <span className="hidden text-[11px] text-slate-400 sm:block">
            {isOverride
              ? "⚠ Manual override active"
              : "Matches system recommendation"}
          </span>

          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              variant="outline"
              size="medium"
              onClick={onClose}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              size="medium"
              onClick={updateRiskLevel}
              disabled={loading || isNoChange}
              loading={loading}
              loadingText="Updating…"
              className="flex-1 sm:flex-none"
            >
              Apply Risk Level
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   SUB COMPONENTS
───────────────────────────────────────────── */
const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
    <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
      {label}
    </div>

    <div className="mt-0.5 text-xl font-black text-slate-800">
      {value}
    </div>
  </div>
);

const RiskPill = ({ label, value, color }) => {
  const styles = {
    red: "bg-red-50 border-red-100 text-red-600",
    yellow: "bg-amber-50 border-amber-100 text-amber-600",
    green: "bg-emerald-50 border-emerald-100 text-emerald-600",
  };

  return (
    <div
      className={`rounded-xl border p-3 text-center ${styles[color]}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
        {label}
      </div>

      <div className="mt-0.5 text-2xl font-black">
        {value}
      </div>
    </div>
  );
};

export default RiskHealthModal;