import React from "react";
import GenericTable from "@/components/Table/table";
import { renderMatchTypeBadge, renderDeterministicStatusBadge } from "../../../../utils/scoreBreakdownUtils.jsx";
import { textOrDash, isEmpty } from "../../../../utils/candidateDataUtils";

const formatPct = (v) => (isEmpty(v) ? "-" : `${v}%`);
const formatConfidence = (v) => (isEmpty(v) ? "-" : `${Math.round(v * 100)}%`);
const formatBonus = (v) => (isEmpty(v) ? "-" : Number(v).toFixed(2));

const MANDATORY_HEADERS = ["JD Skill", "Importance", "Candidate Skill", "Match Type", "Contribution %", "Confidence", "Match Reason", "Status"];
const MANDATORY_COLUMNS = ["jdSkill", "importance", "candidateSkill", "matchType", "contribution", "confidence", "matchReason", "status"];

// core = hard requirement (gated); supporting = scored only. Null on
// breakdowns scored before skills were classified.
const IMPORTANCE_STYLES = {
  core: "bg-indigo-50 text-indigo-700 border-indigo-100",
  supporting: "bg-sky-50 text-sky-700 border-sky-100",
};

function ImportanceBadge({ importance }) {
  if (!importance) return <span className="text-slate-400">-</span>;
  return (
    <span className={`text-[10.5px] px-2 py-0.5 rounded-md font-semibold border capitalize ${IMPORTANCE_STYLES[importance] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {importance}
    </span>
  );
}

function CandidateSkillCell({ row }) {
  return (
    <span>
      {textOrDash(row.candidate_skill)}
      {row.matched_via_alias && <span className="ml-1.5 text-[10.5px] text-slate-400 italic">via alias</span>}
    </span>
  );
}

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
    importance: <ImportanceBadge importance={r.importance} />,
    candidateSkill: <CandidateSkillCell row={r} />,
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
              <div className="flex items-center gap-1.5 shrink-0">
                {isMandatory && r.importance && <ImportanceBadge importance={r.importance} />}
                {renderMatchTypeBadge(r.match_type)}
              </div>
            </div>
            <div className="text-[11.5px] text-slate-500">Candidate skill: <CandidateSkillCell row={r} /></div>
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
