// src/components/Summary/skeletons/StatusSkeleton.jsx
import React from "react";

const SkeletonBlock = ({ className }) => (
  <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
);

const StatusSkeleton = () => (
  <div className="h-full mb-4 p-10 border border-gray-200 rounded-lg bg-white">
    <SkeletonBlock className="h-6 w-48 mb-3" />
    <SkeletonBlock className="h-4 w-72 mb-6" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
      <SkeletonBlock className="h-64 w-64 rounded-full mx-auto" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <div className="flex justify-between items-center mb-2">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-4 w-12" />
            </div>
            <SkeletonBlock className="h-2 w-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default StatusSkeleton;
