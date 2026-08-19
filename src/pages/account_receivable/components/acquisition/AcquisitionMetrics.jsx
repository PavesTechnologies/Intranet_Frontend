import { FolderKanban, Play, CheckCircle2, FileCheck, Clock } from "lucide-react";
import { KPICard } from "../../../../components/kpi/KPI";

export default function AcquisitionMetrics({ configs = [] }) {
  const activeCount = configs.length;
  const readyToAcquire = configs.filter(
    (c) => c.billingStatus === "NOT_ACQUIRED" || c.billingStatus === "Not Acquired"
  ).length;
  const snapshotsReady = configs.filter(
    (c) => c.billingStatus === "READY" || c.billingStatus === "Ready" || Boolean(c.snapshotNumber)
  ).length;
  const alreadyBilled = configs.filter(
    (c) => c.billingStatus === "ALREADY_BILLED" || c.billingStatus === "Already Billed"
  ).length;
  const autoCycles = configs.filter((c) => c.invoiceGeneration === "AUTOMATIC").length;

  const kpis = [
    {
      key: "active",
      label: "Active Setups",
      value: activeCount,
      helper: "Configured projects",
      icon: FolderKanban,
      color: "bg-slate-500 text-white",
    },
    {
      key: "readyAcquire",
      label: "Ready to Acquire",
      value: readyToAcquire,
      helper: "Awaiting snapshot creation",
      icon: Play,
      color: "bg-amber-500 text-white",
    },
    {
      key: "snapshotsReady",
      label: "Snapshots Ready",
      value: snapshotsReady,
      helper: "Acquired for invoicing",
      icon: CheckCircle2,
      color: "bg-emerald-600 text-white",
    },
    {
      key: "billed",
      label: "Already Billed",
      value: alreadyBilled,
      helper: "Completed cycles",
      icon: FileCheck,
      color: "bg-indigo-600 text-white",
    },
    {
      key: "auto",
      label: "Auto Cycles",
      value: autoCycles,
      helper: "Scheduled generation",
      icon: Clock,
      color: "bg-orange-500 text-white",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
      {kpis.map((kpi) => (
        <div key={kpi.key} className="h-full">
          <KPICard
            label={kpi.label}
            value={kpi.value}
            icon={<kpi.icon className="h-5 w-5" />}
            color={kpi.color}
            className="h-full bg-white shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow duration-200"
          />
        </div>
      ))}
    </div>
  );
}
