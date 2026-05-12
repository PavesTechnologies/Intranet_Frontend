import React from "react";
import {
  WarningIcon,
  DoubleCheckIcon,
  LayersIcon,
  UserMinusIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

const cardConfig = {
  "Active Allocations": {
    icon: LayersIcon,
    colorClass: "bg-slate-100 text-slate-600",
  },
  "Pending Role-Offs": {
    icon: UserMinusIcon,
    colorClass: "bg-amber-100 text-amber-600",
  },
  "High Impact Allocations": {
    icon: WarningIcon,
    colorClass: "bg-rose-100 text-rose-600",
  },
  "Total RoleOff": {
    icon: DoubleCheckIcon,
    colorClass: "bg-indigo-100 text-indigo-600",
  },
};

const KPICard = ({ label, count }) => {
  const config = cardConfig[label] || cardConfig["Active Allocations"];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-slate-200 hover:shadow-md">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm",
          config.colorClass,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="mb-0.5 text-xs font-medium tracking-tight text-slate-500">
          {label}
        </p>
        <p className="text-2xl font-bold tracking-tight text-slate-900">
          {count}
        </p>
      </div>
    </div>
  );
};

const RoleOffSummaryCard = ({ title, description, metrics = [], action = null }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#102a56]">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div
        className={cn(
          "grid gap-4",
          metrics.length === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
          metrics.length !== 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {metrics.map((metric) => (
          <KPICard key={metric.label} label={metric.label} count={metric.count} />
        ))}
      </div>
    </div>
  );
};

export default RoleOffSummaryCard;
