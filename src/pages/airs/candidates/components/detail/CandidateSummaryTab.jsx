import React from "react";
import { Sparkles } from "lucide-react";

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

      <div>
        <div className="text-[12px] font-semibold mb-1.5 text-slate-600">Matched skills</div>
        <div className="flex flex-wrap gap-1.5">
          {candidate.matchedSkills.map((s) => (
            <span key={s} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
              {s}
            </span>
          ))}
        </div>
      </div>

      {candidate.missingSkills.length > 0 && (
        <div>
          <div className="text-[12px] font-semibold mb-1.5 text-slate-600">Missing skills</div>
          <div className="flex flex-wrap gap-1.5">
            {candidate.missingSkills.map((s) => (
              <span key={s} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
