import React from "react";
import { ClipboardList } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
      <ClipboardList className="h-10 w-10 text-slate-300 mb-3" />
      <h3 className="text-sm font-semibold text-slate-800">No candidates in this queue</h3>
      <p className="mt-1.5 text-center text-xs text-slate-500 max-w-sm">
        Candidates at HM Review or Interview for this campaign will show up here.
      </p>
    </div>
  );
}
