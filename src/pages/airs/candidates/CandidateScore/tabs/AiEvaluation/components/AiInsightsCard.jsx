import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { arr } from "../../../../utils/candidateDataUtils";

// AI Evaluation tab — Strengths / Watch-outs card, built from
// ai_evaluation_breakdown.strengths / .weaknesses.
export default function AiInsightsCard({ strengths, weaknesses }) {
  const strengthItems = arr(strengths);
  const weaknessItems = arr(weaknesses);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <div className="text-[12px] font-semibold mb-1.5 text-emerald-600">Strengths</div>
        {strengthItems.length ? (
          <ul className="text-[12.5px] space-y-1 text-slate-900">
            {strengthItems.map((s, i) => (
              <li key={i} className="flex gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600 mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-[12px] text-slate-400">No strengths identified.</div>
        )}
      </div>

      <div>
        <div className="text-[12px] font-semibold mb-1.5 text-rose-600">Watch-outs</div>
        {weaknessItems.length ? (
          <ul className="text-[12.5px] space-y-1 text-slate-900">
            {weaknessItems.map((s, i) => (
              <li key={i} className="flex gap-1.5">
                <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-[12px] text-slate-400">No watch-outs identified.</div>
        )}
      </div>
    </div>
  );
}
