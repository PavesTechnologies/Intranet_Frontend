import { useState } from "react";
import {
  Sparkles,
  MousePointerClick,
  FileCheck2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Play,
  ChevronDown,
} from "lucide-react";

export default function EmptyWorkspaceState({ configs = [], onViewConfig }) {
  const [sopOpen, setSopOpen] = useState(false);

  const pendingConfigs = configs.filter(
    (c) => c.billingStatus === "NOT_ACQUIRED" || c.billingStatus === "Not Acquired"
  );
  const readyConfigs = configs.filter(
    (c) => c.billingStatus === "READY" || c.billingStatus === "Ready" || Boolean(c.snapshotNumber)
  );

  const steps = [
    {
      num: "01",
      title: "Select Queue Item",
      desc: "Pick an active project configuration from the acquisition queue.",
      icon: MousePointerClick,
    },
    {
      num: "02",
      title: "Review Readiness",
      desc: "Validate billing frequency, rates, and source TMS approval status.",
      icon: ShieldCheck,
    },
    {
      num: "03",
      title: "Acquire Source Snapshot",
      desc: "Fetch approved billable timesheets and calculate commercial subtotals.",
      icon: Play,
    },
    {
      num: "04",
      title: "Generate Invoice Draft",
      desc: "Apply dynamic tax rules and commit snapshot to the billing ledger.",
      icon: FileCheck2,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Clean, centered empty state */}
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <Sparkles className="h-5 w-5" />
        </span>
        <h2 className="mt-3 text-base font-semibold text-slate-900">Select a project to begin</h2>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-500">
          Choose a setup from the Acquisition Queue above to inspect source timesheets, build a
          commercial snapshot, and generate the invoice draft.
        </p>

        <div className="mx-auto mt-5 flex w-fit gap-6 rounded-lg bg-slate-50 px-6 py-3 text-xs">
          <div>
            <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">Pending</span>
            <span className="text-lg font-bold text-amber-600">{pendingConfigs.length}</span>
          </div>
          <div className="border-l border-slate-200 pl-6">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">Ready</span>
            <span className="text-lg font-bold text-emerald-600">{readyConfigs.length}</span>
          </div>
        </div>
      </div>

      {/* Pending worklist — only shown when there is something to act on */}
      {pendingConfigs.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              Pending Acquisition
            </h3>
            <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              {pendingConfigs.length} action{pendingConfigs.length > 1 ? "s" : ""} required
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingConfigs.slice(0, 6).map((cfg) => (
              <div
                key={cfg.projectId}
                onClick={() => onViewConfig(cfg)}
                className="group flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white p-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-semibold text-slate-900">{cfg.projectName}</span>
                  </div>
                  <div className="truncate text-[11px] text-slate-500">
                    {cfg.client} &middot; <span className="font-mono">{cfg.projectCode}</span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-slate-300 transition-colors group-hover:text-indigo-600" />
              </div>
            ))}
          </div>

          {pendingConfigs.length > 6 && (
            <p className="mt-2.5 text-[11px] text-amber-700">
              +{pendingConfigs.length - 6} more in the &ldquo;Pending&rdquo; queue filter
            </p>
          )}
        </div>
      )}

      {/* Collapsible SOP / help */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setSopOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left sm:px-5"
        >
          <span className="text-xs font-semibold text-slate-600">How acquisition works</span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${sopOpen ? "rotate-180" : ""}`}
          />
        </button>

        {sopOpen && (
          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 p-4 pt-3 sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.num} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-indigo-600">
                    {s.num}
                  </span>
                  <s.icon className="h-3.5 w-3.5 text-slate-400" />
                  <h4 className="text-xs font-semibold text-slate-900">{s.title}</h4>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
