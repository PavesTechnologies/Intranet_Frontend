import React from "react";
import { Star, StarOff, MapPin, Briefcase } from "lucide-react";

export default function TalentPoolCard({ candidate, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600">
          {candidate.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[13.5px] truncate text-slate-900">{candidate.name}</div>
          <div className="text-[11.5px] truncate text-slate-400">{candidate.role}</div>
        </div>
        {candidate.starred ? (
          <Star size={15} className="fill-amber-500 text-amber-500 shrink-0" />
        ) : (
          <StarOff size={15} className="text-slate-300 shrink-0" />
        )}
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {candidate.matchedSkills.slice(0, 4).map((s) => (
          <span key={s} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
            {s}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11.5px] text-slate-400">
        <span className="flex items-center gap-1"><MapPin size={11} />{candidate.location}</span>
        <span className="flex items-center gap-1"><Briefcase size={11} />{candidate.experience} yrs</span>
      </div>
    </div>
  );
}
