import React from "react";
import { Users, TrendingUp, ListOrdered, Award } from "lucide-react";
import { KPICard } from "../../../../components/kpi/KPI";

export default function CandidateStats({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <KPICard
        label="Total candidates"
        value={stats.total}
        icon={<Users className="h-5 w-5 text-blue-600" />}
        color="bg-blue-50 text-blue-700"
      />
      <KPICard
        label="Avg. overall score"
        value={stats.avgComposite}
        suffix="%"
        icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
        color="bg-purple-50 text-purple-700"
      />
      <KPICard
        label="Shortlisted"
        value={stats.shortlisted}
        icon={<ListOrdered className="h-5 w-5 text-sky-600" />}
        color="bg-sky-50 text-sky-700"
      />
      <KPICard
        label="Selected"
        value={stats.selected}
        icon={<Award className="h-5 w-5 text-emerald-600" />}
        color="bg-emerald-50 text-emerald-700"
      />
    </div>
  );
}
