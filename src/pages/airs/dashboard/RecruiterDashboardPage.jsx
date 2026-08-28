import React from "react";
import DashboardStats from "./components/DashboardStats";
import HiringFunnelCard from "./components/HiringFunnelCard";
import TopCandidatesCard from "./components/TopCandidatesCard";
import ActiveCampaignsCard from "./components/ActiveCampaignsCard";
import TasksNotificationsCard from "./components/TasksNotificationsCard";

export default function RecruiterDashboardPage() {
  return (
    <div className="p-6 bg-slate-50/40 min-h-screen text-slate-800 font-sans">
      <div className="mb-4">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Hiring Dashboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          A snapshot of hiring activity across campaigns, candidates, and pending actions.
        </p>
      </div>

      <DashboardStats />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <HiringFunnelCard />
        </div>
        <div>
          <TopCandidatesCard />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActiveCampaignsCard />
        <TasksNotificationsCard />
      </div>
    </div>
  );
}
