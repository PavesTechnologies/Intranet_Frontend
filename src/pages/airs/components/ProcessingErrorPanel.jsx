import React, { useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";

// The two error fields the processing endpoints now return, rendered the one
// way both pipelines should render them: `message` is the human-readable copy
// and is always visible; `detail` is the raw exception (stack traces, upstream
// status codes) and stays collapsed behind an explicit toggle, never shown to
// a user who didn't ask for it.
export default function ProcessingErrorPanel({ message, detail, className = "" }) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  if (!message && !detail) return null;

  return (
    <div className={`bg-rose-50 border border-rose-100 text-rose-700 rounded-lg px-3 py-2 ${className}`}>
      <div className="flex items-start gap-2 text-[11px] font-medium">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
        <span className="min-w-0">{message || "This upload failed."}</span>
      </div>

      {detail && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDetailOpen((open) => !open);
            }}
            className="flex items-center gap-1 mt-2 ml-5 text-[10px] font-semibold uppercase tracking-wide text-rose-500 hover:text-rose-700 transition"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${isDetailOpen ? "rotate-180" : ""}`} />
            Technical details
          </button>
          {isDetailOpen && (
            <pre className="mt-2 ml-5 p-2 bg-white/70 border border-rose-100 rounded text-[10px] text-rose-800 font-mono whitespace-pre-wrap break-words">
              {detail}
            </pre>
          )}
        </>
      )}
    </div>
  );
}
