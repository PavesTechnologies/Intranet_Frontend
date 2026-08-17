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

// KPI/stat-tile content layout — icon + label + value + optional supporting
// text. Purely presentational: the caller computes and formats `value` and
// provides an already-calculated `sub` string/node if it wants one; this
// renders no chart, trend arrow, or status color of its own, since repo-wide
// KPI implementations render "supporting text" too differently (a plain
// percentage, a colored badge, a progress bar) to consolidate safely.
// Compose it inside <PageCard><PageCardContent>...</PageCardContent></PageCard>
// to get the canonical rounded/border/shadow card shell for free — this is
// intentionally not a new card component, since PageCard's existing default
// look already matches every audited KPI tile's own outer container.
// Clickable KPI tiles are not handled here either: wrap the whole card in a
// <button> at the call site (as the one existing clickable KPI consumer
// already does) rather than baking onClick into the canonical layer for a
// need only one module currently has. See docs/ui/phase-2-leave-management.md
// ("P1.4 — PageCard KPI / Dashboard Tile Enhancement") for the full rationale.
export function PageCardKpi({ icon, iconClassName = "", label, value, sub, className = "" }) {
  return (
    <div className={`flex items-center gap-4 ${className}`.trim()}>
      {icon ? (
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            iconClassName || "bg-gray-100 text-gray-500"
          }`.trim()}
        >
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-2xl font-semibold leading-tight text-gray-900">{value}</p>
        {sub ? <p className="mt-0.5 text-xs text-gray-500">{sub}</p> : null}
      </div>
    </div>
  );
}
