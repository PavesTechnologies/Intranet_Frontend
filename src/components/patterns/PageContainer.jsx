import React from "react";
import classNames from "classnames";

const DENSITY_CLASSES = {
  comfortable: "p-4 md:p-6",
  compact: "p-3 md:p-4",
};

// Standard page-level spacing wrapper. Not yet adopted by any module page —
// available for Phase 2 migrations.
export default function PageContainer({ children, className = "", density = "comfortable" }) {
  return (
    <div className={classNames("w-full min-h-full", DENSITY_CLASSES[density] || DENSITY_CLASSES.comfortable, className)}>
      {children}
    </div>
  );
}
