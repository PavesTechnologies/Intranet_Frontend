import React from "react";

function ScoreBar({ label, value, weightPct, color }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11.5px] mb-1">
        <span className="text-slate-500">
          {label} <span className="text-slate-400">({weightPct}% weight)</span>
        </span>
        <span className="font-semibold text-slate-900">{value.toFixed(2)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// Section H — Score Calculation: Skills / Experience / Education → Final.
export default function ScoreCalculation({ scoreCalculation }) {
  const { skillsScore, experienceScore, educationScore, finalScore } = scoreCalculation;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <span className="text-[12.5px] font-bold text-slate-900">Score Calculation</span>

      <ScoreBar label="Skills Score" value={skillsScore} weightPct={70} color="#2563EB" />
      <ScoreBar label="Experience Score" value={experienceScore} weightPct={15} color="#7C3AED" />
      <ScoreBar label="Education Score" value={educationScore} weightPct={15} color="#0D9488" />

      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-3 mt-2">
        <span className="text-[12px] font-semibold text-slate-600">Final Deterministic Score</span>
        <span className="text-[16px] font-extrabold text-slate-900">{finalScore.toFixed(2)} / 100</span>
      </div>
    </div>
  );
}
