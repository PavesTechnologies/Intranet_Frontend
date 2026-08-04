// src/components/Summary/skeletons/ListCardSkeleton.jsx
import React from "react";

const SkeletonBlock = ({ className }) => (
  <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
);

const ListCardSkeleton = () => (
  <div className="p-10 border border-gray-200 rounded-lg bg-white">
    <SkeletonBlock className="h-6 w-48 mb-8" />
    <SkeletonBlock className="h-24 w-full" />
  </div>
);

export default ListCardSkeleton;
