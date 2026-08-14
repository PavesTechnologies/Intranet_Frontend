import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderKanban, FileText, Cable, PenLine, CheckCircle2, ArrowRight } from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import { KPICard } from "../../../components/kpi/KPI";
import Button from "../../../components/Button/Button";
import { showStatusToast } from "../../../components/toastfy/toast";
import {
  getBillingConfigurationStats,
  getBillingConfigurationActivity,
  getApiErrorMessage,
} from "../services/billingConfigService";

const OVERVIEW_PATH = "/account-receivable/project-billing-setup/overview";
const WORKSPACE_PATH = "/account-receivable/project-billing-setup/workspace";

export default function AccountReceivableDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [statsResult, activityResult] = await Promise.all([
          getBillingConfigurationStats(),
          getBillingConfigurationActivity(),
        ]);
        if (!isMounted) return;
        setStats(statsResult);
        setActivity(activityResult);
      } catch (error) {
        if (!isMounted) return;
        showStatusToast(getApiErrorMessage(error, "Failed to load Account Receivable overview."), "error");
        setStats(null);
        setActivity([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const kpiCards = [
    { key: "total", label: "Total Configurations", value: stats?.total ?? "—", icon: FolderKanban, color: "bg-slate-500 text-white" },
    { key: "active", label: "Active Projects", value: stats?.active ?? "—", icon: CheckCircle2, color: "bg-emerald-600 text-white" },
    { key: "draft", label: "Draft Configurations", value: stats?.draft ?? "—", icon: FileText, color: "bg-amber-500 text-white" },
    { key: "integrated", label: "Enterprise Projects", value: stats?.integrated ?? "—", icon: Cable, color: "bg-indigo-600 text-white" },
    { key: "manual", label: "Standalone Projects", value: stats?.manual ?? "—", icon: PenLine, color: "bg-orange-500 text-white" },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title="Accounts Receivable Hub"
        subtitle="End-to-end Invoice Generation, Dynamic Tax calculations, Approvals, and Outstanding Payment tracking."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(OVERVIEW_PATH)}>
              View Billing Setups
            </Button>
            <Button variant="primary" onClick={() => navigate(WORKSPACE_PATH)}>
              + Create Billing Setup
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
        <PageCardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
            <button
              type="button"
              onClick={() => navigate(OVERVIEW_PATH)}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="py-6 text-center text-sm text-slate-500">Loading recent activity…</div>
          ) : activity.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">No recent activity yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activity.map((item, index) => (
                <li
                  key={`${item.configId}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <div>
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
