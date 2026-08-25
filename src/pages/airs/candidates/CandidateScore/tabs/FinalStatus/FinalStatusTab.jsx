import React, { useState } from "react";
import { toast } from "react-toastify";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorState from "@/pages/airs/skill-ontology/components/ErrorState";
import Button from "@/components/Button/Button";
import { Award, Clock, GitBranch, Sigma, Calculator, UserCog, MessageSquare, Mail } from "lucide-react";
import ScoreRing from "../../../components/ScoreRing";
import AccordionSection from "../../components/AccordionSection";
import useCompositeScore from "../../../hooks/useCompositeScore";
import { renderStageBadge, renderDecisionBadge } from "../../../utils/candidateUtils.jsx";
import { DECISION_SOURCE_LABEL } from "../../../constants/candidateConstants";
import { numberOr, formatDateTime } from "../../../utils/candidateDataUtils";
import { sendRejectionEmail } from "../../../services/candidateScoreService";

// Tone for the hero card/ring — keyed off whichever outcome is most
// authoritative: the recorded decision (can reflect an HR override), falling
// back to the composite calculation's ranking status, then the raw pipeline
// stage. Mirrors DECISION_TYPE_BADGE_TONE/PIPELINE_STAGE_BADGE_TONE so the
// hero card never disagrees with the badges rendered elsewhere.
const OUTCOME_TONE = {
  SHORTLISTED: { stripe: "bg-emerald-500", ring: "#059669", border: "border-emerald-100" },
  SELECTED: { stripe: "bg-emerald-500", ring: "#059669", border: "border-emerald-100" },
  MANUAL_REVIEW: { stripe: "bg-amber-500", ring: "#D97706", border: "border-amber-100" },
  HOLD: { stripe: "bg-amber-500", ring: "#D97706", border: "border-amber-100" },
  FRAUD_REVIEW: { stripe: "bg-amber-500", ring: "#D97706", border: "border-amber-100" },
  REJECTED: { stripe: "bg-rose-500", ring: "#E11D48", border: "border-rose-100" },
  RESET: { stripe: "bg-blue-500", ring: "#2563EB", border: "border-blue-100" },
};
const DEFAULT_TONE = { stripe: "bg-slate-300", ring: "#94A3B8", border: "border-slate-200" };

// Each score component keeps the same accent color used across the app
// (Deterministic/Semantic/AI Evaluation) so a candidate's ring colors read
// the same way on every tab.
const COMPONENT_COLOR = {
  deterministic: "#DC2626",
  semantic: "#7C3AED",
  ai: "#2563EB",
};

function formatStatus(status) {
  return String(status || "-").replace(/_/g, " ");
}

function formatWeight(value) {
  const weight = numberOr(value, 0);
  return `${Math.round((weight <= 1 ? weight * 100 : weight) * 100) / 100}%`;
}

function ComponentScoreCard({ label, score, weight, colorKey }) {
  const roundedScore = Math.round(numberOr(score, 0) * 10) / 10;

  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-center gap-3">
      <ScoreRing value={roundedScore} size={52} color={COMPONENT_COLOR[colorKey] || "#2563EB"} />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-slate-500 truncate">{label}</div>
        <div className="mt-1 inline-block text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-0.5">
          Weight {formatWeight(weight)}
        </div>
      </div>
    </div>
  );
}

function MetaTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 min-w-0">
      <div className="flex items-center gap-2 text-[10.5px] font-semibold text-slate-400">
        <Icon size={13} className="shrink-0" />
        {label}
      </div>
      <div className="mt-1 text-[12.5px] font-bold text-slate-900 truncate">{value}</div>
    </div>
  );
}

export default function FinalStatusTab({ candidate }) {
  const { breakdown, loading, error, refetch } = useCompositeScore(candidate?.id);
  const [sendingRejectionEmail, setSendingRejectionEmail] = useState(false);

  const stage = candidate?.stage;
  const hasStage = stage && stage !== "-";
  const decisionType = candidate?.decisionType;
  const outcomeKey = String(decisionType || breakdown?.rankingStatus || (hasStage ? stage : "")).toUpperCase();
  const tone = OUTCOME_TONE[outcomeKey] || DEFAULT_TONE;
  // Gated on the raw pipeline_stage, matching exactly what the backend
  // itself validates — not decisionType/outcomeKey, which can diverge
  // (e.g. an HR override) from the actual stage this endpoint checks.
  const isRejected = stage === "REJECTED";

  const handleSendRejectionEmail = async () => {
    setSendingRejectionEmail(true);
    try {
      await sendRejectionEmail(candidate.id);
      toast.success("Rejection email sent.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't send the rejection email. Please try again.");
    } finally {
      setSendingRejectionEmail(false);
    }
  };
  // Prefer the freshly computed composite score; fall back to whatever
  // composite value already travelled with the candidate record so the ring
  // isn't stuck at 0 while (or if) the breakdown call is still in flight.
  const compositeScore = breakdown ? breakdown.compositeScore : numberOr(candidate?.composite, 0);

  const decisionSourceLabel = candidate?.decisionSource
    ? DECISION_SOURCE_LABEL[candidate.decisionSource] || candidate.decisionSource
    : null;
  const hasDecisionNote = candidate?.decisionReason || candidate?.overrideReason;

  return (
    <div className="space-y-4">
      <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden ${tone.border}`}>
        <div className={`h-1 w-full ${tone.stripe}`} />
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <ScoreRing value={compositeScore} size={74} color={tone.ring} />
              <div>
                <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-900 mb-1.5">
                  <Award size={15} className="text-amber-500" /> Final Status
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {hasStage && renderStageBadge(stage)}
                  {decisionType && renderDecisionBadge(candidate)}
                  {candidate?.hrOverride && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5">
                      <UserCog size={11} /> HR override
                    </span>
                  )}
                  {!hasStage && !decisionType && (
                    <span className="text-[11.5px] text-slate-400">No decision recorded yet.</span>
                  )}
                </div>
              </div>
            </div>

            {isRejected && (
              <Button
                variant="outline"
                size="small"
                onClick={handleSendRejectionEmail}
                loading={sendingRejectionEmail}
                loadingText="Sending..."
                className="shrink-0"
              >
                <Mail size={13} /> Send Rejection Email
              </Button>
            )}
          </div>

          {hasDecisionNote && (
            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="text-[11.5px] text-slate-600 space-y-1">
                {candidate.decisionReason && (
                  <div>
                    {decisionSourceLabel && <span className="font-semibold text-slate-800">{decisionSourceLabel}: </span>}
                    {candidate.decisionReason}
                    {candidate.decisionAt && <span className="text-slate-400"> · {formatDateTime(candidate.decisionAt)}</span>}
                  </div>
                )}
                {candidate.overrideReason && (
                  <div className="italic text-indigo-700">HR override — "{candidate.overrideReason}"</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="py-8 flex items-center justify-center">
          <LoadingSpinner text="Loading composite score..." />
        </div>
      )}

      {!loading && error && (
        <ErrorState
          title="Couldn't load composite score"
          message="We couldn't load this candidate's composite score breakdown. Please try again."
          onRetry={refetch}
        />
      )}

      {!loading && !error && breakdown && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MetaTile icon={Sigma} label="Formula Version" value={breakdown.formulaVersion} />
            <MetaTile icon={Clock} label="Computed At" value={breakdown.computedAt} />
            <MetaTile icon={GitBranch} label="Ranking Status" value={formatStatus(breakdown.rankingStatus)} />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl px-4">
            <AccordionSection icon={Calculator} title="Composite Breakdown" collapsible={false}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {breakdown.components.map((component) => (
                  <ComponentScoreCard
                    key={component.key}
                    label={component.label}
                    score={component.score}
                    weight={component.weight}
                    colorKey={component.key}
                  />
                ))}
              </div>
              <div className="mt-3 rounded-lg bg-slate-50 border border-dashed border-slate-200 p-2.5 text-center">
                <span className="text-[11.5px] font-mono text-slate-600">{breakdown.formulaText}</span>
              </div>
            </AccordionSection>
          </div>
        </>
      )}

      {!loading && !error && !breakdown && (
        <ErrorState
          title="No composite score yet"
          message="This candidate hasn't been through composite scoring yet."
        />
      )}
    </div>
  );
}
