import React from "react";
import { isEmpty } from "../../../../utils/candidateDataUtils";

const asPct = (v) => (isEmpty(v) ? "-" : `${Math.round(v * 100)}%`);
const asNumber = (v) => (isEmpty(v) ? "-" : v);

const FIELDS = [
  { key: "skills_weight", label: "Skills Weight", format: asPct },
  { key: "functional_weight", label: "Functional Weight", format: asPct },
  { key: "experience_weight", label: "Experience Weight", format: asPct },
  { key: "education_weight", label: "Education Weight", format: asPct },
  { key: "deterministic_threshold", label: "Requirements Threshold", format: asNumber },
  { key: "semantic_threshold", label: "Similar-Skill Match Threshold", format: asNumber },
  { key: "hierarchy_child_multiplier", label: "Hierarchy Child Multiplier", format: asPct },
  { key: "hierarchy_grandchild_multiplier", label: "Hierarchy Grandchild Multiplier", format: asPct },
  { key: "hierarchy_sibling_multiplier", label: "Hierarchy Sibling Multiplier", format: asPct },
  { key: "semantic_multiplier", label: "Similar-Skill Match Multiplier", format: asPct },
];

// Missing-core rule, calculated by the system: this % of core skills,
// capped at the max. Older breakdowns only have the cap.
function missingCoreRule(c) {
  if (isEmpty(c.max_missing_core_skills)) return null;
  if (isEmpty(c.max_missing_core_pct)) return `Up to ${c.max_missing_core_skills}`;
  const allowed = isEmpty(c.allowed_missing_core_skills) ? "" : `${c.allowed_missing_core_skills} - `;
  return `${allowed}${c.max_missing_core_pct}% of core skills, max ${c.max_missing_core_skills}`;
}

// Configuration — deterministic_score_breakdown.configuration.
export default function ConfigurationCard({ configuration }) {
  if (!configuration) {
    return <p className="text-[11.5px] text-slate-400 py-2">No data available</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {missingCoreRule(configuration) && (
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <div className="text-[10.5px] text-slate-400">Missing Core Skills Allowed</div>
          <div className="text-[13px] font-bold text-slate-900">{missingCoreRule(configuration)}</div>
        </div>
      )}
      {FIELDS.map((f) => (
        <div key={f.key} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <div className="text-[10.5px] text-slate-400">{f.label}</div>
          <div className="text-[13px] font-bold text-slate-900">{f.format(configuration[f.key])}</div>
        </div>
      ))}
    </div>
  );
}
