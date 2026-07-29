import React from "react";
import { ArrowLeft, MapPin, Briefcase, Mail } from "lucide-react";
import ScoreRing from "../../components/ScoreRing";
import { renderStageBadge } from "../../utils/candidateUtils.jsx";

export default function CandidateHeader({ candidate, onBack }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-4">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition shadow-sm shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600">
          {candidate.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[15px] font-bold text-slate-900">{candidate.name}</span>
            {renderStageBadge(candidate.stage)}
          </div>
          <div className="text-[12px] flex items-center gap-3 flex-wrap text-slate-400">
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {candidate.location}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase size={11} />
              {candidate.experience} yrs
            </span>
            <span className="flex items-center gap-1">
              <Mail size={11} />
              {candidate.email}
            </span>
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          <ScoreRing value={candidate.deterministic} size={40} color="#DC2626" />
          <ScoreRing value={candidate.semantic} size={40} color="#7C3AED" />
          <ScoreRing value={candidate.ats} size={40} color="#2563EB" />
          <ScoreRing value={candidate.composite} size={40} color="#16A34A" />
        </div>
      </div>
    </div>
  );
}
