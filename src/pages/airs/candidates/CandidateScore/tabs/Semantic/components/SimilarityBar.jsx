import React from "react";

// Overall Similarity progress bar — semantic_score_breakdown.overall_similarity.
export default function SimilarityBar({ value }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between text-[12.5px] mb-2">
        <span className="font-bold text-slate-900">Overall Similarity</span>
        <span className="font-semibold text-slate-900">{pct}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-[#0D9488]" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}
