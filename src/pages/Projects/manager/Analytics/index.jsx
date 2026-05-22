import React, { useState, useEffect } from "react";
import axios from "axios";

import { useSprintBurnup }       from "./hooks/useSprintBurnup";
import { useSprintBurndown }     from "./hooks/useSprintBurnDown";
import { useSprintScopeChanges } from "./hooks/useSprintScopeChanges";
import { toBurndownDatasetsFromBurndown } from "./utils/chartDataTransform";
import KpiCards                  from "./components/KpiCards";
import ChartTabBar               from "./components/ChartTabBar";
import BurndownView              from "./components/BurndownView";
import BurnupView                from "./components/BurnupView";
import SprintDayOverridesPanel   from "./components/SprintDayOverridesPanel";

const SkeletonBlock = ({ className }) => (
  <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />
);

const AnalyticsSkeleton = () => (
  <div className="p-6 space-y-4">
    <div className="grid grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => <SkeletonBlock key={i} className="h-24" />)}
    </div>
    <SkeletonBlock className="h-10 w-56" />
    <SkeletonBlock className="h-80" />
    <div className="grid grid-cols-2 gap-4">
      <SkeletonBlock className="h-48" />
      <SkeletonBlock className="h-48" />
    </div>
  </div>
);

const SprintAnalyticsPage = ({
  projectId,
  projectName,
  activeChart = "burndown",
  onChartChange,
}) => {
  const token = localStorage.getItem("token");

  // const [sprintId,      setSprintId]      = useState(null);
  // const [sprintLoading, setSprintLoading] = useState(true);
  // const [sprintError,   setSprintError]   = useState(null);

  // useEffect(() => {
  //   if (!projectId || !token) return;
  //   setSprintLoading(true);
  //   setSprintError(null);

  //   axios
  //     .get(
  //       `${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/active/project/${projectId}`,
  //       { headers: { Authorization: `Bearer ${token}` } }
  //     )
  //     .then((res) => {
  //       const sprints = Array.isArray(res.data) ? res.data : [res.data];
  //       const active  = sprints.find((s) => s.status === "ACTIVE") ?? sprints[0];
  //       if (active?.id) {
  //         setSprintId(active.id);
  //         localStorage.setItem(`active_sprint_${projectId}`, active.id);
  //       } else {
  //         setSprintError("no_sprint");
  //       }
  //     })
  //     .catch(() => setSprintError("no_sprint"))
  //     .finally(() => setSprintLoading(false));
  // }, [projectId, token]);
  const [sprintId,      setSprintId]      = useState(null);
  const [sprints,       setSprints]       = useState([]);
  const [sprintLoading, setSprintLoading] = useState(true);
  const [sprintError,   setSprintError]   = useState(null);
  const [showOverrides, setShowOverrides] = useState(false);

useEffect(() => {
  if (!projectId || !token) return;
  setSprintLoading(true);
  setSprintError(null);

  axios
    .get(
      `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/sprints`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    .then((res) => {
      const allSprints = Array.isArray(res.data) ? res.data : [res.data];
      if (allSprints.length === 0) {
        setSprintError("no_sprint");
        return;
      }
      setSprints(allSprints);
      // Auto-select the ACTIVE sprint, fallback to first
      const active = allSprints.find((s) => s.status === "ACTIVE") ?? allSprints[0];
      setSprintId(active.id);
    })
    .catch(() => setSprintError("no_sprint"))
    .finally(() => setSprintLoading(false));
}, [projectId, token]);

  const { data, loading: burnupLoading, error: burnupError } = useSprintBurnup(sprintId);
  const { data: burndownRaw, loading: burndownLoading, error: burndownError, refetch: refetchBurndown } = useSprintBurndown(sprintId);
  const { changes: scopeChanges } = useSprintScopeChanges(sprintId);

  if (sprintLoading || (sprintId && (burnupLoading || burndownLoading))) return <AnalyticsSkeleton />;

  if (sprintError === "no_sprint" || !sprintId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-base font-medium text-slate-600">No active sprint found</p>
        <p className="text-sm mt-1 text-slate-400">Start a sprint to view analytics</p>
      </div>
    );
  }

  if (burnupError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-base font-medium text-red-500">Failed to load analytics</p>
        <p className="text-sm mt-1 text-slate-400">{burnupError}</p>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, burnup, velocity } = data;

  const labels = data.raw.dailyBurnup.map((d) => {
    const date = new Date(d.date);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  // Build burndown chart data from the dedicated burndown endpoint
  const burndownDailyData = burndownRaw?.dailyBurn ?? [];
  const burndownChartData = burndownDailyData.length > 0
    ? toBurndownDatasetsFromBurndown(burndownDailyData)
    : null;
  const burndownLabels = burndownDailyData.length > 0
    ? burndownDailyData.map((d) => new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }))
    : labels;
  const burndownVelocity = burndownDailyData.length > 0
    ? burndownDailyData.map((d) => d.velocityPoints ?? 0)
    : velocity;

  const sprintName = kpis.sprintName ?? "Sprint";
  const startDate  = kpis.startDate
    ? new Date(kpis.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
  const endDate = kpis.endDate
    ? new Date(kpis.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  const dailyBurnupForOverrides = burndownDailyData.length > 0 ? burndownDailyData : data.raw.dailyBurnup;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={sprintId ?? ""}
            onChange={(e) => setSprintId(e.target.value)}
            className="text-sm text-slate-700 font-medium bg-transparent border border-slate-200 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.status === "ACTIVE" ? "🟢" : ""}
              </option>
            ))}
          </select>

          {/* Sprint day overrides trigger */}
          <button
            onClick={() => setShowOverrides(true)}
            title="Configure holidays & working weekends"
            className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        </div>

        {startDate && endDate && (
          <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
            {startDate} – {endDate}
          </span>
        )}
      </div>

      {/* Sprint day overrides modal */}
      {showOverrides && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowOverrides(false); }}
        >
          <div className="w-full max-w-2xl bg-slate-50 rounded-2xl shadow-xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
              <div>
                <p className="text-sm font-semibold text-slate-800">Sprint day overrides</p>
                <p className="text-xs text-slate-400 mt-0.5">{sprintName}</p>
              </div>
              <button
                onClick={() => setShowOverrides(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            {/* Panel content */}
            <div className="p-5">
              <SprintDayOverridesPanel
                dailyBurnup={dailyBurnupForOverrides}
                sprintId={sprintId}
                onRefetch={refetchBurndown}
              />
            </div>
          </div>
        </div>
      )}


      <div className="px-6 py-5">
        <KpiCards kpis={kpis} />
        <ChartTabBar activeChart={activeChart} onChange={onChartChange} />

        {activeChart === "burndown" && (
          <BurndownView
            burndownData={burndownChartData}
            velocityData={burndownVelocity}
            labels={burndownLabels}
            scopeChanges={scopeChanges}
            sprintName={sprintName}
            initialPoints={kpis.initialScope}
            dailyBurnup={burndownDailyData.length > 0 ? burndownDailyData : data.raw.dailyBurnup}
            sprintId={sprintId}
            onRefetch={refetchBurndown}
          />
        )}

        {activeChart === "burnup" && (
          <BurnupView
            burnupData={burnup}
            velocityData={velocity}
            labels={labels}
            scopeChanges={scopeChanges}
            sprintName={sprintName}
            initialPoints={kpis.initialScope}
            dailyBurnup={data.raw.dailyBurnup}
          />
        )}
      </div>
    </div>
  );
};

export default SprintAnalyticsPage;