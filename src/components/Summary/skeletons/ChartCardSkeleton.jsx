// src/components/Summary/skeletons/ChartCardSkeleton.jsx
import React from "react";

const SkeletonBlock = ({ className }) => (
  <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
);

const ChartCardSkeleton = () => (
  <div className="p-10 border border-gray-200 rounded-lg bg-white h-full">
    <SkeletonBlock className="h-6 w-56 mb-8" />
    <SkeletonBlock className="h-60 w-full" />
  </div>
);

export default ChartCardSkeleton;
