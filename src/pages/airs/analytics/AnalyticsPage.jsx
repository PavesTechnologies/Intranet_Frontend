import React from "react";
import AnalyticsStats from "./components/AnalyticsStats";
import AnalyticsTimeToHireChart from "./components/AnalyticsTimeToHireChart";
import AnalyticsAtsDistributionChart from "./components/AnalyticsAtsDistributionChart";
import AnalyticsTopSkillsChart from "./components/AnalyticsTopSkillsChart";
import AnalyticsRecruiterProductivity from "./components/AnalyticsRecruiterProductivity";

export default function AnalyticsPage() {
  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Analytics</h1>
        <p className="text-xs text-slate-500 mt-1">
          Hiring performance, AI accuracy, and recruiter productivity across campaigns.
        </p>
      </div>

      <AnalyticsStats />

      <div className="grid md:grid-cols-2 gap-5">
        <AnalyticsTimeToHireChart />
        <AnalyticsAtsDistributionChart />
        <AnalyticsTopSkillsChart />
        <AnalyticsRecruiterProductivity />
      </div>
    </div>
  );
}
