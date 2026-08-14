import React from "react";
import classNames from "classnames";

// Standard visual container for search/select/date-range/reset filter controls.
// Purely a layout shell — compose it with existing Input/Select/Button/etc.
export default function FilterBar({ children, className = "" }) {
  return (
    <div
      className={classNames(
        "flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
