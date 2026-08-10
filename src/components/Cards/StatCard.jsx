import React from "react";

export default function StatCard({
  title,
  value,
  subtitle,
  textColor = "text-slate-800",
  icon: Icon,
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {title}
        </p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
      </div>

      <p className={`mt-2 text-2xl font-bold ${textColor}`}>
        {value}
      </p>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      )}
    </div>
  );
}
