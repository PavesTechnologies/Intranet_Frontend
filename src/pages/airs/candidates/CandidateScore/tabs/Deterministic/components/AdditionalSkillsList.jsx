import React from "react";
import { Badge } from "@/components/ui/badge";
import { textOrDash } from "../../../../utils/candidateDataUtils";

function skillLabel(item) {
  if (typeof item === "string") return item;
  return textOrDash(item?.canonical_name ?? item?.skill_name ?? item?.name ?? item?.jd_skill ?? item?.candidate_skill);
}

// Additional Candidate Skills — deterministic_score_breakdown.additional_candidate_skills.
export default function AdditionalSkillsList({ items }) {
  if (!items || items.length === 0) {
    return <p className="text-[11.5px] text-slate-400 py-2">No data available</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <Badge key={i} className="bg-indigo-50 text-indigo-700 border-indigo-100 font-medium px-3 py-1.5 text-[11.5px]">
          {skillLabel(item)}
        </Badge>
      ))}
    </div>
  );
}
