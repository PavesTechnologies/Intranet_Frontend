import React from "react";
import { Badge } from "@/components/ui/badge";
import { Briefcase, GraduationCap } from "lucide-react";
import { textOrDash, isEmpty } from "../../../../utils/candidateDataUtils";

const NEUTRAL_TONE = "bg-slate-100 text-slate-600 border-slate-200";
const PASS_TONE = "bg-emerald-100 text-emerald-800 border-emerald-200";
const FAIL_TONE = "bg-rose-100 text-rose-800 border-rose-200";

// Validation status may arrive as an explicit non-binary status (e.g.
// DATA_MISSING, NOT_REQUIRED) or, absent that, as a plain passed boolean.
function ResultBadge({ status, passed }) {
  if (!isEmpty(status) && status !== "PASSED" && status !== "FAILED") {
    return <Badge className={`${NEUTRAL_TONE} font-bold px-2.5 py-1 text-[11px]`}>{status}</Badge>;
  }
  const label = status ?? (passed ? "PASSED" : "FAILED");
  const tone = label === "PASSED" ? PASS_TONE : FAIL_TONE;
  return <Badge className={`${tone} font-bold px-2.5 py-1 text-[11px]`}>{label}</Badge>;
}

function ValidationRow({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
      <div className="text-[10.5px] text-slate-400">{label}</div>
      <div className="text-[12.5px] font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function ValidationColumn({ icon: Icon, title, badge, children }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-600">
          <Icon size={13} className="text-slate-400" /> {title}
        </span>
        {badge}
      </div>
      {children}
    </div>
  );
}

// Experience Validation & Education Validation —
// deterministic_score_breakdown.experience_validation / .education_validation.
export default function ValidationSection({ experienceValidation, educationValidation }) {
  const exp = experienceValidation ?? {};
  const edu = educationValidation ?? {};

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ValidationColumn icon={Briefcase} title="Experience Validation" badge={<ResultBadge status={exp.status} passed={exp.passed} />}>
        <div className="grid grid-cols-2 gap-2">
          <ValidationRow label="Required Years" value={isEmpty(exp.required_years) ? "-" : `${exp.required_years} yrs`} />
          <ValidationRow label="Candidate Years" value={isEmpty(exp.candidate_years) ? "-" : `${exp.candidate_years} yrs`} />
          <ValidationRow label="Tolerance" value={isEmpty(exp.tolerance) ? "-" : `± ${exp.tolerance} yr`} />
        </div>
      </ValidationColumn>

      <ValidationColumn icon={GraduationCap} title="Education Validation" badge={<ResultBadge status={edu.status} passed={edu.passed} />}>
        <div className="grid grid-cols-1 gap-2">
          <ValidationRow label="Required Degree" value={textOrDash(edu.required_degree)} />
          <ValidationRow label="Candidate Degree" value={textOrDash(edu.candidate_degree)} />
          <ValidationRow
            label="Equivalent Experience Applied"
            value={edu.equivalent_experience_applied ? "Yes" : "No"}
          />
        </div>
      </ValidationColumn>
    </div>
  );
}
