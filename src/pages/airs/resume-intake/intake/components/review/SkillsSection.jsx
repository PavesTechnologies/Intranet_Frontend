import React from "react";
import { Tags, ShieldCheck, Inbox } from "lucide-react";
import { MATCH_TIER_STYLE, SKILL_STATUS_STYLE } from "../../constants/intakeConstants";
import { computeSkillCoverage } from "../../utils/intakeUtils.jsx";

function CoverageBar({ pct }) {
  const tone = pct === null ? "bg-slate-300" : pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full ${tone} rounded-full`} style={{ width: `${pct || 0}%` }} />
    </div>
  );
}

function NormalizedSkillRow({ skill }) {
  const tierStyle = MATCH_TIER_STYLE[skill.match_tier] || MATCH_TIER_STYLE.unknown;
  const statusStyle = SKILL_STATUS_STYLE[skill.status];
  const confidencePct = Math.round((skill.confidence ?? 0) * 100);

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold text-slate-900 truncate">
          {skill.canonical_name || <span className="italic text-slate-400 font-normal">Unrecognized: "{skill.raw_extracted_text}"</span>}
        </div>
        {skill.canonical_name && skill.canonical_name !== skill.raw_extracted_text && (
          <div className="text-[11px] text-slate-400">from "{skill.raw_extracted_text}"</div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${tierStyle.tone}`}>{tierStyle.label}</span>
        <span className="text-[11px] font-mono text-slate-400 w-9 text-right">{confidencePct}%</span>
        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${statusStyle.tone}`}>{statusStyle.label}</span>
      </div>
    </div>
  );
}

export default function SkillsSection({ skills, candidateSkills }) {
  const rawSkills = skills || [];
  const normalized = candidateSkills || [];
  const coverage = computeSkillCoverage(normalized);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-[13.5px] font-bold text-slate-900 flex items-center gap-2">
          <Tags size={15} className="text-slate-400" /> Skills
        </h2>
        {coverage.total > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">
              <span className="font-bold text-slate-900">{coverage.pct}%</span> verified coverage ({coverage.verified}/{coverage.total})
            </span>
            <div className="w-24">
              <CoverageBar pct={coverage.pct} />
            </div>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="mb-5">
          <div className="text-[11px] font-semibold text-slate-400 mb-2">RAW EXTRACTED SKILLS</div>
          {rawSkills.length === 0 ? (
            <div className="flex items-center gap-2 text-[12px] text-slate-400">
              <Inbox size={14} /> No skills were extracted from this resume.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {rawSkills.map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
            <ShieldCheck size={12} /> NORMALIZED &amp; SCORED SKILLS
          </div>
          <p className="text-[11.5px] text-slate-400 mb-2">This is what matching and scoring actually use — not the raw list above.</p>
          {normalized.length === 0 ? (
            <div className="flex items-center gap-2 text-[12px] text-slate-400">
              <Inbox size={14} /> No skills have been normalized against the skill library yet.
            </div>
          ) : (
            <div>
              {normalized.map((s, i) => (
                <NormalizedSkillRow key={i} skill={s} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
