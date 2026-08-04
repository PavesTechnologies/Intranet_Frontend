import React from "react";
import GenericTable from "@/components/Table/table";
import { renderMatchTypeBadge, renderDeterministicStatusBadge } from "../../../../utils/scoreBreakdownUtils.jsx";
import { textOrDash, isEmpty } from "../../../../utils/candidateDataUtils";

const formatPct = (v) => (isEmpty(v) ? "-" : `${v}%`);
const formatConfidence = (v) => (isEmpty(v) ? "-" : `${Math.round(v * 100)}%`);
const formatBonus = (v) => (isEmpty(v) ? "-" : Number(v).toFixed(2));

const MANDATORY_HEADERS = ["JD Skill", "Candidate Skill", "Match Type", "Contribution %", "Confidence", "Match Reason", "Status"];
const MANDATORY_COLUMNS = ["jdSkill", "candidateSkill", "matchType", "contribution", "confidence", "matchReason", "status"];

const PREFERRED_HEADERS = ["JD Skill", "Candidate Skill", "Match Type", "Bonus", "Contribution %", "Match Reason"];
const PREFERRED_COLUMNS = ["jdSkill", "candidateSkill", "matchType", "bonus", "contribution", "matchReason"];

// Mandatory Skills & Preferred Skills tables — rendered straight off
// deterministic_score_breakdown.mandatory_skills / .preferred_skills, no
// derived scoring, just display formatting.
export default function SkillsTable({ items, variant }) {
  if (!items || items.length === 0) {
    return <p className="text-[11.5px] text-slate-400 py-2">No data available</p>;
  }

  const isMandatory = variant === "mandatory";

  const rows = items.map((r, i) => ({
    id: i,
    jdSkill: <span className="font-semibold text-slate-900">{textOrDash(r.jd_skill)}</span>,
    candidateSkill: textOrDash(r.candidate_skill),
    matchType: renderMatchTypeBadge(r.match_type),
    contribution: <span className="font-semibold text-slate-900">{formatPct(r.contribution_percentage)}</span>,
    confidence: formatConfidence(r.confidence),
    bonus: formatBonus(r.bonus),
    matchReason: <span className="text-[11.5px] text-slate-500">{textOrDash(r.match_reason)}</span>,
    status: renderDeterministicStatusBadge(r.passed ? "PASSED" : "FAILED"),
  }));

  const headers = isMandatory ? MANDATORY_HEADERS : PREFERRED_HEADERS;
  const columns = isMandatory ? MANDATORY_COLUMNS : PREFERRED_COLUMNS;

  return (
    <>
      <div className="hidden sm:block overflow-x-auto rounded-xl">
        <GenericTable headers={headers} columns={columns} rows={rows} />
      </div>

      <div className="sm:hidden space-y-2">
        {items.map((r, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[12.5px] text-slate-900 truncate">{textOrDash(r.jd_skill)}</span>
              {renderMatchTypeBadge(r.match_type)}
            </div>
            <div className="text-[11.5px] text-slate-500">Candidate skill: {textOrDash(r.candidate_skill)}</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11.5px] text-slate-500">
              <span>
                Contribution: <span className="font-semibold text-slate-900">{formatPct(r.contribution_percentage)}</span>
              </span>
              {isMandatory ? (
                <span>
                  Confidence: <span className="font-semibold text-slate-900">{formatConfidence(r.confidence)}</span>
                </span>
              ) : (
                <span>
                  Bonus: <span className="font-semibold text-slate-900">{formatBonus(r.bonus)}</span>
                </span>
              )}
            </div>
            <div className="text-[11.5px] text-slate-500 italic">{textOrDash(r.match_reason)}</div>
            {isMandatory && <div>{renderDeterministicStatusBadge(r.passed ? "PASSED" : "FAILED")}</div>}
          </div>
        ))}
      </div>
    </>
  );
}
