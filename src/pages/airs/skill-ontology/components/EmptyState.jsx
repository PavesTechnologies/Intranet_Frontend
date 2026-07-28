import React from "react";
import { Network } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="text-center py-16 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
      <Network className="h-10 w-10 text-slate-300 mx-auto mb-3" />
      <p className="text-xs font-bold text-slate-700">No Skills Found</p>
      <p className="text-[11px] text-slate-400 mt-1">
        No canonical skills have been added yet.
      </p>
    </div>
  );
}
