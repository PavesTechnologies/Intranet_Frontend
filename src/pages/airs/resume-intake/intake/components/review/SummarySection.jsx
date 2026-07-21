import React from "react";
import { Sparkles, MinusCircle } from "lucide-react";

export default function SummarySection({ summary }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-[13.5px] font-bold text-slate-900 flex items-center gap-2">
          <Sparkles size={15} className="text-slate-400" /> AI summary
        </h2>
      </div>
      <div className="p-5">
        {summary ? (
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
            <p className="text-[12.5px] text-slate-700 leading-relaxed">{summary}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[12px] text-slate-400">
            <MinusCircle size={14} /> No summary available for this resume.
          </div>
        )}
      </div>
    </section>
  );
}
