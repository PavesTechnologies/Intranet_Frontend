import React from "react";
import { ShieldCheck, Cpu, Briefcase, GraduationCap, Layers } from "lucide-react";
import ScoreRing from "../../../../components/ScoreRing";
import { renderAiEvaluationStatusBadge, renderAiRecommendationBadge } from "../../../../utils/scoreBreakdownUtils.jsx";
import { numberOr, isEmpty } from "../../../../utils/candidateDataUtils";

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5 min-w-0">
      <Icon size={15} className="shrink-0 text-slate-400" />
      <div className="min-w-0">
        <div className="text-[10px] text-slate-400 truncate">{label}</div>
        <div className="text-[13.5px] font-bold text-slate-900 truncate">{value}</div>
      </div>
    </div>
  );
}

const pct = (v) => (isEmpty(v) ? "-" : `${numberOr(v)}%`);

// AI Evaluation Score tab — Summary card, built directly from the
// GET .../ai-evaluation response (effective_ai_score, ai_confidence,
// ai_recommendation, ai_response_json.scores). Mirrors the Deterministic and
// Semantic tabs' SummaryCard: hero ScoreRing + status/recommendation on the
// left, sub-score stats on the right.
export default function AiSummaryCard({ status, effectiveScore, confidence, recommendation, scores }) {
  const passed = status === "COMPLETED";
  const scoreValue = isEmpty(effectiveScore) ? 0 : numberOr(effectiveScore);
  const confidencePct = isEmpty(confidence) ? null : Math.round(numberOr(confidence) * 100);
  const ringColor = recommendation === "REJECT" ? "#E11D48" : recommendation === "SHORTLIST" || recommendation === "INTERVIEW" ? "#059669" : "#2563EB";

  return (
    <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden ${passed ? "border-emerald-100" : "border-slate-200"}`}>
      <div className={`h-1 w-full ${passed ? "bg-emerald-500" : "bg-slate-300"}`} />

      <div className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-4 shrink-0 lg:pr-5 lg:border-r lg:border-slate-100">
            <ScoreRing value={Math.round(scoreValue)} size={68} color={ringColor} />
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                AI Evaluation Score
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {renderAiEvaluationStatusBadge(status)}
                {renderAiRecommendationBadge(recommendation)}
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <StatTile icon={ShieldCheck} label="AI Confidence" value={confidencePct === null ? "-" : `${confidencePct}%`} />
            <StatTile icon={Cpu} label="Technical Match" value={pct(scores.technicalMatch)} />
            <StatTile icon={Briefcase} label="Experience Match" value={pct(scores.experienceMatch)} />
            <StatTile icon={GraduationCap} label="Education Match" value={pct(scores.educationMatch)} />
            <StatTile icon={Layers} label="Domain Match" value={pct(scores.domainMatch)} />
          </div>
        </div>
      </div>
    </div>
  );
}
