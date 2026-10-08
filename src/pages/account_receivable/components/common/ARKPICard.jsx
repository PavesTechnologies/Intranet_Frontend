import React from "react";
import { cn } from "@/lib/utils";

export default function ARKPICard({
  label,
  subLabel,
  value,
  icon,
  color,
  active,
  onClick,
  suffix,
  className,
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex h-full min-h-[96px] w-full items-center gap-3 rounded-xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        active ? "border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-500/30" : "border-slate-200 bg-white",
        className
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          color || "bg-secondary text-secondary-foreground"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 leading-tight min-h-[32px] flex flex-col justify-center">
          <p
            className="text-xs font-semibold text-slate-700 line-clamp-2"
            title={typeof label === "string" ? label : undefined}
          >
            {label}
          </p>
          {subLabel && (
            <p
              className="text-[11px] font-normal text-slate-500 truncate"
              title={typeof subLabel === "string" ? subLabel : undefined}
            >
              {subLabel}
            </p>
          )}
        </div>
        <p className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
          {value}
          {suffix}
        </p>
      </div>
    </div>
  );
}
