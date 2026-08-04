import React from "react";
import { Calculator } from "lucide-react";
import SectionCard from "./SectionCard";
import { isEmpty } from "../../../../utils/candidateDataUtils";

function ScoreBar({ label, value, weightPct, color }) {
  const hasValue = !isEmpty(value);
  return (
    <div>
      <div className="flex items-center justify-between text-[11.5px] mb-1">
        <span className="text-slate-500">
          {label} <span className="text-slate-400">({weightPct}% weight)</span>
        </span>
        <span className="font-semibold text-slate-900">{hasValue ? Number(value).toFixed(2) : "-"}</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: hasValue ? `${Math.min(100, value)}%` : "0%", backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// Score Calculation — deterministic_score_breakdown.score_calculation and
// .configuration weights.
export default function ScoreCalculation({ scoreCalculation, configuration }) {
  const sc = scoreCalculation ?? {};
  const config = configuration ?? {};
  const pct = (w) => (isEmpty(w) ? "-" : Math.round(w * 100));

  return (
    <SectionCard icon={Calculator} title="Score Calculation">
      <div className="space-y-3">
        <ScoreBar label="Skills Score" value={sc.skills_score} weightPct={pct(config.skills_weight)} color="#2563EB" />
        <ScoreBar label="Experience Score" value={sc.experience_score} weightPct={pct(config.experience_weight)} color="#7C3AED" />
        <ScoreBar label="Education Score" value={sc.education_score} weightPct={pct(config.education_weight)} color="#0D9488" />

        <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 p-3 mt-1">
          <span className="text-[12px] font-semibold text-slate-600">Final Deterministic Score</span>
          <span className="text-[16px] font-extrabold text-slate-900">
            {isEmpty(sc.final_score) ? "-" : `${Number(sc.final_score).toFixed(2)} / 100`}
          </span>
        </div>
      </div>
    </SectionCard>
  );
}
