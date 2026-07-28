import React from "react";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import { getFinalStatusMock } from "./finalStatusMock";
import StatusTimeline from "./components/StatusTimeline";

const RECOMMENDATION_TONE = {
  SHORTLISTED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  MANUAL_REVIEW: "bg-amber-50 text-amber-700 border-amber-100",
  REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
};

const RECOMMENDATION_LABEL = {
  SHORTLISTED: "Shortlisted",
  MANUAL_REVIEW: "Manual Review",
  REJECTED: "Rejected",
};

function ResultCard({ label, score, status }) {
  const tone = status === "PASSED" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-rose-100 text-rose-800 border-rose-200";
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
      <div className="text-[10.5px] text-slate-400">{label}</div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[15px] font-extrabold text-slate-900">{typeof score === "number" ? score.toFixed(2) : score}</span>
        <Badge className={`${tone} font-semibold px-2 py-0.5 text-[10px]`}>{status}</Badge>
      </div>
    </div>
  );
}

export default function FinalStatusTab({ candidate }) {
  const finalStatus = getFinalStatusMock(candidate);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-900">
            <Award size={14} className="text-amber-500" /> Final Outcome
          </span>
          <Badge className={`${RECOMMENDATION_TONE[finalStatus.finalRecommendation]} font-bold px-3 py-1 text-[11.5px]`}>
            {RECOMMENDATION_LABEL[finalStatus.finalRecommendation]}
          </Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
            <div className="text-[10.5px] text-slate-400">Composite Score</div>
            <div className="text-[17px] font-extrabold text-slate-900">{finalStatus.compositeScore}</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
            <div className="text-[10.5px] text-slate-400">Final Rank</div>
            <div className="text-[15px] font-extrabold text-slate-900 mt-1">{finalStatus.finalRank}</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
            <div className="text-[10.5px] text-slate-400">Pipeline Stage</div>
            <div className="text-[13px] font-bold text-slate-900 mt-1.5">{finalStatus.pipelineStage}</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
            <div className="text-[10.5px] text-slate-400">Recruiter Decision</div>
            <div className="text-[12px] font-bold text-slate-900 mt-1.5">{finalStatus.recruiterDecision}</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <span className="text-[12.5px] font-bold text-slate-900 block mb-4">Status Timeline</span>
        <StatusTimeline timeline={finalStatus.statusTimeline} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <span className="text-[12.5px] font-bold text-slate-900 block mb-3">Composite Result Breakdown</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ResultCard label="Deterministic Result" score={finalStatus.deterministicResult.score} status={finalStatus.deterministicResult.status} />
          <ResultCard label="Semantic Result" score={finalStatus.semanticResult.score} status={finalStatus.semanticResult.status} />
          <ResultCard label="AI Result" score={finalStatus.aiResult.score} status={finalStatus.aiResult.status} />
        </div>
        <div className="mt-3 rounded-lg bg-slate-50 border border-dashed border-slate-200 p-2.5 text-center">
          <span className="text-[11.5px] font-mono text-slate-600">{finalStatus.compositeFormula}</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <div className="text-[12px] font-bold text-slate-700 mb-1">Hiring Recommendation</div>
        <p className="text-[12.5px] text-slate-900">{finalStatus.hiringRecommendation}</p>
      </div>
    </div>
  );
}
