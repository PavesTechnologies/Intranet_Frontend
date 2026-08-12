import React from "react";
import { Sparkles } from "lucide-react";

const FIELD_ROWS = [
  ["designation", "Current designation"],
  ["experience", "Experience", (v) => (v == null ? "—" : `${v} yrs`)],
  ["location", "Location"],
  ["email", "Email"],
  ["jurisdiction", "Jurisdiction"],
];

const STAT_ROWS = [
  ["best_composite_score", "Best Composite", "#16A34A"],
  ["average_composite_score", "Average Composite", "#7C3AED"],
  ["total_campaigns", "Campaigns", "#2563EB"],
  ["shortlisted_count", "Shortlisted", "#F59E0B"],
  ["selected_count", "Selected", "#0D9488"],
];

// Summary tab — candidate identity fields, the active resume's own
// professional summary (parsed_json.summary, never generated/JD-specific),
// and the real cross-campaign performance summary — all straight off
// GET /talent-pool/candidates/{candidate_id}.
export default function CandidateOverview({ profile }) {
  const { candidate, resume, performance_summary: performance } = profile;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12.5px]">
          {FIELD_ROWS.map(([key, label, format]) => (
            <div key={key}>
              <div className="text-slate-400">{label}</div>
              <div className="font-semibold text-slate-900">
                {format ? format(candidate[key]) : candidate[key] || "—"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="text-[12.5px] font-bold text-slate-900 mb-3">Performance Summary</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {STAT_ROWS.map(([key, label, color]) => (
            <div key={key} className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-center">
              <div className="text-[9.5px] text-slate-400">{label}</div>
              <div className="text-[15px] font-extrabold" style={{ color }}>
                {performance[key] ?? "—"}
              </div>
            </div>
          ))}
        </div>
        {performance.campaign_name && (
          <p className="text-[11px] text-slate-400 mt-2.5">
            Best score achieved in <span className="font-semibold text-slate-600">{performance.campaign_name}</span>
            {performance.jd_title ? ` (${performance.jd_title})` : ""}.
          </p>
        )}
      </div>

      {resume.summary && (
        <div className="p-4 rounded-xl bg-purple-50">
          <div className="flex items-center gap-1.5 text-[12px] font-bold mb-1.5 text-purple-700">
            <Sparkles size={13} /> Professional summary
          </div>
          <p className="text-[12.5px] leading-relaxed text-slate-900">{resume.summary}</p>
        </div>
      )}
    </div>
  );
}
