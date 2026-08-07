import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";

// AI Evaluation Score tab — Strengths / Weaknesses, sourced directly from
// ai_strengths / ai_weaknesses on the GET .../ai-evaluation response.
export default function AiInsightsCard({ strengths, weaknesses }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="text-[12px] font-semibold mb-1.5 text-emerald-600">Strengths</div>
        {strengths.length === 0 ? (
          <p className="text-[12.5px] text-slate-400">None identified.</p>
        ) : (
          <ul className="text-[12.5px] space-y-1 text-slate-900">
            {strengths.map((s, i) => (
              <li key={i} className="flex gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600 mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="text-[12px] font-semibold mb-1.5 text-rose-600">Weaknesses</div>
        {weaknesses.length === 0 ? (
          <p className="text-[12.5px] text-slate-400">None identified.</p>
        ) : (
          <ul className="text-[12.5px] space-y-1 text-slate-900">
            {weaknesses.map((s, i) => (
              <li key={i} className="flex gap-1.5">
                <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
