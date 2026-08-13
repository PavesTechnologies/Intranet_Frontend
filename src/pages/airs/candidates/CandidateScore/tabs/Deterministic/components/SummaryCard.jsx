import React from "react";
import { AlertTriangle, Target, Layers, CheckCircle2, Clock } from "lucide-react";
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

// Deterministic Score tab — Summary card, built directly from
// deterministic_score_breakdown.summary. A hero ScoreRing + status/threshold
// on the left, key coverage stats on the right, with a pass/fail accent
// stripe across the top of the card.
export default function SummaryCard({ summary }) {
  const passed = summary.status === "PASSED";
  const overallScore = isEmpty(summary.overall_score) ? 0 : numberOr(summary.overall_score);

  const preferredCoveragePct =
    summary.preferred_skills_total > 0
      ? ((numberOr(summary.preferred_skills_matched) / summary.preferred_skills_total) * 100).toFixed(1)
      : null;

  const failureReasons = arr(summary.failure_reasons);

  return (
    <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden ${passed ? "border-emerald-100" : "border-rose-100"}`}>
      <div className={`h-1 w-full ${passed ? "bg-emerald-500" : "bg-rose-500"}`} />

      <div className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-4 shrink-0 lg:pr-5 lg:border-r lg:border-slate-100">
            <ScoreRing value={Math.round(overallScore)} size={68} color={passed ? "#059669" : "#E11D48"} />
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Deterministic Score
              </div>
              {renderDeterministicStatusBadge(summary.status)}
              <div className="text-[11.5px] text-slate-500 mt-2">
                Threshold <span className="font-bold text-slate-900">{textOrDash(summary.threshold)}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <StatTile
              icon={Target}
              label="Mandatory Coverage"
              value={isEmpty(summary.mandatory_coverage_pct) ? "-" : `${numberOr(summary.mandatory_coverage_pct).toFixed(1)}%`}
            />
            <StatTile icon={Layers} label="Preferred Coverage" value={preferredCoveragePct === null ? "-" : `${preferredCoveragePct}%`} />
            <StatTile
              icon={CheckCircle2}
              label="Mandatory Matched"
              value={`${numberOr(summary.mandatory_skills_matched)} / ${numberOr(summary.mandatory_skills_total)}`}
            />
            <StatTile
              icon={CheckCircle2}
              label="Preferred Matched"
              value={`${numberOr(summary.preferred_skills_matched)} / ${numberOr(summary.preferred_skills_total)}`}
            />
            <StatTile icon={Clock} label="Screened At" value={formatDateTime(summary.screened_at)} />
          </div>
        </div>

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
