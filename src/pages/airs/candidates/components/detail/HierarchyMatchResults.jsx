import React, { useState } from "react";
import { HelpCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "react-toastify";
import GenericTable from "../../../../../components/Table/table";
import Button from "../../../../../components/Button/Button";
import LoadingSpinner from "../../../../../components/LoadingSpinner";
import Tooltip from "../../../../../components/status/Tooltip";
import { renderMatchTypeBadge, formatWeightApplied, renderDeterministicStatusBadge } from "../../utils/scoreBreakdownUtils.jsx";

const WEIGHT_LEGEND = [
  { label: "Exact Match", weight: "100%" },
  { label: "Child Match", weight: "70%" },
  { label: "Sibling Match", weight: "40%" },
  { label: "Semantic Match", weight: "20%" },
  { label: "Missing", weight: "0%" },
];

const CONFIDENCE_LEGEND = [
  { value: "1.0", label: "Alias / High confidence" },
  { value: "0.8", label: "Partial fuzzy / Vector normalized" },
];

// M03-E05 → S06: Candidate Scorecard — Hierarchy Match Results. Every value
// rendered here (match type, score contribution, weight applied, configured
// weight, deterministic score/status) is read directly from the candidate's
// score_breakdown — nothing is calculated in this component.
//
// scoreBreakdown shape: { items: [...], noVerifiedSkills, score, status }.
// manualSkills (M07-E01/S04) are HR-admin-added entries — shown for
// visibility but never folded into the deterministic score/status above.
export default function HierarchyMatchResults({ scoreBreakdown, manualSkills = [], isLoading = false }) {
  const [helpOpen, setHelpOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl py-12 flex items-center justify-center">
        <LoadingSpinner text="Loading hierarchy match results..." />
      </div>
    );
  }

  if (!scoreBreakdown || !scoreBreakdown.items || scoreBreakdown.items.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center">
        <p className="text-[12.5px] font-semibold text-slate-700">No hierarchy match data available</p>
        <p className="text-[11.5px] text-slate-400 mt-1">This candidate has no score breakdown for the current JD.</p>
      </div>
    );
  }

  const items = scoreBreakdown.items;
  // The dedicated No Verified Skills banner already covers this candidate's
  // total-failure case at the top of the tab — skip the redundant
  // missing-mandatory card here so the two warnings don't stack.
  const missingMandatory = scoreBreakdown.noVerifiedSkills ? [] : items.filter((r) => r.mandatory && r.matchType === "MISSING");

  const headers = ["JD Skill", "Match Type", "Matched Candidate Skill", "Score Contribution", "Weight Applied"];
  const columns = ["jdSkillName", "matchType", "matchedCandidateSkill", "scoreContribution", "weightApplied"];

  const rows = items.map((r, i) => ({
    id: i,
    jdSkillName: (
      <span className="inline-flex items-center gap-1.5">
        <span className="font-semibold text-slate-900">{r.jdSkillName}</span>
        {r.mandatory && (
          <Tooltip content="Mandatory skill">
            <span className="text-[9px] font-bold uppercase tracking-wide text-rose-500 border border-rose-200 rounded px-1 py-0.5">
              M
            </span>
          </Tooltip>
        )}
      </span>
    ),
    matchType: renderMatchTypeBadge(r.matchType),
    matchedCandidateSkill: r.matchedCandidateSkill || <span className="text-slate-400">—</span>,
    scoreContribution: <span className="font-semibold text-slate-900">{r.scoreContribution.toFixed(2)}</span>,
    weightApplied: formatWeightApplied(r.weightApplied),
  }));

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-white flex items-center justify-between py-1">
        <h3 className="text-[13.5px] font-bold text-slate-900">Hierarchy Match Results</h3>
        <button
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          className="flex items-center gap-1 text-[11.5px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          aria-expanded={helpOpen}
          aria-controls="hierarchy-match-help"
        >
          <HelpCircle size={14} />
          How Scores Are Calculated
          {helpOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {helpOpen && (
        <div id="hierarchy-match-help" className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div>
            <div className="text-[12px] font-bold text-slate-700 mb-2">Hierarchy match weight</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {WEIGHT_LEGEND.map((l) => (
                <div key={l.label} className="rounded-lg bg-white border border-slate-200 p-2 text-center">
                  <div className="text-[10.5px] text-slate-500">{l.label}</div>
                  <div className="text-[13px] font-bold text-slate-900">{l.weight}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11.5px] text-slate-500 leading-relaxed">
            Missing mandatory skills fail deterministic screening — a candidate cannot pass if any mandatory JD skill
            has no hierarchy match.
          </p>

          <div>
            <div className="text-[12px] font-bold text-slate-700 mb-2">Candidate scoring confidence</div>
            <div className="grid grid-cols-2 gap-2">
              {CONFIDENCE_LEGEND.map((c) => (
                <div key={c.value} className="rounded-lg bg-white border border-slate-200 p-2.5">
                  <div className="text-[13px] font-bold text-slate-900">{c.value}</div>
                  <div className="text-[10.5px] text-slate-500">{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {missingMandatory.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-rose-800">Missing Mandatory Skills</div>
              <div className="mt-2 space-y-1.5">
                {missingMandatory.map((r, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[12px] text-rose-700 bg-white/70 rounded-lg px-3 py-1.5"
                  >
                    <span className="font-semibold">{r.jdSkillName}</span>
                    <span>Configured Weight: {r.configuredWeight}</span>
                    <span className="italic">No hierarchy match found</span>
                  </div>
                ))}
              </div>
              <Button
                variant="danger"
                size="small"
                className="mt-3"
                onClick={() => toast.info("This candidate has been flagged for manual review.")}
              >
                Escalate for Manual Review
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden sm:block overflow-x-auto rounded-xl">
        <GenericTable headers={headers} columns={columns} rows={rows} />
      </div>

      <div className="sm:hidden space-y-2">
        {items.map((r, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <span className="font-semibold text-[12.5px] text-slate-900 truncate">{r.jdSkillName}</span>
                {r.mandatory && (
                  <span className="text-[9px] font-bold uppercase tracking-wide text-rose-500 border border-rose-200 rounded px-1 py-0.5 shrink-0">
                    M
                  </span>
                )}
              </span>
              {renderMatchTypeBadge(r.matchType)}
            </div>
            <div className="text-[11.5px] text-slate-500">Matched: {r.matchedCandidateSkill || "—"}</div>
            <div className="flex items-center justify-between text-[11.5px] text-slate-500">
              <span>
                Score: <span className="font-semibold text-slate-900">{r.scoreContribution.toFixed(2)}</span>
              </span>
              <span>
                Weight: <span className="font-semibold text-slate-900">{formatWeightApplied(r.weightApplied)}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {manualSkills.length > 0 && (
        <div>
          <div className="text-[12px] font-semibold mb-1.5 text-slate-600">
            Manually added skills <span className="text-slate-400 font-normal">(not included in the score above)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {manualSkills.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700">
                {s.canonicalName}
                <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold">Manually Added</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-4">
        <div>
          <div className="text-[11px] text-slate-400">Deterministic Score</div>
          <div className="text-[15px] font-extrabold text-slate-900">{scoreBreakdown.score.toFixed(2)} / 100</div>
        </div>
        {renderDeterministicStatusBadge(scoreBreakdown.status)}
      </div>
    </div>
  );
}
