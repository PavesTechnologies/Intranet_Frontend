import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Button from "../../../../components/Button/Button";

// Skeletons render at the real card dimensions so the layout
// doesn't jump when data arrives.
export function SkeletonTiles({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-pulse">
          <div className="h-2.5 w-20 bg-slate-200 rounded mb-3" />
          <div className="h-6 w-12 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}

// A failed section shows what failed and offers retry —
// it never leaves a permanent skeleton or blank space.
export function SectionError({ message, onRetry }) {
  return (
    <div className="bg-white border border-rose-200 rounded-xl p-6 text-center">
      <AlertTriangle className="h-6 w-6 text-rose-500 mx-auto mb-2" />
      <p className="text-xs font-bold text-slate-700">{message}</p>
      <Button variant="outline" size="small" className="mt-3" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5" /> Retry
      </Button>
    </div>
  );
}

// Welcoming, action-oriented — never an error style.
export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center">
      {Icon && <Icon className="h-8 w-8 text-slate-300 mx-auto mb-3" />}
      <p className="text-sm font-bold text-slate-700">{title}</p>
      {message && <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
