import React from "react";
import {
  WarningIcon,
  DoubleCheckIcon,
  LayersIcon,
  UserMinusIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { KPICard } from "../../../components/kpi/KPI";

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
        {metrics.map((metric) => {
          const config = cardConfig[metric.label] || cardConfig["Active Allocations"];
          const Icon = config.icon;
          return (
            <KPICard
              key={metric.label}
              label={metric.label}
              value={metric.count}
              icon={<Icon className="h-5 w-5" />}
              color={config.colorClass}
            />
          );
        })}
      </div>
    </div>
  );
};

export default RoleOffSummaryCard;
