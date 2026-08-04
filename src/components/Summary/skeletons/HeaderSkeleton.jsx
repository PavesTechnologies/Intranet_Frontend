// src/components/Summary/skeletons/HeaderSkeleton.jsx
import React from "react";

const SkeletonBlock = ({ className }) => (
  <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
);

const HeaderSkeleton = () => (
  <div className="mb-6 px-1">
    <div className="flex items-center justify-between">
      <div>
        <SkeletonBlock className="h-8 w-48 mb-2" />
        <SkeletonBlock className="h-4 w-64" />
      </div>
      <div>
        <SkeletonBlock className="h-7 w-32 rounded-full" />
      </div>
    </div>
  </div>
);

export default HeaderSkeleton;
