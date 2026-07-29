import React from "react";
import { renderDeterministicStatusBadge } from "../../../../utils/scoreBreakdownUtils.jsx";

// Section A — Overall Deterministic Score, Passed/Failed, Threshold, Coverage.
export default function ScoreCard({ scoreCard }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12.5px] font-bold text-slate-900">Deterministic Score Card</span>
        {renderDeterministicStatusBadge(scoreCard.status)}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
          <div className="text-[10.5px] text-slate-400">Overall Score</div>
          <div className="text-[17px] font-extrabold text-slate-900">{scoreCard.overallScore.toFixed(2)}</div>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
          <div className="text-[10.5px] text-slate-400">Pass Threshold</div>
          <div className="text-[17px] font-extrabold text-slate-900">{scoreCard.threshold}</div>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
          <div className="text-[10.5px] text-slate-400">Mandatory Coverage</div>
          <div className="text-[17px] font-extrabold text-slate-900">{scoreCard.coverage.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}
