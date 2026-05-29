import React, { useRef } from "react";
import BurnupChart          from "./charts/BurnupChart";
import VelocityMiniChart    from "./charts/VelocityMiniChart";
import ScopeChangeMiniTable from "./ScopeChangeMiniTable";
import DownloadMenu         from "./DownloadMenu";
import {
  downloadChartWithScopeAsPNG,
  downloadChartWithScopeAsPDF,
  downloadSectionedCSV,
  buildBurnupCSV,
  buildScopeChangesSection,
} from "../utils/downloadUtils";

const LEGEND_ITEMS_BURNUP = [
  { label: "Completed",        color: "#16A34A", type: "solid-line"  },
  { label: "Total scope",      color: "#6366F1", type: "dashed-line" },
  { label: "Ideal completion", color: "#94A3B8", type: "dashed-line" },
  { label: "▲ Scope added",   color: "#16a34a", type: "text"        },
  { label: "▼ Scope removed", color: "#dc2626", type: "text"        },
  { label: "Weekend",          color: "rgba(148,163,184,0.4)", type: "box" },
  { label: "Holiday",          color: "rgba(251,191,36,0.5)",  type: "box" },
];

const BurnupView = ({
  burnupData,
  velocityData,
  labels,
  scopeChanges,
  sprintName,
  initialPoints,
  dailyBurnup = [],
  startDate,
  endDate,
}) => {
  const chartRef = useRef(null);

  const meta = {
    title:       `Sprint Burnup — ${sprintName ?? "Sprint"}`,
    subtitle:    [startDate, endDate].filter(Boolean).join(" – "),
    legendItems: LEGEND_ITEMS_BURNUP,
  };

  const handlePNG = () =>
    downloadChartWithScopeAsPNG(chartRef.current?.getCanvas(), scopeChanges, `${sprintName}_Burnup`, meta);
  const handlePDF = () =>
    downloadChartWithScopeAsPDF(chartRef.current?.getCanvas(), scopeChanges, `${sprintName}_Burnup`, meta);
  const handleCSV = () => {
    const chartSection = buildBurnupCSV(
      burnupData
        ? burnupData.labels.map((_, i) => ({
            date:                 dailyBurnup[i]?.date ?? i + 1,
            sprintDayNumber:      i + 1,
            idealCompletedPoints: burnupData.ideal[i] ?? 0,
            completedPoints:      burnupData.completed[i] ?? null,
            totalScopePoints:     burnupData.totalScope[i] ?? null,
            velocityPoints:       velocityData[i] ?? null,
            isWeekend:            dailyBurnup[i]?.isWeekend ?? false,
          }))
        : []
    );
    downloadSectionedCSV(
      [{ title: "Burnup Data", ...chartSection }, buildScopeChangesSection(scopeChanges)],
      `${sprintName}_Burnup`
    );
  };

  return (
    <div>
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Sprint burnup</h2>
            <p className="text-sm text-slate-400 mt-0.5">Completed story points over time</p>
          </div>
          <DownloadMenu onPNG={handlePNG} onPDF={handlePDF} onCSV={handleCSV} />
        </div>
        <BurnupChart
          ref={chartRef}
          burnupData={burnupData}
          initialPoints={initialPoints}
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

export default BurnupView;