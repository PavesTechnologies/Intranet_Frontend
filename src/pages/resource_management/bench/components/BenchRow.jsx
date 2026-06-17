import React from "react";
import { AlertTriangle } from "lucide-react";
import HoverActions from "./HoverActions";
import StatusIndicator from "./StatusIndicator";
import { getAgingTone } from "../models/benchModel";

const formatCurrency = (value, currencyType) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "NA";
  return `${currencyType || "Rs"} ${Number(value).toLocaleString("en-IN")}`;
};

const getAvailabilityTone = (availability) => {
  if (availability >= 75) {
    return {
      bar: "from-emerald-400 via-teal-400 to-cyan-400 shadow-[0_0_22px_rgba(45,212,191,0.35)]",
      text: "text-emerald-200",
      track: "bg-emerald-500/10",
    };
  }
  if (availability >= 40) {
    return {
      bar: "from-amber-300 via-amber-400 to-orange-400 shadow-[0_0_22px_rgba(251,191,36,0.28)]",
      text: "text-amber-100",
      track: "bg-amber-500/10",
    };
  }
  return {
    bar: "from-rose-400 via-rose-500 to-red-500 shadow-[0_0_22px_rgba(251,113,133,0.28)]",
    text: "text-rose-100",
    track: "bg-rose-500/10",
  };
};

const BenchRow = ({ row, active, onView, onEdit, onAllocate }) => {
  const agingTone = getAgingTone(row.agingDays);
  const availabilityTone = getAvailabilityTone(row.availability);

  return (
    <div
      className={`group relative rounded-[26px] border px-4 py-4 transition-all duration-200 md:px-5 ${
        active
          ? "border-indigo-500/40 bg-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.45)]"
          : "border-slate-800/90 bg-slate-950/75 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-[0_18px_40px_rgba(2,6,23,0.35)]"
      }`}
    >
      <HoverActions
        onView={(event) => {
          event.stopPropagation();
          onView(row);
        }}
        onEdit={(event) => {
          event.stopPropagation();
          onEdit(row);
        }}
        onAllocate={(event) => {
          event.stopPropagation();
          onAllocate(row);
        }}
      />

      <button
        type="button"
        onClick={() => onView(row)}
        className="grid w-full gap-4 text-left md:grid-cols-[minmax(220px,1.5fr)_minmax(180px,1.2fr)_minmax(140px,0.9fr)_minmax(180px,1fr)_minmax(120px,0.8fr)_minmax(120px,0.9fr)]"
      >
        <div className="min-w-0 pr-28 md:pr-44">
          <div className="flex items-start gap-3">
            <StatusIndicator status={row.subState} compact />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-tight text-white">{row.name}</p>
              <p className="mt-1 truncate text-sm text-slate-400">{row.role}</p>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            {row.topSkills.length === 0 ? (
              <span className="rounded-full border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-[11px] text-slate-500">
                No skills logged
              </span>
            ) : (
              row.topSkills.map((skill) => (
                <span
                  key={`${row.id}-${skill.name}`}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    skill.stale
                      ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
                      : "border-slate-700 bg-slate-900/90 text-slate-200"
                  }`}
                >
                  {skill.name}
                </span>
              ))
            )}
          </div>
          {(row.warnings.missingSkills || row.missingSkills.length > 0) && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-200">
              <AlertTriangle className="h-3.5 w-3.5" />
              Skill gap
            </div>
          )}
        </div>

        <div className="flex items-center">
          <StatusIndicator status={row.subState} />
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className={`text-sm font-semibold ${availabilityTone.text}`}>{row.availability}%</span>
            <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Available</span>
          </div>
          <div className={`mt-2 h-2.5 overflow-hidden rounded-full ${availabilityTone.track}`}>
            <div
              className={`h-full rounded-full bg-gradient-to-r ${availabilityTone.bar} transition-[width] duration-700 ease-out`}
              style={{ width: `${Math.max(0, Math.min(100, row.availability || 0))}%` }}
            />
          </div>
        </div>

        <div className="flex items-center">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${agingTone.className}`}>
            {agingTone.label}
          </span>
        </div>

        <div className="flex items-center justify-start md:justify-end">
          <div>
            <p className={`text-sm font-semibold ${row.warnings.highCost ? "text-rose-200" : "text-slate-100"}`}>
              {formatCurrency(row.costPerDay, row.currencyType)}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">Daily cost</p>
          </div>
        </div>
      </button>
    </div>
  );
};

export default BenchRow;
