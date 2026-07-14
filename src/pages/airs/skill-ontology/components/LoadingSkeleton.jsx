import React from "react";

// Same Pulse-based skeleton pattern used by src/pages/Projects/MyWork/skeletons/MyWorkSkeletons.jsx —
// module-local, not a shared component. Only the Hierarchy page's tree still
// uses a skeleton here; the list/table and forms now use the global
// LoadingSpinner component instead (see components/SkillTable.jsx).
const Pulse = ({ className = "" }) => <div className={`bg-slate-200 rounded animate-pulse ${className}`} />;

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
