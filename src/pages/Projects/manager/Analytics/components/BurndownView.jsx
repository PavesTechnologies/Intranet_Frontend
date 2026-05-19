import React, { useRef } from "react";
import BurndownChart        from "./charts/BurndownChart";
import VelocityMiniChart    from "./charts/VelocityMiniChart";
import ScopeChangeMiniTable from "./ScopeChangeMiniTable";
import DownloadMenu         from "./DownloadMenu";
import {
  downloadChartAsPNG,
  downloadChartAsPDF,
  downloadAsCSV,
  buildBurndownCSV,
} from "../utils/downloadUtils";

const BurndownView = ({
  burndownData,
  velocityData,
  labels,
  scopeChanges,
  sprintName,
  initialPoints,
  dailyBurnup = [],
}) => {
  const chartRef = useRef(null);

  const handlePNG = () =>
    downloadChartAsPNG({ current: chartRef.current?.getCanvas() }, `${sprintName}_Burndown`);
  const handlePDF = () =>
    downloadChartAsPDF({ current: chartRef.current?.getCanvas() }, `${sprintName}_Burndown`);
  const handleCSV = () => {
    const { headers, data } = buildBurndownCSV(
      burndownData
        ? burndownData.labels.map((_, i) => ({
            date:                 labels[i] ?? "",
            sprintDayNumber:      i + 1,
            idealCompletedPoints: initialPoints - (burndownData.idealRemaining[i] ?? 0),
            completedPoints:
              burndownData.actualRemaining[i] !== null
                ? initialPoints - burndownData.actualRemaining[i]
                : null,
            velocityPoints:    velocityData[i] ?? null,
            addedScopePoints:  null,
            removedScopePoints:null,
            isWeekend:         dailyBurnup[i]?.isWeekend ?? false,
          }))
        : [],
      initialPoints
    );
    downloadAsCSV(data, headers, `${sprintName}_Burndown`);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Daily velocity (points completed)
          </h3>
          <VelocityMiniChart
            labels={labels}
            velocityData={velocityData}
            dailyBurnup={dailyBurnup}
          />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent scope changes</h3>
          <ScopeChangeMiniTable scopeChanges={scopeChanges} />
        </div>
      </div>
    </div>
  );
};

export default BurndownView;