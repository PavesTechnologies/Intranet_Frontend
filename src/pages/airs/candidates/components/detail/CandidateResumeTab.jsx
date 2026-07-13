import React from "react";
import { Eye } from "lucide-react";
import Button from "../../../../../components/Button/Button";

export default function CandidateResumeTab({ candidate }) {
  const sections = [
    ["Experience", `${candidate.experience} years across ${candidate.company} and prior roles`],
    ["Skills", [...candidate.matchedSkills, ...candidate.missingSkills].join(", ")],
    ["Education", candidate.education],
    ["Certifications", "AWS Certified · Scrum Fundamentals"],
    ["Languages", "English (Fluent), Hindi (Native)"],
  ];

  return (
    <div className="rounded-xl p-4 bg-slate-50 border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12.5px] font-bold text-slate-900">Extracted sections</span>
        <Button size="small" variant="ghost">
          <Eye className="h-4 w-4 mr-1" /> View original
        </Button>
      </div>
      {sections.map(([label, value]) => (
        <div key={label} className="mb-3">
          <div className="text-[11px] font-semibold text-slate-400">{label.toUpperCase()}</div>
          <div className="text-[12.5px] text-slate-900">{value}</div>
        </div>
      ))}
    </div>
  );
}
