import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Sparkles, ShieldAlert, Lightbulb } from "lucide-react";
import { getAiEvaluationMock } from "./aiMock";
import KeywordAnalysis from "./components/KeywordAnalysis";

const CONFIDENCE_TONE = {
  HIGH: "bg-emerald-100 text-emerald-800 border-emerald-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-100",
  LOW: "bg-rose-50 text-rose-700 border-rose-100",
};

const RISK_TONE = {
  LOW: "bg-emerald-50 text-emerald-700 border-emerald-100",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-100",
  HIGH: "bg-rose-50 text-rose-700 border-rose-100",
};

export default function AiEvaluationTab({ candidate }) {
  const ai = getAiEvaluationMock(candidate);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12.5px] font-bold text-slate-900">AI ATS Evaluation</span>
          <Badge className={`${CONFIDENCE_TONE[ai.aiConfidence]} font-bold px-3 py-1 text-[11px]`}>{ai.aiConfidence} confidence</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
            <div className="text-[10.5px] text-slate-400">AI ATS Score</div>
            <div className="text-[17px] font-extrabold text-slate-900">{ai.atsScore}</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
            <div className="text-[10.5px] text-slate-400">AI Recommendation</div>
            <div className="text-[13px] font-bold text-slate-900 mt-1">{ai.aiRecommendation}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[12px] font-semibold mb-1.5 text-emerald-600">Strengths</div>
          <ul className="text-[12.5px] space-y-1 text-slate-900">
            {ai.strengths.map((s, i) => (
              <li key={i} className="flex gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600 mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[12px] font-semibold mb-1.5 text-rose-600">Weaknesses</div>
          <ul className="text-[12.5px] space-y-1 text-slate-900">
            {ai.weaknesses.map((s, i) => (
              <li key={i} className="flex gap-1.5">
                <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-900">
            <ShieldAlert size={14} className="text-slate-400" /> Risk Analysis
          </span>
          <Badge className={`${RISK_TONE[ai.riskAnalysis.riskLevel]} font-semibold px-2.5 py-1 text-[11px]`}>
            {ai.riskAnalysis.riskLevel} risk · {ai.riskAnalysis.riskScore}
          </Badge>
        </div>
        <ul className="text-[12.5px] text-slate-700 list-disc pl-4 space-y-0.5">
          {ai.riskAnalysis.riskFactors.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      </div>

      <div className="p-4 rounded-xl bg-purple-50">
        <div className="flex items-center gap-1.5 text-[12px] font-bold mb-1.5 text-purple-700">
          <Sparkles size={13} /> Resume summary
        </div>
        <p className="text-[12.5px] leading-relaxed text-slate-900">{ai.resumeSummary}</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-900 mb-2">
          <Lightbulb size={14} className="text-amber-500" /> Improvement Suggestions
        </div>
        <ul className="text-[12.5px] text-slate-700 list-disc pl-4 space-y-1">
          {ai.improvementSuggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>

      <KeywordAnalysis keywordAnalysis={ai.keywordAnalysis} />

      <div className="rounded-xl border border-slate-200 p-4">
        <div className="text-[12px] font-bold text-slate-700 mb-1">AI Explanation</div>
        <p className="text-[12.5px] text-slate-900">{ai.aiExplanation}</p>
      </div>
    </div>
  );
}
