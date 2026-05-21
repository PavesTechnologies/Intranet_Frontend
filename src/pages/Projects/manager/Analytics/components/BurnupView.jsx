import React, { useRef } from "react";
import BurnupChart          from "./charts/BurnupChart";
import VelocityMiniChart    from "./charts/VelocityMiniChart";
import ScopeChangeMiniTable from "./ScopeChangeMiniTable";
import DownloadMenu         from "./DownloadMenu";
import {
  downloadChartAsPNG,
  downloadChartAsPDF,
  downloadAsCSV,
  buildBurnupCSV,
} from "../utils/downloadUtils";

const BurnupView = ({
  burnupData,
  velocityData,
  labels,
  scopeChanges,
  sprintName,
  initialPoints,
  dailyBurnup = [],
}) => {
  const chartRef = useRef(null);

  const handlePNG = () =>
    downloadChartAsPNG({ current: chartRef.current?.getCanvas() }, `${sprintName}_Burnup`);
  const handlePDF = () =>
    downloadChartAsPDF({ current: chartRef.current?.getCanvas() }, `${sprintName}_Burnup`);
  const handleCSV = () => {
    const { headers, data } = buildBurnupCSV(
      burnupData
        ? burnupData.labels.map((_, i) => ({
            date:                i + 1,
            sprintDayNumber:     i + 1,
            idealCompletedPoints:burnupData.ideal[i] ?? 0,
            completedPoints:     burnupData.completed[i] ?? null,
            totalScopePoints:    burnupData.totalScope[i] ?? null,
            velocityPoints:      velocityData[i] ?? null,
            isWeekend:           dailyBurnup[i]?.isWeekend ?? false,
          }))
        : []
    );
    downloadAsCSV(data, headers, `${sprintName}_Burnup`);
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
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Scope changes</h3>
          <ScopeChangeMiniTable scopeChanges={scopeChanges} />
        </div>
      </div>
    </div>
  );
};

export default BurnupView;