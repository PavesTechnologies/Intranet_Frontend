import React from "react";
import { FolderKanban, Play, CheckCircle2, Clock } from "lucide-react";
import { KPICard } from "../../../../components/kpi/KPI";
import { getAcquisitionKpis } from "../../services/billingDataAcquisitionService";

export default function AcquisitionMetrics({
  configs = [],
  loading = false,
  selectedStatusFilter = "ALL",
  onSelectStatusFilter,
}) {
  const kpiData = getAcquisitionKpis(configs);

  const kpis = [
    {
      key: "ALL",
      label: "Total Setups",
      value: kpiData.totalSetups,
      icon: FolderKanban,
      color: "bg-slate-500 text-white",
      tooltip: "Total active billing setup records participating in acquisition",
    },
    {
      key: "NOT_ACQUIRED",
      label: "Not Acquired",
      value: kpiData.notAcquired,
      icon: Play,
      color: "bg-slate-600 text-white",
      tooltip: "Active setups where source snapshot acquisition has not been initiated",
    },
    {
      key: "NEEDS_APPROVAL",
      label: "Needs Approval",
      value: kpiData.needsApproval,
      icon: Clock,
      color: "bg-amber-500 text-white",
      tooltip: "Projects with pending or partially approved timesheets blocking billing readiness",
    },
    {
      key: "READY",
      label: "Ready",
      value: kpiData.ready,
      icon: CheckCircle2,
      color: "bg-emerald-600 text-white",
      tooltip: "Projects with 100% required timesheet approval ready for tax calculation",
    },
  ];

  const handleCardClick = (kpiKey) => {
    if (!onSelectStatusFilter) return;
    if (kpiKey === "ALL") {
      onSelectStatusFilter("ALL");
    } else {
      // Toggle logic: clicking active KPI card returns filter to ALL
      onSelectStatusFilter(selectedStatusFilter === kpiKey ? "ALL" : kpiKey);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const isActive =
          selectedStatusFilter === kpi.key ||
          (selectedStatusFilter === "ALL" && kpi.key === "ALL");

        return (
          <div
            key={kpi.key}
            onClick={() => handleCardClick(kpi.key)}
            title={kpi.tooltip}
            className={`cursor-pointer transition-all duration-150 rounded-xl ${
              isActive
                ? "ring-2 ring-indigo-500 ring-offset-2 scale-[1.02] shadow-md"
                : "hover:border-slate-300 hover:shadow-sm opacity-90 hover:opacity-100"
            }`}
          >
            <KPICard
              label={kpi.label}
              value={loading ? "…" : kpi.value}
              icon={<kpi.icon className="h-5 w-5" />}
              color={kpi.color}
              className={`h-full w-full bg-white shadow-sm border ${
                isActive ? "border-indigo-400 bg-indigo-50/20" : "border-slate-200"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}
