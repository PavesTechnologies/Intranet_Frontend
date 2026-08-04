import React from "react";
import { Clock, Sparkles, Award, TrendingUp } from "lucide-react";
import { KPICard } from "../../../../components/kpi/KPI";
import { ANALYTICS_KPIS } from "../mock/analyticsMockData";

export default function AnalyticsStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <KPICard
        label="Avg. time to hire"
        value={ANALYTICS_KPIS.avgTimeToHire}
        icon={<Clock className="h-5 w-5 text-blue-600" />}
        color="bg-blue-50 text-blue-700"
      />
      <KPICard
        label="AI recommendation accuracy"
        value={ANALYTICS_KPIS.aiAccuracy}
        icon={<Sparkles className="h-5 w-5 text-purple-600" />}
        color="bg-purple-50 text-purple-700"
      />
      <KPICard
        label="Offer acceptance rate"
        value={ANALYTICS_KPIS.offerAcceptanceRate}
        icon={<Award className="h-5 w-5 text-emerald-600" />}
        color="bg-emerald-50 text-emerald-700"
      />
      <KPICard
        label="Cost per hire"
        value={ANALYTICS_KPIS.costPerHire}
        icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
        color="bg-amber-50 text-amber-700"
      />
    </div>
  );
}
