import React from "react";
import { Badge } from "@/components/ui/badge";
import { Briefcase, GraduationCap } from "lucide-react";
import { textOrDash, isEmpty } from "../../../../utils/candidateDataUtils";

// Backend status vocabulary -> label + tone. Experience uses SKIPPED for
// "no requirement", education NOT_REQUIRED - both mean the same to a user.
const STATUS = {
  PASSED: { label: "Passed", tone: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  FAILED: { label: "Failed", tone: "bg-rose-100 text-rose-800 border-rose-200" },
  NOT_REQUIRED: { label: "Not required", tone: "bg-slate-100 text-slate-600 border-slate-200" },
  SKIPPED: { label: "Not required", tone: "bg-slate-100 text-slate-600 border-slate-200" },
  DATA_MISSING: { label: "No data", tone: "bg-amber-50 text-amber-700 border-amber-200" },
};

// education_validation.field_match
const FIELD_MATCH = {
  FULL_MATCH: { label: "Match", tone: "text-emerald-700" },
  RELATED_FIELD_MATCH: { label: "Related field", tone: "text-emerald-700" },
  MISMATCH: { label: "Mismatch", tone: "text-rose-700" },
  UNKNOWN: { label: "Not recognised", tone: "text-slate-500" },
};

const statusOf = (result) => result.status ?? (isEmpty(result.passed) ? null : result.passed ? "PASSED" : "FAILED");

function StatusBadge({ status }) {
  const s = STATUS[status];
  if (!s) return null;
  return <Badge className={`${s.tone} font-bold px-2.5 py-1 text-[11px]`}>{s.label}</Badge>;
}

function Row({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
      <div className="text-[10.5px] text-slate-400">{label}</div>
      <div className="text-[12.5px] font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Column({ icon: Icon, title, status, children }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-600">
          <Icon size={13} className="text-slate-400" /> {title}
        </span>
        <StatusBadge status={status} />
      </div>
      {children}
    </div>
  );
}

function ExperienceColumn({ exp }) {
  const status = statusOf(exp);
  const notRequired = status === "SKIPPED" || status === "NOT_REQUIRED";
  return (
    <Column icon={Briefcase} title="Experience" status={status}>
      <div className="grid grid-cols-2 gap-2">
        <Row label="Required" value={notRequired || isEmpty(exp.required_years) ? "Not required by the JD" : `${exp.required_years} yrs`} />
        <Row label="Candidate" value={isEmpty(exp.candidate_years) ? "Not found in resume" : `${exp.candidate_years} yrs`} />
        {Number(exp.tolerance) > 0 && <Row label="Tolerance" value={`± ${exp.tolerance} yr`} />}
      </div>
    </Column>
  );
}

function EducationColumn({ edu }) {
  const status = statusOf(edu);
  const notRequired = status === "NOT_REQUIRED" || status === "SKIPPED";
  const fieldChecked = !isEmpty(edu.field_match) && edu.field_match !== "NOT_REQUIRED";
  const fieldLabel = FIELD_MATCH[edu.field_match];

  return (
    <Column icon={GraduationCap} title="Education" status={status}>
      <div className="grid grid-cols-1 gap-2">
        <Row label="Required Degree" value={notRequired ? "Not required by the JD" : textOrDash(edu.required_degree)} />
        <Row label="Candidate Degree" value={isEmpty(edu.candidate_degree) ? "Not found in resume" : edu.candidate_degree} />
        {fieldChecked && (
          <>
            <Row label="Required Field" value={textOrDash(edu.required_field)} />
            <Row
              label="Candidate Field"
              value={
                <span className="flex items-center gap-2">
                  {textOrDash(edu.candidate_field)}
                  {fieldLabel && <span className={`text-[10.5px] font-semibold ${fieldLabel.tone}`}>{fieldLabel.label}</span>}
                </span>
              }
            />
          </>
        )}
        {edu.equivalent_experience_applied && (
          <Row label="Equivalent Experience" value="Applied - experience substitutes for the degree requirement" />
        )}
      </div>
    </Column>
  );
}

// Experience & Education - deterministic_score_breakdown.experience_validation
// / .education_validation.
export default function ValidationSection({ experienceValidation, educationValidation }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ExperienceColumn exp={experienceValidation ?? {}} />
      <EducationColumn edu={educationValidation ?? {}} />
    </div>
  );
}
