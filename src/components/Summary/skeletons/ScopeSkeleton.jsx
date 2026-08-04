// src/components/Summary/skeletons/ScopeSkeleton.jsx
import React from "react";

const SkeletonBlock = ({ className }) => (
  <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
);

const ScopeSkeleton = () => (
  <div className="h-full mb-4 p-5 border border-gray-200 rounded-lg bg-white">
    <SkeletonBlock className="h-6 w-40 mb-6" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
      <div className="grid grid-cols-4 gap-3">
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
      </div>
      <div className="flex justify-center items-center">
        <SkeletonBlock className="h-36 w-36 rounded-full" />
      </div>
    </div>
  </div>
);

export default ScopeSkeleton;
