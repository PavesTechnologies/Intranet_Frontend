import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban,
  FileText,
  Cable,
  PenLine,
  CheckCircle2,
  ArrowRight,
  History,
} from "lucide-react";

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

  // KPI filter
  const [activeKpi, setActiveKpi] = useState("total");

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

        showStatusToast(
          getApiErrorMessage(
            error,
            "Failed to load Account Receivable overview."
          ),
          "error"
        );

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
    {
      key: "total",
      label: "Total Configurations",
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
  ];

  const handleKpiClick = (key) => {
    // Total acts as the default/all filter.
    if (key === "total") {
      setActiveKpi("total");
      return;
    }

    // Clicking the active KPI again clears the filter.
    setActiveKpi((prev) => (prev === key ? "total" : key));
  };

  /*
   * Activity filtering.
   *
   * The activity API may return different action/status field names,
   * so the filter checks the available activity information safely.
   */
  const filteredActivity = useMemo(() => {
    if (activeKpi === "total") {
      return activity;
    }

    return activity.filter((item) => {
      const action = String(item.action || "").toLowerCase();
      const status = String(item.status || "").toLowerCase();
      const type = String(item.type || "").toLowerCase();

      const searchableText = `${action} ${status} ${type}`;

      switch (activeKpi) {
        case "active":
          return searchableText.includes("active") || searchableText.includes("activated");

        case "draft":
          return searchableText.includes("draft");

        case "integrated":
          return searchableText.includes("enterprise") || searchableText.includes("integrated");

        case "manual":
          return searchableText.includes("standalone") || searchableText.includes("manual");

        default:
          return true;
      }
    });
  }, [activity, activeKpi]);

  return (
    <div className="space-y-4">
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((kpi) => {
          const isActive = activeKpi === kpi.key;

          return (
            <button
              key={kpi.key}
              type="button"
              onClick={() => handleKpiClick(kpi.key)}
              title={`Filter by ${kpi.label}`}
              className="text-left rounded-xl border-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 active:ring-0 active:outline-none appearance-none"
              style={{ outline: "none", boxShadow: "none" }}
            >
              <KPICard
                label={kpi.label}
                value={loading ? "…" : kpi.value}
                icon={<kpi.icon className="h-5 w-5" />}
                color={kpi.color}
                active={isActive}
                className="h-full w-full cursor-pointer bg-white shadow-sm border border-slate-200 transition-all hover:shadow-md !outline-none !ring-0 !ring-offset-0 focus:!outline-none focus:!ring-0 focus:!ring-offset-0 focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 active:!ring-0 active:!outline-none"
                style={{ outline: "none", boxShadow: "none" }}
              />
            </button>
          );
        })}
      </div>

      {/* Recent Activity */}
      <PageCard>
        <PageCardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Recent Activity
            </h2>

            <Button
              variant="link"
              size="small"
              onClick={() => navigate(OVERVIEW_PATH)}
              className="gap-1"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Loading recent activity…
            </div>
          ) : filteredActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <History className="h-5 w-5 text-slate-400" />
              </div>

              <p className="text-sm font-medium text-slate-500">
                No activity found for this filter.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredActivity.map((item, index) => (
                <li
                  key={`${item.configId}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                >
                  <div>
                    <span className="text-slate-600">
                      {item.action}
                    </span>
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