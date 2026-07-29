import React from "react";
import { Badge } from "@/components/ui/badge";

// Keyword Analysis section — matched vs. missing JD keywords plus density.
export default function KeywordAnalysis({ keywordAnalysis }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-bold text-slate-900">Keyword Analysis</span>
        <span className="text-[11.5px] text-slate-500">
          Density: <span className="font-semibold text-slate-900">{keywordAnalysis.keywordDensityPct}%</span>
        </span>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-emerald-600 mb-1.5">Matched Keywords</div>
        <div className="flex flex-wrap gap-1.5">
          {keywordAnalysis.matchedKeywords.length === 0 && <span className="text-[11.5px] text-slate-400">None</span>}
          {keywordAnalysis.matchedKeywords.map((k) => (
            <Badge key={k} className="bg-emerald-50 text-emerald-700 border-emerald-100 font-medium px-2.5 py-1 text-[11px]">
              {k}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-rose-600 mb-1.5">Missing Keywords</div>
        <div className="flex flex-wrap gap-1.5">
          {keywordAnalysis.missingKeywords.length === 0 && <span className="text-[11.5px] text-slate-400">None</span>}
          {keywordAnalysis.missingKeywords.map((k) => (
            <Badge key={k} className="bg-rose-50 text-rose-700 border-rose-100 font-medium px-2.5 py-1 text-[11px]">
              {k}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
