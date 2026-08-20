import { FolderKanban, Play, CheckCircle2, FileCheck, Clock } from "lucide-react";
import { KPICard } from "../../../../components/kpi/KPI";

export default function AcquisitionMetrics({ configs = [], loading = false }) {
  const activeCount = configs.length;
  const readyToAcquire = configs.filter(
    (c) => c.billingStatus === "NOT_ACQUIRED" || c.billingStatus === "Not Acquired"
  ).length;
  const snapshotsReady = configs.filter(
    (c) => c.billingStatus === "READY" || c.billingStatus === "Ready"
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
      icon: FolderKanban,
      color: "bg-slate-500 text-white",
    },
    {
      key: "readyAcquire",
      label: "Ready to Acquire",
      value: readyToAcquire,
      icon: Play,
      color: "bg-amber-500 text-white",
    },
    {
      key: "snapshotsReady",
      label: "Snapshots Ready",
      value: snapshotsReady,
      icon: CheckCircle2,
      color: "bg-emerald-600 text-white",
    },
    {
      key: "billed",
      label: "Already Billed",
      value: alreadyBilled,
      icon: FileCheck,
      color: "bg-indigo-600 text-white",
    },
    {
      key: "auto",
      label: "Auto Cycles",
      value: autoCycles,
      icon: Clock,
      color: "bg-orange-500 text-white",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {kpis.map((kpi) => (
        <KPICard
          key={kpi.key}
          label={kpi.label}
          value={loading ? "…" : kpi.value}
          icon={<kpi.icon className="h-5 w-5" />}
          color={kpi.color}
          className="h-full w-full bg-white shadow-sm"
        />
      ))}
    </div>
  );
}
