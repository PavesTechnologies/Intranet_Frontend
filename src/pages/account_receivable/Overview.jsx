import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban,
  FileText,
  Cable,
  PenLine,
  Wrench,
  CheckCircle2,
} from "lucide-react";

import PageHeader from "../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../components/Cards/PageCard";
import { KPICard } from "../../components/kpi/KPI";
import Button from "../../components/Button/Button";
import { fetchOverviewStats, fetchRecentActivity } from "./services/billingConfigService";

export default function Overview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.all([fetchOverviewStats(), fetchRecentActivity()]).then(([statsResult, activityResult]) => {
      if (!isMounted) return;
      setStats(statsResult);
      setActivity(activityResult);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const kpiCards = [
    {
      key: "total",
      label: "Total Billing Configurations",
      value: stats?.total ?? "—",
      icon: FolderKanban,
      color: "bg-slate-500 text-white",
    },
    {
      key: "active",
      label: "Active Projects",
      value: stats?.active ?? "—",
      icon: CheckCircle2,
      color: "bg-emerald-600 text-white",
    },
    {
      key: "draft",
      label: "Draft Configurations",
      value: stats?.draft ?? "—",
      icon: FileText,
      color: "bg-amber-500 text-white",
    },
    {
      key: "integrated",
      label: "Enterprise Projects",
      value: stats?.integrated ?? "—",
      icon: Cable,
      color: "bg-indigo-600 text-white",
    },
    {
      key: "manual",
      label: "Standalone Projects",
      value: stats?.manual ?? "—",
      icon: PenLine,
      color: "bg-orange-500 text-white",
    },
    {
      key: "toolBillingEnabled",
      label: "Tool Billing Enabled Projects",
      value: stats?.toolBillingEnabled ?? "—",
      icon: Wrench,
      color: "bg-sky-600 text-white",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Project Billing Setup — Overview"
        subtitle="A snapshot of billing configuration coverage across enterprise and standalone projects."
        actions={
          <Button
            variant="primary"
            onClick={() => navigate("/account-receivable/project-billing-setup/configurations/new")}
          >
            + Create Billing Setup
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpiCards.map((kpi) => (
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

      <PageCard>
        <PageCardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent Activity</h2>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading recent activity…</div>
          ) : activity.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No recent activity yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activity.map((item, index) => (
                <li
                  key={`${item.configId}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <div>
                    <span className="font-medium text-slate-900">{item.configId}</span>
                    <span className="mx-2 text-slate-300">•</span>
                    <span className="text-slate-600">{item.action}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {item.user} · {item.time}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PageCardContent>
      </PageCard>
    </div>
  );
}
