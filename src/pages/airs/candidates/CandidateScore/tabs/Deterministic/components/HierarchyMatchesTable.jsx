import React from "react";
import { Network } from "lucide-react";
import GenericTable from "@/components/Table/table";
import SectionCard from "./SectionCard";
import { renderMatchTypeBadge } from "../../../../utils/scoreBreakdownUtils.jsx";
import { textOrDash, isEmpty } from "../../../../utils/candidateDataUtils";

const HEADERS = ["JD Skill", "Candidate Skill", "Match Type", "Contribution %", "Confidence", "Match Reason"];
const COLUMNS = ["jdSkill", "candidateSkill", "matchType", "contribution", "confidence", "matchReason"];

// Hierarchy Matches — deterministic_score_breakdown.hierarchy_matches. Same
// row contract as the Mandatory/Preferred skills tables.
export default function HierarchyMatchesTable({ items }) {
  const rows = (items || []).map((r, i) => ({
    id: i,
    jdSkill: <span className="font-semibold text-slate-900">{textOrDash(r.jd_skill)}</span>,
    candidateSkill: textOrDash(r.candidate_skill),
    matchType: renderMatchTypeBadge(r.match_type),
    contribution: isEmpty(r.contribution_percentage) ? "-" : `${r.contribution_percentage}%`,
    confidence: isEmpty(r.confidence) ? "-" : `${Math.round(r.confidence * 100)}%`,
    matchReason: <span className="text-[11.5px] text-slate-500">{textOrDash(r.match_reason)}</span>,
  }));

  return (
    <SectionCard icon={Network} title="Hierarchy Matches">
      {rows.length === 0 ? (
        <p className="text-[11.5px] text-slate-400 py-2">No data available</p>
      ) : (
        <div className="overflow-x-auto rounded-xl">
          <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} />
        </div>
      )}
    </SectionCard>
  );
}
