import React from "react";
import { isEmpty } from "../../../../utils/candidateDataUtils";

function ScoreBar({ label, value, weightPct, color }) {
  const hasValue = !isEmpty(value);
  return (
    <div>
      <div className="flex items-center justify-between text-[11.5px] mb-1">
        <span className="text-slate-500">
          {label} <span className="text-slate-400">({weightPct}% weight)</span>
        </span>
        <span className="font-semibold text-slate-900">{hasValue ? Number(value).toFixed(2) : "-"}</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: hasValue ? `${Math.min(100, value)}%` : "0%", backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function CapabilityList({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{title}</div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={`${item.capability}-${i}`} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-[11.5px]">
              <span className="font-semibold text-slate-800">{item.capability}</span>
              <span className="font-semibold text-slate-900">{Math.round(Number(item.score || 0) * 100)}%</span>
            </div>
            {item.evidence && <div className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-2">"{item.evidence}"</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// Score Calculation — deterministic_score_breakdown.score_calculation and
// .configuration weights. Functional (domain capabilities matched against
// resume experience) only appears when the JD has domain capabilities; it is
// scored, never a pass/fail gate.
export default function ScoreCalculation({ scoreCalculation, configuration }) {
  const sc = scoreCalculation ?? {};
  const config = configuration ?? {};
  const pct = (w) => (isEmpty(w) ? "-" : Math.round(w * 100));
  const hasFunctional = !isEmpty(sc.functional_score);
  const requiredCapabilities = Array.isArray(sc.required_domain_capabilities) ? sc.required_domain_capabilities : [];
  const preferredCapabilities = Array.isArray(sc.preferred_domain_capabilities) ? sc.preferred_domain_capabilities : [];

  return (
    <div className="space-y-3">
      <ScoreBar label="Skills Score" value={sc.skills_score} weightPct={pct(config.skills_weight)} color="#2563EB" />
      {hasFunctional && (
        <ScoreBar label="Functional Score" value={sc.functional_score} weightPct={pct(config.functional_weight)} color="#059669" />
      )}
      <ScoreBar label="Experience Score" value={sc.experience_score} weightPct={pct(config.experience_weight)} color="#7C3AED" />
      <ScoreBar label="Education Score" value={sc.education_score} weightPct={pct(config.education_weight)} color="#0D9488" />

      {hasFunctional && (requiredCapabilities.length > 0 || preferredCapabilities.length > 0) && (
        <div className="space-y-3 pt-1">
          <CapabilityList title="Required Domain Capabilities" items={requiredCapabilities} />
          <CapabilityList title="Preferred Domain Capabilities" items={preferredCapabilities} />
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 p-3 mt-1">
        <span className="text-[12px] font-semibold text-slate-600">Final Requirements Score</span>
        <span className="text-[16px] font-extrabold text-slate-900">
          {isEmpty(sc.final_score) ? "-" : `${Number(sc.final_score).toFixed(2)} / 100`}
        </span>
      </div>

    </div>
  );


}
