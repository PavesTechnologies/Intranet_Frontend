import React from "react";
import { Gauge } from "lucide-react";
import ScoreRing from "../../../../components/ScoreRing";
import { renderAiEvaluationStatusBadge, renderAiRecommendationBadge } from "../../../../utils/scoreBreakdownUtils";
import { numberOr, isEmpty } from "../../../../utils/candidateDataUtils";

function formatScoreLabel(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ScoreTile({ label, value }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5 min-w-0">
      <Gauge size={15} className="shrink-0 text-slate-400" />
      <div className="min-w-0">
        <div className="text-[10px] text-slate-400 truncate">{label}</div>
        <div className="text-[13.5px] font-bold text-slate-900 truncate">{numberOr(value, 0)}</div>
      </div>
    </div>
  );
}

// AI Evaluation tab — Summary card, built from ai_evaluation_breakdown.
// Mirrors the Semantic tab's SummaryCard: hero ScoreRing + status/recommendation
// on the left, per-dimension scores on the right.
export default function AiSummaryCard({ status, effectiveScore, confidence, recommendation, scores }) {
  const passed = status === "COMPLETED";
  const scoreEntries = Object.entries(scores ?? {});
  const confidenceValue = numberOr(confidence, null);
  const confidencePct = isEmpty(confidenceValue) ? null : Math.round(confidenceValue <= 1 ? confidenceValue * 100 : confidenceValue);

  return (
    <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden ${passed ? "border-emerald-100" : "border-slate-100"}`}>
      <div className={`h-1 w-full ${passed ? "bg-emerald-500" : "bg-slate-300"}`} />

      <div className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-4 shrink-0 lg:pr-5 lg:border-r lg:border-slate-100">
            <ScoreRing value={numberOr(effectiveScore, 0)} size={68} color={passed ? "#059669" : "#64748B"} />
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                AI Evaluation
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {renderAiEvaluationStatusBadge(status)}
                {renderAiRecommendationBadge(recommendation)}
              </div>
              <div className="text-[11.5px] text-slate-500 mt-2">
                Confidence <span className="font-bold text-slate-900">{confidencePct === null ? "-" : `${confidencePct}%`}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {scoreEntries.length ? (
              scoreEntries.map(([key, value]) => <ScoreTile key={key} label={formatScoreLabel(key)} value={value} />)
            ) : (
              <div className="text-[12px] text-slate-400 col-span-full">No score breakdown available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
