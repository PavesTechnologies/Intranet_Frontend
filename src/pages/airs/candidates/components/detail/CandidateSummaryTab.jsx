import React from "react";
import { Sparkles } from "lucide-react";
import HierarchyMatchResults from "./HierarchyMatchResults";

export default function CandidateSummaryTab({ candidate }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 text-[12.5px]">
        <div>
          <div className="text-slate-400">Current company</div>
          <div className="font-semibold text-slate-900">{candidate.company}</div>
        </div>
        <div>
          <div className="text-slate-400">Education</div>
          <div className="font-semibold text-slate-900">{candidate.education}</div>
        </div>
        <div>
          <div className="text-slate-400">Notice period</div>
          <div className="font-semibold text-slate-900">{candidate.notice}</div>
        </div>
        <div>
          <div className="text-slate-400">Expected salary</div>
          <div className="font-semibold text-slate-900">{candidate.salary}</div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-purple-50">
        <div className="flex items-center gap-1.5 text-[12px] font-bold mb-1.5 text-purple-700">
          <Sparkles size={13} /> AI candidate summary
        </div>
        <p className="text-[12.5px] leading-relaxed text-slate-900">{candidate.summary}</p>
      </div>

      <HierarchyMatchResults
        scoreBreakdown={candidate.scoreBreakdown}
        manualSkills={candidate.manualSkills}
        additionalSkills={candidate.additionalSkills}
      />
    </>
  );
}
