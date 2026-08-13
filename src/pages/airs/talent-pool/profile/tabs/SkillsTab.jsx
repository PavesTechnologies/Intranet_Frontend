import React from "react";
import { Badge } from "@/components/ui/badge";

// Skills tab — the single home for this candidate's skills (the list card
// no longer shows any). Prefers the FULL skill list carried over from the
// Talent Pool list's GET /talent-pool/candidates item (listSkills — no
// extra API call, just data already fetched for that click); falls back to
// GET /talent-pool/candidates/{candidate_id}'s performance_summary.top_5_skills
// (top 5, ranked by occurrence) when the page was opened directly/refreshed
// and that list-click state isn't available.
export default function SkillsTab({ profile, listSkills }) {
  const hasFullList = Array.isArray(listSkills) && listSkills.length > 0;
  const skills = [...(hasFullList ? listSkills : profile.performance_summary.top_5_skills || [])].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <span className="text-[12.5px] font-bold text-slate-900 block mb-2.5">
        {hasFullList ? "Skills" : "Top Skills"}
      </span>
      {skills.length === 0 ? (
        <p className="text-[11.5px] text-slate-400">No matched skills found for this candidate yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <Badge key={s} className="bg-blue-50 text-blue-700 border-blue-100 font-medium px-2.5 py-1 text-[11px]">
              {s}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
