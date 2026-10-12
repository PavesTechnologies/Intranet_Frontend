import React from "react";
import { cn } from "@/lib/utils";

export default function ARKPICard({
  label,
  subLabel,
  value,
  icon,
  color,
  onClick,
  suffix,
  className,
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex h-full min-h-[85px] w-full items-center gap-3 rounded-xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        "border-slate-200 bg-white",
        className
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
          color || "bg-secondary text-secondary-foreground"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex min-h-[40px] flex-col justify-center leading-tight">
          <p
            className="text-sm font-semibold text-slate-700 line-clamp-2"
            title={typeof label === "string" ? label : undefined}
          >
            {label}
          </p>
          {subLabel && (
            <p
              className="truncate text-xs font-normal text-slate-500"
              title={typeof subLabel === "string" ? subLabel : undefined}
            >
              {subLabel}
            </p>
          )}
        </div>
        <p
          className="truncate whitespace-nowrap text-xl font-bold tracking-tight tabular-nums text-slate-900 sm:text-2xl"
          title={typeof value === "string" || typeof value === "number" ? String(value) : undefined}
        >
          {value}
          {suffix}
        </p>
      </div>
    </div>
  );
}
