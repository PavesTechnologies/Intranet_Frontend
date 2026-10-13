import React from "react";
import { AlertTriangle, Target, Layers, CheckCircle2, Clock, ShieldCheck, XCircle, Info } from "lucide-react";
import ScoreRing from "../../../../components/ScoreRing";
import { renderDeterministicStatusBadge } from "../../../../utils/scoreBreakdownUtils.jsx";
import { textOrDash, numberOr, isEmpty, formatDateTime, arr } from "../../../../utils/candidateDataUtils";

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5 min-w-0">
      <Icon size={15} className="shrink-0 text-slate-400" />
      <div className="min-w-0">
        <div className="text-[10px] text-slate-400 truncate">{label}</div>
        <div className="text-[13.5px] font-bold text-slate-900 truncate">{value}</div>
      </div>
    </div>
  );
}

// Requirements Score tab — Summary card, built directly from
// deterministic_score_breakdown.summary. A hero ScoreRing + status/threshold
// on the left, key coverage stats on the right, with a pass/fail accent
// stripe across the top of the card.
export default function SummaryCard({ summary }) {
  const passed = summary.status === "PASSED";
  const overallScore = isEmpty(summary.overall_score) ? 0 : numberOr(summary.overall_score);

  const failureReasons = arr(summary.failure_reasons);
  // Every rule the deterministic layer checked, pass or fail (backend
  // explain_decision) - explains e.g. a pass below the score threshold.
  const decisionChecks = arr(summary.decision_checks);
  const scoreCheck = decisionChecks.find((c) => c.check === "Score threshold");
  const thresholdRankingOnly = scoreCheck && !scoreCheck.passed && !scoreCheck.can_reject;

  // Core skills are the JD's hard skill requirement; absent on legacy JDs
  // whose skills were never classified core/supporting.
  const hasCore = !isEmpty(summary.core_skills_total) && summary.core_skills_total > 0;
  const ratio = (matched, total) => `${numberOr(matched)} / ${numberOr(total)}`;

  return (
    <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden ${passed ? "border-emerald-100" : "border-rose-100"}`}>
      <div className={`h-1 w-full ${passed ? "bg-emerald-500" : "bg-rose-500"}`} />

      <div className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-4 shrink-0 lg:pr-5 lg:border-r lg:border-slate-100">
            <ScoreRing value={Math.round(overallScore)} size={68} color={passed ? "#059669" : "#E11D48"} />
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Requirements Score
              </div>
              {renderDeterministicStatusBadge(summary.status)}
              <div className="text-[11.5px] text-slate-500 mt-2">
                Threshold <span className="font-bold text-slate-900">{textOrDash(summary.threshold)}</span>
                {thresholdRankingOnly && <span className="ml-1 text-slate-400">(ranking only)</span>}
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {hasCore && (
              <StatTile
                icon={ShieldCheck}
                label="Core Skills Matched"
                value={ratio(summary.core_skills_matched, summary.core_skills_total)}
              />
            )}
            <StatTile
              icon={Target}
              label="Required Skills Matched"
              value={ratio(summary.mandatory_skills_matched, summary.mandatory_skills_total)}
            />
            <StatTile
              icon={Layers}
              label="Preferred Skills Matched"
              value={
                numberOr(summary.preferred_skills_total) > 0
                  ? ratio(summary.preferred_skills_matched, summary.preferred_skills_total)
                  : "None in JD"
              }
            />
            <StatTile icon={Clock} label="Screened At" value={formatDateTime(summary.screened_at)} />
          </div>
        </div>

        {decisionChecks.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 p-3">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Why this decision</div>
            <ul className="space-y-1.5">
              {decisionChecks.map((c) => (
                <li key={c.check} className="flex items-start gap-2 text-[11.5px]">
                  {c.passed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600" />
                  ) : c.can_reject ? (
                    <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-600" />
                  ) : (
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                  )}
                  <span className="text-slate-600">
                    <span className="font-semibold text-slate-800">{c.check}</span>
                    {!c.can_reject && <span className="ml-1 text-[10.5px] text-slate-400">(ranking only)</span>}
                    {" — "}
                    {c.detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(!isEmpty(summary.failure_reason) || failureReasons.length > 0) && (
          <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-[11.5px] text-rose-700">
              {/* failure_reasons (array) is the more detailed breakdown — when
                  present it already covers what failure_reason (singular)
                  would say, so only fall back to the singular string when the
                  array is empty to avoid showing the same message twice. */}
              {failureReasons.length > 0
                ? failureReasons.map((reason, i) => <div key={i}>{reason}</div>)
                : <div>{summary.failure_reason}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
