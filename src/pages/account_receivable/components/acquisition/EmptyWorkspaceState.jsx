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
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              Financial Control Cockpit
            </div>
            <h2 className="text-xl font-bold text-slate-900">Billing Data Acquisition Console</h2>
            <p className="text-sm leading-relaxed text-slate-500">
              Select a project setup from the queue on the left to inspect source timesheets, create commercial billing snapshots, and trigger invoice generation.
            </p>
          </div>

          <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:flex-row">
            <div>
              <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">Pending Acquisition</span>
              <span className="text-lg font-bold text-amber-600">{pendingConfigs.length} Projects</span>
            </div>
            <div className="border-l border-slate-200 pl-3">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">Snapshots Ready</span>
              <span className="text-lg font-bold text-emerald-600">{readyConfigs.length} Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start 4-Step Process */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            Acquisition Lifecycle Standard Operating Procedure
          </h3>
          <span className="text-xs font-medium text-slate-500">Snapshot-Driven Billing Standard</span>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.num}
              className="group space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/40"
            >
              <div className="flex items-center justify-between">
                <span className="rounded bg-indigo-100 px-2 py-0.5 font-mono text-xs font-bold text-indigo-600">
                  {s.num}
                </span>
                <s.icon className="h-5 w-5 text-slate-400 transition-colors group-hover:text-indigo-600" />
              </div>
              <h4 className="text-xs font-semibold text-slate-900 transition-colors group-hover:text-indigo-900">
                {s.title}
              </h4>
              <p className="text-xs leading-relaxed text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* High Priority Ready Items List */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Pending Acquisition Worklist
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Projects awaiting source data snapshot generation for the active billing cycle.
            </p>
          </div>
          {pendingConfigs.length > 0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {pendingConfigs.length} Action Required
            </span>
          )}
        </div>

        {pendingConfigs.length === 0 ? (
          <div className="space-y-1 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 text-center">
            <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />
            <h4 className="text-xs font-semibold text-emerald-900">All Project Snapshots Acquired</h4>
            <p className="text-xs text-emerald-700">
              There are no pending acquisitions for the current billing cycle.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 pt-1 md:grid-cols-2">
            {pendingConfigs.slice(0, 4).map((cfg) => (
              <div
                key={cfg.projectId}
                onClick={() => onSelectConfig(cfg)}
                className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 transition-all hover:border-indigo-300 hover:bg-indigo-50/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-indigo-900">
                      {cfg.projectName}
                    </span>
                    <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                      {cfg.projectCode}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {cfg.client} • <span className="font-mono text-[11px]">{cfg.billingPeriod}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="small"
                  className="group-hover:border-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectConfig(cfg);
                  }}
                >
                  Acquire <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
