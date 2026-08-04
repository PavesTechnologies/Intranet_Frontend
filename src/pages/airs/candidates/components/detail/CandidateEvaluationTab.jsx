import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import ScoreRing from "../ScoreRing";
import HierarchyMatchResults from "./HierarchyMatchResults";
import NoVerifiedSkillsBanner from "./NoVerifiedSkillsBanner";

export default function CandidateEvaluationTab({ candidate, onAddManualSkill }) {
  return (
    <>
      <NoVerifiedSkillsBanner candidate={candidate} onAddManualSkill={onAddManualSkill} />

      <div className="flex gap-4 justify-around p-4 rounded-xl bg-slate-50">
        <div className="text-center">
          <ScoreRing value={candidate.ats} size={54} color="#2563EB" />
          <div className="text-[11px] mt-1.5 text-slate-400">ATS Score</div>
        </div>
        <div className="text-center">
          <ScoreRing value={candidate.semantic} size={54} color="#7C3AED" />
          <div className="text-[11px] mt-1.5 text-slate-400">Semantic</div>
        </div>
        <div className="text-center">
          <ScoreRing value={candidate.composite} size={54} color="#16A34A" />
          <div className="text-[11px] mt-1.5 text-slate-400">Composite</div>
        </div>
        <div className="text-center">
          <ScoreRing value={candidate.risk} size={54} color={candidate.risk > 60 ? "#DC2626" : "#D97706"} />
          <div className="text-[11px] mt-1.5 text-slate-400">Risk</div>
        </div>
      </div>

      <HierarchyMatchResults
        scoreBreakdown={candidate.scoreBreakdown}
        manualSkills={candidate.manualSkills}
        additionalSkills={candidate.additionalSkills}
      />

      <div>
        <div className="text-[12px] font-semibold mb-1.5 text-emerald-600">Strengths</div>
        <ul className="text-[12.5px] space-y-1 text-slate-900">
          {candidate.strengths.map((s, i) => (
            <li key={i} className="flex gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600 mt-0.5 shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="text-[12px] font-semibold mb-1.5 text-rose-600">Watch-outs</div>
        <ul className="text-[12.5px] space-y-1 text-slate-900">
          {candidate.weaknesses.map((s, i) => (
            <li key={i} className="flex gap-1.5">
              <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
