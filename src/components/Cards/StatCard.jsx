import React, { useState } from "react";
import { Info } from "lucide-react";

/**
 * `variant="detailed"` is the dashboard KPI card: label + boxed icon on top, value, then the
 * description. The header row is never shorter than the icon box, so one- and two-line labels put
 * every value in a row on the same line, and long values/descriptions wrap instead of overflowing.
 */
export default function StatCard({
  title,
  value,
  subtitle,
  textColor = "text-slate-800",
  icon: Icon,
  info,
  variant = "default",
}) {
  const [open, setOpen] = useState(false);
  const infoButton = info && (
    <span
      role="button"
      tabIndex={0}
      aria-label={`What does ${title} mean?`}
      aria-expanded={open}
      onClick={(e) => {
        e.stopPropagation();
        setOpen((v) => !v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }
      }}
      onBlur={() => setOpen(false)}
      className="inline-flex cursor-help rounded-full text-slate-400 hover:text-[#0A0082] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40"
    >
      <Info className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  );
  const tooltip = info && open && (
    <p role="tooltip" className="absolute left-3 right-3 top-full z-20 mt-1 rounded-lg border border-slate-200 bg-white p-2.5 text-xs normal-case leading-relaxed tracking-normal text-slate-700 shadow-lg">
      {info}
    </p>
  );

  if (variant === "detailed") {
    return (
      <div className="relative flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex min-h-9 items-start justify-between gap-3">
          <span className="flex min-w-0 items-start gap-1 text-xs font-medium uppercase leading-4 tracking-wide text-slate-500">
            <span className="break-words">{title}</span>
            {infoButton}
          </span>
          {Icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
        </div>
        <p className={`mt-3 break-words text-2xl font-bold leading-tight tabular-nums ${textColor}`}>{value}</p>
        {subtitle && <p className="mt-1.5 break-words text-xs leading-relaxed text-slate-500">{subtitle}</p>}
        {tooltip}
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-500">
          {title}
          {infoButton}
        </p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
      </div>

      <p className={`mt-2 text-2xl font-bold ${textColor}`}>
        {value}
      </p>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      )}
      {tooltip}
    </div>
  );
}
