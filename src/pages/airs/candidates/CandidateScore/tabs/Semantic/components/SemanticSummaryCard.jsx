import React from "react";
import { Badge } from "@/components/ui/badge";
import { textOrDash, numberOr, isEmpty } from "../../../../utils/candidateDataUtils";

function StatTile({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
      <div className="text-[10.5px] text-slate-400">{label}</div>
      <div className="text-[17px] font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

// Semantic Score tab — Summary card, built directly from
// semantic_score_breakdown.summary. Uses semantic_passed (rather than
// summary.status) to drive the PASS/FAIL badge tone per spec.
export default function SemanticSummaryCard({ summary, semanticPassed }) {
  const tone = semanticPassed ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-rose-100 text-rose-800 border-rose-200";
  const label = semanticPassed ? "PASS" : "FAIL";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12.5px] font-bold text-slate-900">Semantic Score Card</span>
        <Badge className={`${tone} font-bold px-3 py-1 text-[11px]`}>{label}</Badge>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatTile
          label="Overall Similarity"
          value={isEmpty(summary.overall_score) ? "-" : `${(numberOr(summary.overall_score) * 100).toFixed(1)}%`}
        />
        <StatTile label="Status" value={textOrDash(summary.status)} />
        <StatTile label="Threshold" value={isEmpty(summary.threshold) ? "-" : `${(numberOr(summary.threshold) * 100).toFixed(0)}%`} />
        <StatTile label="Matching Skills" value={numberOr(summary.matching_skills_count, 0)} />
        <StatTile label="Missing Skills" value={numberOr(summary.missing_skills_count, 0)} />
        <StatTile label="Matched Keywords" value={numberOr(summary.matched_keywords_count, 0)} />
      </div>
    </div>
  );
}
