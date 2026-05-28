import React, { useRef } from "react";
import BurndownChart          from "./charts/BurndownChart";
import VelocityMiniChart      from "./charts/VelocityMiniChart";
import ScopeChangeMiniTable   from "./ScopeChangeMiniTable";
import DownloadMenu           from "./DownloadMenu";
import {
  downloadChartWithScopeAsPNG,
  downloadChartWithScopeAsPDF,
  downloadSectionedCSV,
  buildBurndownCSV,
  buildScopeChangesSection,
} from "../utils/downloadUtils";

const BURNDOWN_META = {
  title:       "Sprint burndown",
  subtitle:    "Remaining story points over time",
  legendItems: [
    { label: "Actual remaining", color: "#4F46E5", type: "solid-line"  },
    { label: "Total scope",      color: "#F59E0B", type: "dashed-line" },
    { label: "Ideal burndown",   color: "#94A3B8", type: "dashed-line" },
    { label: "▲ Scope added",   color: "#16a34a", type: "text"        },
    { label: "▼ Scope removed", color: "#dc2626", type: "text"        },
    { label: "Weekend",          color: "rgba(148,163,184,0.4)", type: "box" },
    { label: "Holiday",          color: "rgba(251,191,36,0.5)",  type: "box" },
  ],
};

const BurndownView = ({
  burndownData,
  velocityData,
  labels,
  scopeChanges,
  sprintName,
  initialPoints,
  dailyBurnup = [],
  sprintId,       // ← new
  onRefetch,      // ← new
}) => {
  const chartRef = useRef(null);

  const handlePNG = () =>
    downloadChartWithScopeAsPNG(chartRef.current?.getCanvas(), scopeChanges, `${sprintName}_Burndown`, BURNDOWN_META);
  const handlePDF = () =>
    downloadChartWithScopeAsPDF(chartRef.current?.getCanvas(), scopeChanges, `${sprintName}_Burndown`, BURNDOWN_META);
  const handleCSV = () => {
    const chartSection = buildBurndownCSV(
      dailyBurnup.map((d, i) => ({
        date:                 labels[i] ?? new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        sprintDayNumber:      d.sprintDayNumber ?? i + 1,
        idealCompletedPoints: initialPoints - (d.idealRemainingPoints ?? 0),
        completedPoints:      d.completedStoryPoints ?? null,
        velocityPoints:       d.velocityPoints ?? null,
        addedScopePoints:     d.addedScopePoints ?? null,
        removedScopePoints:   d.removedScopePoints ?? null,
        isWeekend:            d.isWeekend ?? false,
      })),
      initialPoints
    );
    downloadSectionedCSV(
      [{ title: "Burndown Data", ...chartSection }, buildScopeChangesSection(scopeChanges)],
      `${sprintName}_Burndown`
    );
  };

  return (
    <div>
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Sprint burndown</h2>
            <p className="text-sm text-slate-400 mt-0.5">Remaining story points over time</p>
          </div>
          <DownloadMenu onPNG={handlePNG} onPDF={handlePDF} onCSV={handleCSV} />
        </div>
        <BurndownChart
          ref={chartRef}
          burndownData={burndownData}
          scopeMarkers={[]}
          dailyBurnup={dailyBurnup}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Daily velocity (points completed)
          </h3>
          <VelocityMiniChart
            labels={labels}
            velocityData={velocityData}
            dailyBurnup={dailyBurnup}
          />
        </div> */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Scope changes</h3>
          <ScopeChangeMiniTable scopeChanges={scopeChanges} />
        </div>
      </div>
    </div>
  );
};

export default BurndownView;