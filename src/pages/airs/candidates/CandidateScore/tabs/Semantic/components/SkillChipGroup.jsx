import React from "react";
import { Badge } from "@/components/ui/badge";

const TONE = {
  matching: "bg-emerald-50 text-emerald-700 border-emerald-100",
  missing: "bg-rose-50 text-rose-700 border-rose-100",
  neutral: "bg-blue-50 text-blue-700 border-blue-100",
};

// Matching Skills / Missing Skills / Matched Keywords — rendered as chips off
// semantic_score_breakdown.matching_skills / .missing_skills / .matched_keywords.
export default function SkillChipGroup({ title, items, tone = "neutral" }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <span className="text-[12.5px] font-bold text-slate-900 block mb-2.5">{title}</span>
      {!items || items.length === 0 ? (
        <p className="text-[11.5px] text-slate-400">No data available</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <Badge key={i} className={`${TONE[tone]} font-medium px-2.5 py-1 text-[11px]`}>
              {item}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
