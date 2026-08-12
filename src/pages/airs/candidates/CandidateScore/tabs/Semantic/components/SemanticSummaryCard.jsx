import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, XCircle, Tags, Clock } from "lucide-react";
import ScoreRing from "../../../../components/ScoreRing";
import { numberOr, isEmpty, formatDateTime } from "../../../../utils/candidateDataUtils";

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

// Semantic Score tab — Summary card, built directly from
// semantic_score_breakdown.summary + .overall_similarity. Mirrors the
// Deterministic tab's SummaryCard: hero ScoreRing + status/threshold on the
// left, key stats on the right, pass/fail accent stripe across the top.
export default function SemanticSummaryCard({ summary, semanticPassed, overallSimilarity }) {
  const similarityPct = Math.round((overallSimilarity ?? 0) * 100);
  const tone = semanticPassed ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-rose-100 text-rose-800 border-rose-200";
  const label = semanticPassed ? "PASS" : "FAIL";

  return (
    <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden ${semanticPassed ? "border-emerald-100" : "border-rose-100"}`}>
      <div className={`h-1 w-full ${semanticPassed ? "bg-emerald-500" : "bg-rose-500"}`} />

      <div className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-4 shrink-0 lg:pr-5 lg:border-r lg:border-slate-100">
            <ScoreRing value={similarityPct} size={68} color={semanticPassed ? "#059669" : "#E11D48"} />
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Semantic Score
              </div>
              <Badge className={`${tone} font-bold px-3 py-1 text-[11px]`}>{label}</Badge>
              <div className="text-[11.5px] text-slate-500 mt-2">
                Threshold{" "}
                <span className="font-bold text-slate-900">
                  {isEmpty(summary.threshold) ? "-" : `${(numberOr(summary.threshold) * 100).toFixed(0)}%`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <StatTile icon={CheckCircle2} label="Matching Skills" value={numberOr(summary.matching_skills_count, 0)} />
            <StatTile icon={XCircle} label="Missing Skills" value={numberOr(summary.missing_skills_count, 0)} />
            <StatTile icon={Tags} label="Matched Keywords" value={numberOr(summary.matched_keywords_count, 0)} />
            <StatTile icon={Clock} label="Screened At" value={formatDateTime(summary.screened_at)} />
          </div>
        </div>

        {!isEmpty(summary.failure_reason) && (
          <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-[11.5px] text-rose-700">{summary.failure_reason}</div>
          </div>
        )}
      </div>
    </div>
  );
}
