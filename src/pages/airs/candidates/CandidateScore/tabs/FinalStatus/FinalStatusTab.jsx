import React from "react";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorState from "@/pages/airs/skill-ontology/components/ErrorState";
import { Award, Clock, GitBranch, Sigma, Calculator } from "lucide-react";
import ScoreRing from "../../../components/ScoreRing";
import AccordionSection from "../../components/AccordionSection";
import useCompositeScore from "../../../hooks/useCompositeScore";
import { numberOr } from "../../../utils/candidateDataUtils";

const STATUS_TONE = {
  SHORTLISTED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  SHORTLIST: "bg-emerald-100 text-emerald-800 border-emerald-200",
  SELECTED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  MANUAL_REVIEW: "bg-amber-50 text-amber-700 border-amber-100",
  REVIEW: "bg-amber-50 text-amber-700 border-amber-100",
  REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
  REJECT: "bg-rose-100 text-rose-800 border-rose-200",
};

function formatStatus(status) {
  return String(status || "-").replace(/_/g, " ");
}

function formatWeight(value) {
  const weight = numberOr(value, 0);
  return `${Math.round((weight <= 1 ? weight * 100 : weight) * 100) / 100}%`;
}

function ComponentScoreCard({ label, score, weight }) {
  const roundedScore = Math.round(numberOr(score, 0) * 100) / 100;

  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-[11px] font-semibold text-slate-500">{label}</div>
        <Badge className="bg-white text-slate-600 border-slate-200 font-bold px-2 py-0.5 text-[10px]">
          {formatWeight(weight)}
        </Badge>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[18px] font-extrabold text-slate-900">{roundedScore}</div>
          <div className="text-[10.5px] text-slate-400">score contribution input</div>
        </div>
        <div className="w-20">
          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, roundedScore))}%` }} />
          </div>
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

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <LoadingSpinner text="Loading final status..." />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load final status"
        message="We couldn't load this candidate's composite score. Please try again."
        onRetry={refetch}
      />
    );
  }

  if (!breakdown) {
    return <ErrorState title="No data available" message="No composite score found for this candidate." />;
  }

  const tone = STATUS_TONE[breakdown.rankingStatus] || "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <ScoreRing value={breakdown.compositeScore} size={74} color="#16A34A" />
            <div>
              <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-900 mb-1.5">
                <Award size={15} className="text-amber-500" /> Final Status
              </div>
              <div className="text-[11.5px] text-slate-500">Composite score generated from weighted evaluation stages.</div>
            </div>
          </div>
          <Badge className={`${tone} font-bold px-3 py-1 text-[11.5px] self-start sm:self-center`}>
            {formatStatus(breakdown.rankingStatus)}
          </Badge>
        </div>
      </div>

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
              />
            ))}
          </div>
          <div className="mt-3 rounded-lg bg-slate-50 border border-dashed border-slate-200 p-2.5 text-center">
            <span className="text-[11.5px] font-mono text-slate-600">{breakdown.formulaText}</span>
          </div>
        </AccordionSection>
      </div>
    </div>
  );
}
