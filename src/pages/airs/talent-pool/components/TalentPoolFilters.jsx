import React, { useState } from "react";
import { Search, Briefcase, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// GET /talent-pool/candidates' real filters: `skills` (repeatable, OR'd
// together) and `designation` (case-insensitive substring) — both applied
// server-side, not a client-side refine over the current page.
export default function TalentPoolFilters({ skills, addSkill, removeSkill, designation, setDesignation }) {
  const [skillInput, setSkillInput] = useState("");

  const submitSkill = () => {
    if (!skillInput.trim()) return;
    addSkill(skillInput);
    setSkillInput("");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitSkill();
              }
            }}
            placeholder="Add a skill — e.g. Java, then Enter"
            className="outline-none text-[13px] w-full bg-transparent text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
          <Briefcase size={15} className="text-slate-400 shrink-0" />
          <input
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder="Filter by designation — e.g. Backend Engineer"
            className="outline-none text-[13px] w-full bg-transparent text-slate-900"
          />
        </div>
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {skills.map((s) => (
            <Badge
              key={s}
              className="bg-indigo-50 text-indigo-700 border-indigo-100 font-semibold px-2.5 py-1 text-[11px] gap-1"
            >
              {s}
              <button type="button" onClick={() => removeSkill(s)} className="hover:text-indigo-900">
                <X size={11} />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
