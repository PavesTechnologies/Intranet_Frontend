import React, { useState } from "react";
import { Info } from "lucide-react";

export default function StatCard({
  title,
  value,
  subtitle,
  textColor = "text-slate-800",
  icon: Icon,
  info,
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-500">
          {title}
          {info && (
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
          )}
        </p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
      </div>

      <p className={`mt-2 text-2xl font-bold ${textColor}`}>
        {value}
      </p>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      )}
      {info && open && (
        <p role="tooltip" className="absolute left-3 right-3 top-full z-20 mt-1 rounded-lg border border-slate-200 bg-white p-2.5 text-xs normal-case leading-relaxed tracking-normal text-slate-700 shadow-lg">
          {info}
        </p>
      )}
    </div>
  );
}
