import {
  Sparkles,
  MousePointerClick,
  CheckCircle2,
  FileCheck2,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  Play,
} from "lucide-react";
import Button from "../../../../components/Button/Button";

export default function EmptyWorkspaceState({ configs = [], onSelectConfig }) {
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
      desc: "Pick an active project configuration from the left acquisition queue.",
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
    <div className="space-y-6">
      {/* Cockpit Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-6 text-white shadow-md border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-200 border border-indigo-400/30">
              <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
              Financial Control Cockpit
            </div>
            <h2 className="text-2xl font-extrabold text-white">
              Billing Data Acquisition Console
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed">
              Select a project setup from the queue on the left to inspect source timesheets, create commercial billing snapshots, and trigger invoice generation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15 shadow-inner text-xs">
            <div>
              <span className="text-slate-300 block text-[10px] uppercase font-bold tracking-wider">Pending Acquisition</span>
              <span className="text-lg font-bold text-amber-300 font-mono">{pendingConfigs.length} Projects</span>
            </div>
            <div className="sm:border-l sm:border-white/20 sm:pl-3">
              <span className="text-slate-300 block text-[10px] uppercase font-bold tracking-wider">Snapshots Ready</span>
              <span className="text-lg font-bold text-emerald-300 font-mono">{readyConfigs.length} Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start 4-Step Process */}
      <div className="rounded-2xl bg-white p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            Acquisition Lifecycle Standard Operating Procedure
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">Snapshot-Driven Billing Standard</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {steps.map((s) => (
            <div
              key={s.num}
              className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2 hover:bg-indigo-50/40 hover:border-indigo-200 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black font-mono text-indigo-600 bg-indigo-100/80 px-2 py-0.5 rounded">
                  {s.num}
                </span>
                <s.icon className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              <h4 className="font-bold text-xs text-slate-900 group-hover:text-indigo-900 transition-colors">
                {s.title}
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* High Priority Ready Items List */}
      <div className="rounded-2xl bg-white p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Pending Acquisition Worklist
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Projects awaiting source data snapshot generation for the active billing cycle.
            </p>
          </div>
          {pendingConfigs.length > 0 && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              {pendingConfigs.length} Action Required
            </span>
          )}
        </div>

        {pendingConfigs.length === 0 ? (
          <div className="rounded-xl bg-emerald-50/60 border border-emerald-200/80 p-5 text-center space-y-1">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-xs text-emerald-900">All Project Snapshots Acquired</h4>
            <p className="text-[11px] text-emerald-700">
              There are no pending acquisitions for the current billing cycle.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingConfigs.slice(0, 4).map((cfg) => (
              <div
                key={cfg.projectId}
                onClick={() => onSelectConfig(cfg)}
                className="group flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/50 transition-all cursor-pointer shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-900">
                      {cfg.projectName}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                      {cfg.projectCode}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {cfg.client} • <span className="font-mono text-[10px]">{cfg.billingPeriod}</span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  className="text-xs font-bold text-indigo-700 bg-white border-slate-200 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectConfig(cfg);
                  }}
                >
                  Acquire <ArrowRight className="h-3.5 w-3.5 ml-1 inline" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
