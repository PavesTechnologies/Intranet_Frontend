import React, { useState } from "react";
import { ChevronDown, ChevronUp, Code2 } from "lucide-react";

// Section I — Expandable JSON View of the mock score_breakdown payload,
// shaped exactly like the backend's M07 API response.
export default function ScoreBreakdownJsonViewer({ json }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
        aria-controls="deterministic-json-view"
      >
        <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-900">
          <Code2 size={14} className="text-slate-400" />
          score_breakdown JSON
        </span>
        {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
      </button>

      {open && (
        <div id="deterministic-json-view" className="px-4 pb-4">
          <pre className="rounded-lg bg-slate-900 text-emerald-300 text-[11px] leading-relaxed p-3 overflow-x-auto max-h-96 overflow-y-auto">
            {JSON.stringify(json, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
