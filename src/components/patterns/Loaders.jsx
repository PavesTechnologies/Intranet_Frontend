import React from "react";
import LoadingSpinner from "../LoadingSpinner";

// Canonical loading patterns, built on top of the existing LoadingSpinner
// (src/components/LoadingSpinner.jsx, 150+ existing consumers) rather than
// introducing a second spinner implementation.

export function PageLoader({ text = "Loading..." }) {
  return (
    <div className="flex min-h-[240px] w-full items-center justify-center">
      <LoadingSpinner text={text} size="lg" />
    </div>
  );
}

export function InlineLoader({ text = "" }) {
  return <LoadingSpinner text={text} size="sm" />;
}

export function TableSkeleton({ rows = 5, columns = 4, className = "" }) {
  return (
    <div className={`w-full ${className}`.trim()}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 border-b border-gray-100 px-4 py-3 last:border-b-0">
          {Array.from({ length: columns }).map((__, colIndex) => (
            <div key={colIndex} className="h-4 flex-1 animate-pulse rounded bg-gray-200" />
          ))}
        </div>
      ))}
    </div>
  );
}
