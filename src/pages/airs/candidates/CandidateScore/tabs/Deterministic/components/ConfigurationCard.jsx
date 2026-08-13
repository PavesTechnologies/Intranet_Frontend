import React from "react";
import { SlidersHorizontal } from "lucide-react";
import SectionCard from "./SectionCard";
import { isEmpty } from "../../../../utils/candidateDataUtils";

const asPct = (v) => (isEmpty(v) ? "-" : `${Math.round(v * 100)}%`);
const asNumber = (v) => (isEmpty(v) ? "-" : v);

const FIELDS = [
  { key: "skills_weight", label: "Skills Weight", format: asPct },
  { key: "experience_weight", label: "Experience Weight", format: asPct },
  { key: "education_weight", label: "Education Weight", format: asPct },
  { key: "deterministic_threshold", label: "Deterministic Threshold", format: asNumber },
  { key: "semantic_threshold", label: "Semantic Threshold", format: asNumber },
  { key: "hierarchy_child_multiplier", label: "Hierarchy Child Multiplier", format: asPct },
  { key: "hierarchy_grandchild_multiplier", label: "Hierarchy Grandchild Multiplier", format: asPct },
  { key: "hierarchy_sibling_multiplier", label: "Hierarchy Sibling Multiplier", format: asPct },
  { key: "semantic_multiplier", label: "Relevance Multiplier", format: asPct },
];

// Configuration — deterministic_score_breakdown.configuration.
export default function ConfigurationCard({ configuration }) {
  return (
    <SectionCard icon={SlidersHorizontal} title="Configuration">
      {!configuration ? (
        <p className="text-[11.5px] text-slate-400 py-2">No data available</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {FIELDS.map((f) => (
            <div key={f.key} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <div className="text-[10.5px] text-slate-400">{f.label}</div>
              <div className="text-[13px] font-bold text-slate-900">{f.format(configuration[f.key])}</div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
