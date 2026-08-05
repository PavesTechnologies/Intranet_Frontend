import React from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

/**
 * Floating bottom-center action bar for bulk Approve/Reject across selected employees.
 * Purely presentational — the parent owns selection + the API calls.
 *
 * Props:
 *  - count:      number of selected employees (bar hides when 0)
 *  - onApprove:  () => void
 *  - onReject:   () => void  (opens the reason modal in the parent)
 *  - onClear:    () => void
 *  - loading:    boolean (disables the action buttons while a request is in flight)
 */
const BulkApprovalBar = ({ count = 0, onApprove, onReject, onClear, loading }) => {
  if (!count) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white/95 backdrop-blur px-4 py-2.5 shadow-[0_12px_32px_rgba(8,21,52,0.18)]">
        <span className="flex items-center gap-2 pr-1 text-sm font-semibold text-[#263383]">
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#263383] px-1.5 text-xs font-bold text-white">
            {count}
          </span>
          selected
        </span>

        <span className="h-6 w-px bg-gray-200" />

        <button
          type="button"
          onClick={onApprove}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <CheckCircle2 size={16} />
          Approve All
        </button>

        <button
          type="button"
          onClick={onReject}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <XCircle size={16} />
          Reject All
        </button>

        <button
          type="button"
          onClick={onClear}
          disabled={loading}
          title="Clear selection"
          aria-label="Clear selection"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-60"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default BulkApprovalBar;
