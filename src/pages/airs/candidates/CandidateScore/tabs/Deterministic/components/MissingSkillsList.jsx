import React from "react";
import { AlertTriangle } from "lucide-react";
import { textOrDash } from "../../../../utils/candidateDataUtils";

const IMPORTANCE = {
  core: { label: "Core", tone: "bg-rose-100 text-rose-700 border-rose-200" },
  supporting: { label: "Supporting", tone: "bg-slate-100 text-slate-600 border-slate-200" },
};

// Missing Mandatory Skills — deterministic_score_breakdown.missing_mandatory_skills.
export default function MissingSkillsList({ items }) {
  if (!items || items.length === 0) {
    return <p className="text-[11.5px] text-slate-400 py-2">No required skills are missing.</p>;
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1.5">
          {items.map((r, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[12px] text-rose-700 bg-white/70 rounded-lg px-3 py-1.5"
            >
              <span className="flex items-center gap-2 font-semibold">
                {textOrDash(r.skill)}
                {IMPORTANCE[r.importance] && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${IMPORTANCE[r.importance].tone}`}>
                    {IMPORTANCE[r.importance].label}
                  </span>
                )}
              </span>
              <span className="italic">{textOrDash(r.reason)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
