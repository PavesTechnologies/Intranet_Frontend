import React from "react";
import { Badge } from "@/components/ui/badge";

function ResultBadge({ result }) {
  const tone = result === "PASS" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-rose-100 text-rose-800 border-rose-200";
  return <Badge className={`${tone} font-bold px-2.5 py-1 text-[11px]`}>{result}</Badge>;
}

function ValidationRow({ label, value }) {
  return (
    <div>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-[12.5px] font-semibold text-slate-900">{value}</div>
    </div>
  );
}

// Sections F & G — Experience Validation and Education Validation.
export default function ValidationSection({ experienceValidation, educationValidation }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12.5px] font-bold text-slate-900">Experience Validation</span>
          <ResultBadge result={experienceValidation.result} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ValidationRow label="Required Experience" value={`${experienceValidation.requiredExperience} yrs`} />
          <ValidationRow label="Candidate Experience" value={`${experienceValidation.candidateExperience} yrs`} />
          <ValidationRow label="Tolerance" value={`± ${experienceValidation.toleranceYears} yr`} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12.5px] font-bold text-slate-900">Education Validation</span>
          <ResultBadge result={educationValidation.result} />
        </div>
        <div className="grid grid-cols-1 gap-3">
          <ValidationRow label="Required Degree" value={educationValidation.requiredDegree} />
          <ValidationRow label="Candidate Degree" value={educationValidation.candidateDegree} />
          <ValidationRow
            label="Equivalent Experience Applied"
            value={educationValidation.equivalentExperienceApplied ? "Yes" : "No"}
          />
        </div>
      </div>
    </div>
  );
}
