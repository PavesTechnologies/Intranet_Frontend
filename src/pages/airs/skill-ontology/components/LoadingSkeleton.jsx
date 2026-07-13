import React from "react";

// Same Pulse-based skeleton pattern used by src/pages/Projects/MyWork/skeletons/MyWorkSkeletons.jsx —
// module-local, not a shared component, matching the app's per-module skeleton convention.
const Pulse = ({ className = "" }) => <div className={`bg-slate-200 rounded animate-pulse ${className}`} />;

export function SkillTableSkeleton({ rows = 6 }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <Pulse className="h-3 w-40" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Pulse className="h-3 w-32" />
            <Pulse className="h-3 w-20" />
            <Pulse className="h-3 w-24" />
            <Pulse className="h-3 w-14" />
            <Pulse className="h-3 w-16" />
            <Pulse className="h-3 w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkillCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-3">
      <Pulse className="h-4 w-48" />
      <Pulse className="h-3 w-32" />
      <div className="flex gap-2 mt-2">
        <Pulse className="h-6 w-20 rounded-full" />
        <Pulse className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function TreeSkeleton({ nodes = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: nodes }).map((_, i) => (
        <div key={i} className="flex items-center gap-2" style={{ paddingLeft: (i % 3) * 16 }}>
          <Pulse className="h-3 w-3 rounded-full" />
          <Pulse className="h-3 w-40" />
          <Pulse className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function DrawerFormSkeleton() {
  return (
    <div className="space-y-4 p-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <Pulse className="h-3 w-24 mb-2" />
          <Pulse className="h-9 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
