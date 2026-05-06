// src/pages/Projects/MyWork/skeletons/MyWorkSkeletons.jsx
import React from "react";

const Pulse = ({ className }) => (
  <div className={`bg-slate-200 rounded animate-pulse ${className}`} />
);

export const SnapshotBarSkeleton = () => (
  <div className="flex gap-3 mb-6">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex-1 bg-white border border-slate-200 rounded-xl p-4">
        <Pulse className="h-7 w-10 mb-2" />
        <Pulse className="h-3 w-16" />
      </div>
    ))}
  </div>
);

export const CardSkeleton = () => (
  <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 last:border-0">
    <Pulse className="h-5 w-14 rounded-full" />
    <div className="flex-1 space-y-1.5">
      <Pulse className="h-4 w-3/4" />
      <Pulse className="h-3 w-1/3" />
    </div>
    <Pulse className="h-6 w-20 rounded-full" />
    <Pulse className="h-6 w-14 rounded-full" />
  </div>
);

export const ProjectGroupSkeleton = () => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-3">
    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
      <div className="flex items-center gap-3">
        <Pulse className="h-4 w-4 rounded" />
        <Pulse className="h-5 w-36" />
        <Pulse className="h-5 w-16 rounded-full" />
      </div>
      <Pulse className="h-4 w-12" />
    </div>
    {/* Cards */}
    {[...Array(3)].map((_, i) => <CardSkeleton key={i} />)}
  </div>
);

export const MyWorkPageSkeleton = () => (
  <div className="p-6 max-w-5xl mx-auto">
    {/* Page header */}
    <div className="flex items-center justify-between mb-6">
      <div>
        <Pulse className="h-8 w-32 mb-2" />
        <Pulse className="h-4 w-56" />
      </div>
      <div className="flex gap-2">
        <Pulse className="h-9 w-32 rounded-lg" />
        <Pulse className="h-9 w-32 rounded-lg" />
        <Pulse className="h-9 w-32 rounded-lg" />
      </div>
    </div>
    <SnapshotBarSkeleton />
    <ProjectGroupSkeleton />
    <ProjectGroupSkeleton />
  </div>
);