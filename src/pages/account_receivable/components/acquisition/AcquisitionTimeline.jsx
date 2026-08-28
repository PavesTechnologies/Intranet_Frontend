import { useState } from "react";
import { Clock, ChevronDown, Activity } from "lucide-react";

export default function AcquisitionTimeline({ history = [] }) {
  const [expanded, setExpanded] = useState(false);

  const defaultHistory = [
    {
      id: 1,
      event: "Billing Snapshot Created",
      details: "Snapshot BS-20260814120000 generated for Website Redesign (PRJ-23)",
      timestamp: "Today at 12:00 PM",
      actor: "SYSTEM",
      type: "success",
    },
    {
      id: 2,
      event: "TMS Timesheet Sync",
      details: "48 approved billable hours imported from Time Management System",
      timestamp: "Today at 11:58 AM",
      actor: "TMS Integration Engine",
      type: "info",
    },
    {
      id: 3,
      event: "Rate Model Merged",
      details: "Applied standard flat rate of INR 1,500/hr from AR Billing Configuration",
      timestamp: "Today at 11:58 AM",
      actor: "AR Setup Service",
      type: "info",
    },
    {
      id: 4,
      event: "Validation Checklist Passed",
      details: "Duplicate billing check & currency consistency check completed successfully",
      timestamp: "Today at 11:57 AM",
      actor: "AR Validator",
      type: "success",
    },
  ];

  const events = history.length > 0 ? history : defaultHistory;
  const [latest, ...rest] = events;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Clock className="h-4 w-4 flex-shrink-0 text-slate-400" />
          <span className="text-sm font-semibold text-slate-900">Audit Log</span>
          {latest && !expanded && (
            <span className="truncate text-xs text-slate-400">
              &middot; {latest.event} &middot; {latest.timestamp}
            </span>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-500">
            {events.length}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 sm:px-5">
          <ol className="relative space-y-4 border-l border-slate-200 pl-4">
            {events.map((evt, idx) => (
              <li key={evt.id || idx} className="relative">
                <span
                  className={`absolute -left-[1.15rem] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white ring-1 ${
                    evt.type === "success"
                      ? "bg-emerald-500 ring-emerald-200"
                      : "bg-indigo-500 ring-indigo-200"
                  }`}
                >
                  <Activity className="h-2 w-2 text-white" />
                </span>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="text-xs font-semibold text-slate-900">{evt.event}</span>
                  <span className="font-mono text-[11px] text-slate-400">{evt.timestamp}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{evt.details}</p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-400">{evt.actor}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
