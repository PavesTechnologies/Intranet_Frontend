import React from "react";
import { Fonts } from "../Fonts/Fonts";

// Canonical enterprise card surface. `title`/`subtitle`/`actions` are optional —
// omitting them renders exactly the plain card every existing consumer already gets.
export function PageCard({ children, className = "", title, subtitle, actions }) {
  const hasHeader = Boolean(title || subtitle || actions);

  return (
    <div className={`rounded-xl border bg-white shadow-sm ${className}`}>
      {hasHeader && (
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            {title ? <h3 className={Fonts.heading4}>{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      )}
      {children}
    </div>
  );
}

const PADDING_CLASSES = {
  none: "",
  sm: "p-2",
  md: "p-4",
  lg: "p-6",
};

export function PageCardContent({ children, className = "", padding = "md" }) {
  const paddingClass = className.includes("p-") ? "" : PADDING_CLASSES[padding] ?? PADDING_CLASSES.md;
  return (
    <div className={`${paddingClass} ${className}`.trim()}>
      {children}
    </div>
  );
}
