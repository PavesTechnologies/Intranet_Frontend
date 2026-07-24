import React from "react";
import { Clock, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { KPICard } from "../../../../components/kpi/KPI";

export default function ResumeIntakeStats({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <KPICard
        label="Files in queue"
        value={stats.filesInQueue}
        icon={<Clock className="h-5 w-5 text-amber-600" />}
        color="bg-amber-50 text-amber-700"
      />
      <KPICard
        label="Parsed today"
        value={stats.parsedToday}
        icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        color="bg-emerald-50 text-emerald-700"
      />
      <KPICard
        label="Duplicates flagged"
        value={stats.duplicatesFlagged}
        icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
        color="bg-rose-50 text-rose-700"
      />
      <KPICard
        label="Failed uploads"
        value={stats.failedUploads}
        icon={<XCircle className="h-5 w-5 text-rose-600" />}
        color="bg-rose-50 text-rose-700"
      />
    </div>
  );
}
