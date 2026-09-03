import React from "react";
import { ArrowRight, Clock } from "lucide-react";

/**
 * One master-module card on the Master Data Overview grid. Fully clickable;
 * `stats` is null for masters with no backend yet (renders a "pending"
 * badge instead of numbers — never fabricated counts).
 */
const MasterModuleCard = ({
  icon,
  title,
  description,
  stats,
  lastUpdated,
  pending = false,
  pendingLabel = "Pending Integration",
  onManage,
}) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onManage}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onManage?.();
        }
      }}
      className="group flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#0A0082]/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0A0082]/30"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0A0082]/10 text-[#0A0082]">
            {icon}
          </div>
          {pending && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
              {pendingLabel}
            </span>
          )}
        </div>

        <h3 className="mt-3 text-base font-bold text-slate-800">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>

        {!pending && stats && (
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="font-semibold text-slate-700">{stats.total} Records</span>
            <span className="font-semibold text-emerald-600">{stats.active} Active</span>
            {stats.inactive > 0 && (
              <span className="font-semibold text-rose-600">{stats.inactive} Inactive</span>
            )}
          </div>
        )}

        {!pending && lastUpdated && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            Updated {lastUpdated}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-[#0A0082]">
        Manage
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  );
};

export default MasterModuleCard;
