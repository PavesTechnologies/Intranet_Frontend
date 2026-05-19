import React, { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import axios from "axios";

import { useSprintBurnup }       from "./hooks/useSprintBurnup";
import { useSprintScopeChanges } from "./hooks/useSprintScopeChanges";
import KpiCards                  from "./components/KpiCards";
import ChartTabBar               from "./components/ChartTabBar";
import BurndownView              from "./components/BurndownView";
import BurnupView                from "./components/BurnupView";

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

  const [sprintId,      setSprintId]      = useState(null);
  const [sprintLoading, setSprintLoading] = useState(true);
  const [sprintError,   setSprintError]   = useState(null);

  useEffect(() => {
    if (!projectId || !token) return;
    setSprintLoading(true);
    setSprintError(null);

    axios
      .get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/active/project/${projectId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then((res) => {
        const sprints = Array.isArray(res.data) ? res.data : [res.data];
        const active  = sprints.find((s) => s.status === "ACTIVE") ?? sprints[0];
        if (active?.id) {
          setSprintId(active.id);
          localStorage.setItem(`active_sprint_${projectId}`, active.id);
        } else {
          setSprintError("no_sprint");
        }
      })
      .catch(() => setSprintError("no_sprint"))
      .finally(() => setSprintLoading(false));
  }, [projectId, token]);

  const { data, loading: burnupLoading, error: burnupError } = useSprintBurnup(sprintId);
  const { changes: scopeChanges } = useSprintScopeChanges(sprintId);

  if (sprintLoading || (sprintId && burnupLoading)) return <AnalyticsSkeleton />;

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

  const { kpis, burndown, burnup, velocity } = data;

  const labels = data.raw.dailyBurnup.map((d) => {
    const date = new Date(d.date);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const sprintName = kpis.sprintName ?? "Sprint";
  const startDate  = kpis.startDate
    ? new Date(kpis.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
  const endDate = kpis.endDate
    ? new Date(kpis.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>{projectName}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>{sprintName}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-700 font-medium">Analytics</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-700 font-medium capitalize">{activeChart}</span>
        </div>
        {startDate && endDate && (
          <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
            {startDate} – {endDate}
          </span>
        )}
      </div>

      <div className="px-6 py-5">
        <KpiCards kpis={kpis} />
        <ChartTabBar activeChart={activeChart} onChange={onChartChange} />

        {activeChart === "burndown" && (
          <BurndownView
            burndownData={burndown}
            velocityData={velocity}
            labels={labels}
            scopeChanges={scopeChanges}
            sprintName={sprintName}
            initialPoints={kpis.initialScope}
            dailyBurnup={data.raw.dailyBurnup}
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