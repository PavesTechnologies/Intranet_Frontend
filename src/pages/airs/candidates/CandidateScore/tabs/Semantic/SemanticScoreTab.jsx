import React from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { getSemanticMock } from "./semanticMock";
import VectorMatchTable from "./components/VectorMatchTable";

const CONFIDENCE_TONE = {
  HIGH: "bg-emerald-100 text-emerald-800 border-emerald-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-100",
  LOW: "bg-rose-50 text-rose-700 border-rose-100",
};

function SimilarityBar({ label, pct, color }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11.5px] mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-900">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function SemanticScoreTab({ candidate }) {
  const semantic = getSemanticMock(candidate);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12.5px] font-bold text-slate-900">Semantic Score Card</span>
          <Badge className={`${CONFIDENCE_TONE[semantic.semanticConfidence]} font-bold px-3 py-1 text-[11px]`}>
            {semantic.semanticConfidence} confidence
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
            <div className="text-[10.5px] text-slate-400">Semantic Score</div>
            <div className="text-[17px] font-extrabold text-slate-900">{semantic.semanticScore}</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
            <div className="text-[10.5px] text-slate-400">Embedding Similarity</div>
            <div className="text-[17px] font-extrabold text-slate-900">{semantic.embeddingSimilarity.toFixed(3)}</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
            <div className="text-[10.5px] text-slate-400">Embedding Threshold</div>
            <div className="text-[17px] font-extrabold text-slate-900">{semantic.embeddingThreshold.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <span className="text-[12.5px] font-bold text-slate-900">Similarity Breakdown</span>
        <SimilarityBar label="Lexical" pct={semantic.similarityBreakdown.lexicalPct} color="#2563EB" />
        <SimilarityBar label="Contextual" pct={semantic.similarityBreakdown.contextualPct} color="#7C3AED" />
        <SimilarityBar label="Semantic" pct={semantic.similarityBreakdown.semanticPct} color="#0D9488" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <span className="text-[12.5px] font-bold text-slate-900 block mb-2.5">Top Semantic Matches</span>
        <div className="space-y-1.5">
          {semantic.topMatches.map((m, i) => (
            <div key={i} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
              <span className="text-[12.5px] font-semibold text-slate-900">{m.jdSkill}</span>
              <span className="text-[11.5px] text-slate-500">Similarity: {(m.similarity * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <span className="text-[12.5px] font-bold text-slate-900 block mb-2.5">Matched Skills</span>
        <div className="flex flex-wrap gap-1.5">
          {semantic.matchedSkills.map((s) => (
            <Badge key={s} className="bg-blue-50 text-blue-700 border-blue-100 font-medium px-2.5 py-1 text-[11px]">
              {s}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[12.5px] font-bold text-slate-900 block mb-2.5">Vector Match Details</span>
        <VectorMatchTable items={semantic.vectorMatchDetails} />
      </div>

      <div className="p-4 rounded-xl bg-indigo-50">
        <div className="flex items-center gap-1.5 text-[12px] font-bold mb-1.5 text-indigo-700">
          <Sparkles size={13} /> Semantic explanation
        </div>
        <p className="text-[12.5px] leading-relaxed text-slate-900">{semantic.semanticExplanation}</p>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <div className="text-[12px] font-bold text-slate-700 mb-1">Semantic Recommendation</div>
        <p className="text-[12.5px] text-slate-900">{semantic.semanticRecommendation}</p>
      </div>
    </div>
  );
}
