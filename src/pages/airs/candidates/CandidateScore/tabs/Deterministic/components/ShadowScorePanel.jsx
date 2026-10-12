import React from "react";
import { FlaskConical } from "lucide-react";

// Scoring v2 shadow result for this candidate - HR_ADMIN only (the backend
// sends `scoring_v2_shadow` for that role only). Read-only and explicitly not
// used for any decision: v1 above is what the pipeline acts on.

const OUTCOME_STYLES = {
  PASS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  REJECT: "bg-rose-50 text-rose-700 border-rose-200",
  PENDING: "bg-slate-100 text-slate-600 border-slate-200",
  NOT_RUN: "bg-slate-100 text-slate-500 border-slate-200",
};
const OUTCOME_LABELS = { NOT_RUN: "Not run (daily cap)", PENDING: "Pending (confirmation unavailable)" };
const STATUS_TEXT = {
  CONFIRMED: "Confirmed",
  UNCERTAIN: "Uncertain - counts as supporting only",
  UNCONFIRMED: "Found, not confirmed as core",
  NOT_RUN: "Found, not confirmed as core",
  REJECTED: "Not shown as the candidate's own skill - discarded",
  SENSE_MISMATCH: "Different meaning of the skill",
  NOT_FOUND: "Not found",
};

export default function ShadowScorePanel({ shadow }) {
  if (!shadow) return null;
  const outcome = shadow.outcome || "NOT_SCORED";
  return (
    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <FlaskConical className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800">Scoring v2</h3>
        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
          Shadow — not used for decisions
        </span>
        <span className={`ml-auto px-2 py-0.5 rounded border text-[11px] font-semibold ${OUTCOME_STYLES[outcome] || OUTCOME_STYLES.PENDING}`}>
          {OUTCOME_LABELS[outcome] || outcome}
        </span>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-700 mb-3">
        <span>
          Score: <span className="font-semibold">{shadow.score ?? shadow.provisional_score ?? "—"}</span>
          {shadow.score == null && shadow.provisional_score != null && <span className="text-slate-400"> (provisional)</span>}
        </span>
        <span>
          Core confirmed: <span className="font-semibold">{shadow.core_confirmed_count ?? 0}/{shadow.core_skill_count ?? 0}</span>
          <span className="text-slate-400"> (up to {shadow.allowed_missing_core_skills ?? 0} may be missing)</span>
        </span>
        {shadow.failed_checks?.length > 0 && <span>Failed: {shadow.failed_checks.join(", ")}</span>}
      </div>
      {shadow.outcome_reason && <p className="text-[11px] text-slate-500 mb-2">{shadow.outcome_reason}</p>}

      {shadow.core_skills?.length > 0 && (
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1 pr-2 font-semibold">Core skill</th>
              <th className="py-1 pr-2 font-semibold">v2 result</th>
              <th className="py-1 pr-2 font-semibold">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {shadow.core_skills.map((skill) => (
              <tr key={skill.name} className="border-t border-slate-200 align-top">
                <td className="py-1.5 pr-2 font-medium text-slate-800">
                  {skill.name}
                  {skill.jd_sense && (
                    <span className="block text-slate-400 font-normal">
                      sense: {skill.jd_sense.toLowerCase()}{skill.jd_sense_basis === "assumed" ? " (assumed)" : ""}
                    </span>
                  )}
                </td>
                <td className="py-1.5 pr-2 text-slate-700">
                  {STATUS_TEXT[skill.status] || (skill.match_type === "MISSING" ? "Not found" : skill.match_type)}
                  {skill.method === "auto" && <span className="text-slate-400"> (exact match)</span>}
                  {skill.votes?.length > 0 && <span className="text-slate-400"> (votes: {skill.votes.join(", ")})</span>}
                </td>
                <td className="py-1.5 pr-2 text-slate-600">
                  {skill.quote ? `"${skill.quote}"` : skill.evidence_text ? `"${skill.evidence_text}"` : "—"}
                  {skill.evidence_sources?.length > 0 && <span className="text-slate-400"> · {skill.evidence_sources.join("/")}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {shadow.scored_at && (
        <p className="text-[10px] text-slate-400 mt-2">
          Scored {new Date(shadow.scored_at).toLocaleString()} · config {shadow.scoring_config_version}
        </p>
      )}
    </div>
  );
}
