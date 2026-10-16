import React from "react";
import { AlertTriangle, CheckCircle2, Flag, PlayCircle, Receipt } from "lucide-react";
import { formatPercent } from "../utils/milestoneUtils";

// Same card anatomy as Analytics/components/KpiCards.jsx so the tab feels native.
const KpiCard = ({ icon: Icon, iconBg, iconColor, label, value, sub }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
      <Icon className={`w-5 h-5 ${iconColor}`} aria-hidden="true" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-2xl font-semibold text-slate-800 leading-tight tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const AllocationCard = ({ allocated, complete }) => {
  const pct = Math.min(Math.max(Number(allocated) || 0, 0), 100);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Billing allocation</p>
      <div className="flex items-baseline gap-2">
        <p className={`text-2xl font-semibold leading-tight tabular-nums ${complete ? "text-emerald-700" : "text-amber-700"}`}>
          {formatPercent(allocated ?? 0)}
        </p>
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${complete ? "text-emerald-700" : "text-amber-700"}`}>
          {complete ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {complete ? "Fully allocated" : `${formatPercent(Math.max(0, 100 - (Number(allocated) || 0)))} unallocated`}
        </span>
      </div>
      <div
        className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden"
        role="progressbar"
        aria-label="Allocated share of project value"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${complete ? "bg-emerald-500" : "bg-amber-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 h-[76px] animate-pulse motion-reduce:animate-none">
    <div className="h-3 w-20 bg-slate-100 rounded mb-2" />
    <div className="h-6 w-12 bg-slate-100 rounded" />
  </div>
);

const MilestoneSummaryCards = ({ summary, isLoading }) => {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <KpiCard
        icon={Flag}
        iconBg="bg-indigo-50"
        iconColor="text-indigo-600"
        label="Total"
        value={summary.total}
      />
      <KpiCard
        icon={PlayCircle}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        label="In progress"
        value={summary.inProgress}
      />
      <KpiCard
        icon={CheckCircle2}
        iconBg="bg-green-50"
        iconColor="text-green-600"
        label="Completed"
        value={summary.completed}
      />
      <KpiCard
        icon={Receipt}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        label="Ready for billing"
        value={summary.readyForBilling}
      />
      <div className="col-span-2 lg:col-span-1">
        <AllocationCard allocated={summary.allocatedPercentage} complete={summary.allocationComplete} />
      </div>
    </div>
  );
};

export default MilestoneSummaryCards;
