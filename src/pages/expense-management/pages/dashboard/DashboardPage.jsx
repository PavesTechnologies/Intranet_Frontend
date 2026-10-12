import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BadgeCheck,
  Clock3,
  Hourglass,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  TrendingUp,
  Users,
  Wallet,
  ClipboardCheck,
  MessageSquareWarning,
  CalendarCheck,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/Cards/StatCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardService } from "@/pages/expense-management/api/expenseReportsApi";
import { formatKpiValue } from "@/pages/expense-management/components/dashboard/dashboardTheme";
import TaxDashboardSection from "@/pages/expense-management/components/dashboard/TaxDashboardSection";
import {
  ChartCard,
  TrendChart,
  Pipeline,
  Breakdown,
  Ranking,
  Aging,
  Budgets,
  ItemList,
} from "@/pages/expense-management/components/dashboard/DashboardWidgets";

const VIEW_STORAGE_KEY = "xms.dashboard.view";

/**
 * One entry per role dashboard: who may see it, its tab label, the backend view it loads
 * (GET /xms/dashboard/{view}), how its charts read, and where its rows / actions link.
 */
const VIEWS = [
  {
    view: "employee",
    label: "My expenses",
    roles: ["GENERAL", "MANAGER", "REPORTING_MANAGER", "FINANCE", "FINANCE_EXECUTIVE", "AP_EXECUTIVE", "ADMIN", "SUPER_ADMIN"],
    subtitle: "Where your expense reports are, what needs fixing, and what you've been reimbursed.",
    trend: { mode: "money", primaryLabel: "Spend", countLabel: "Expenses" },
    attentionTitle: "Needs your attention",
    attentionEmpty: "You're all caught up.",
    activityTitle: "Recent activity",
    link: (it) => `/expense-management/expenses/reports/${it.reportId}`,
    actions: [
      { label: "New expense", to: "/expense-management/expenses/create", icon: Plus, variant: "primary" },
      { label: "My expenses", to: "/expense-management/expenses/my", variant: "outline" },
    ],
  },
  {
    view: "manager",
    label: "Approvals",
    // Reporting managers approve their reports' expenses, so they get this view next to My expenses.
    roles: ["MANAGER", "REPORTING_MANAGER"],
    subtitle: "Reports waiting for your decision, how long they've waited, and your recent decisions.",
    trend: { mode: "decisions" },
    agingNoun: "approvals",
    attentionTitle: "Oldest waiting for you",
    attentionEmpty: "No approvals waiting.",
    link: () => "/expense-management/approvals",
    showEmployee: true,
    actions: [{ label: "Open approvals", to: "/expense-management/approvals", icon: ClipboardCheck, variant: "primary" }],
  },
  {
    view: "finance",
    label: "Finance",
    roles: ["FINANCE_EXECUTIVE", "FINANCE"],
    subtitle: "The verification queue, open queries, throughput, and where verified reports are now.",
    trend: { mode: "money", primaryLabel: "Verified", countLabel: "Line items" },
    agingNoun: "reports",
    attentionTitle: "Longest in the queue",
    attentionEmpty: "The queue is empty.",
    activityTitle: "Latest verifications",
    link: () => "/expense-management/finance",
    showEmployee: true,
    actions: [{ label: "Open Finance", to: "/expense-management/finance", icon: ClipboardCheck, variant: "primary" }],
  },
  {
    view: "ap",
    label: "AP Payments",
    roles: ["AP_EXECUTIVE"],
    subtitle: "What's owed to employees, how long it's been waiting, and payments going out.",
    trend: { mode: "money", primaryLabel: "Paid", countLabel: "Reports" },
    agingNoun: "payments",
    attentionTitle: "Waiting longest for payment",
    attentionEmpty: "Nothing waiting to be paid.",
    activityTitle: "Recent payments",
    link: () => "/expense-management/ap-payments/queue",
    showEmployee: true,
    actions: [{ label: "Open AP Payments", to: "/expense-management/ap-payments/queue", icon: Wallet, variant: "primary" }],
  },
  {
    view: "admin",
    label: "Organization",
    roles: ["ADMIN", "SUPER_ADMIN"],
    subtitle: "Organization-wide spend, workflow status, budgets and policy compliance.",
    trend: { mode: "money", primaryLabel: "Spend", countLabel: "Expenses" },
    activityTitle: "Latest submissions",
    showEmployee: true,
    actions: [{ label: "Masters", to: "/expense-management/masters/expense-categories", variant: "outline" }],
  },
];

// KPI key -> icon (keys come from DashboardServiceImpl).
const KPI_ICONS = {
  claimed: TrendingUp, inProgress: Clock3, needsAction: AlertTriangle, awaiting: Hourglass, reimbursed: BadgeCheck,
  pending: ClipboardCheck, pendingValue: Wallet, overdue: AlertTriangle, approved30: BadgeCheck, sentBack30: MessageSquareWarning,
  toVerify: ClipboardCheck, queueValue: Wallet, queries: MessageSquareWarning, verified: BadgeCheck, exceptions: ShieldAlert,
  toPay: Wallet, toPayValue: Wallet, paidMonth: CalendarCheck, avgDays: Clock3, failed: AlertTriangle,
  spendMonth: TrendingUp, submitted: Send, claimants: Users, cycle: Clock3, violations: ShieldAlert,
};
const TONE_TEXT = {
  indigo: "text-indigo-700", blue: "text-blue-700", emerald: "text-emerald-700",
  amber: "text-amber-700", rose: "text-rose-700", gray: "text-slate-800",
};

const useDashboard = (view) =>
  useQuery({
    queryKey: ["xmsDashboard", view],
    queryFn: () => dashboardService.get(view).then((res) => res.data?.data),
    enabled: !!view,
    staleTime: 60_000,
  });

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  const available = useMemo(() => VIEWS.filter((v) => hasRole(v.roles)), [hasRole]);
  // Default to the user's most workflow-specific dashboard; remember their last choice.
  const defaultView = useMemo(() => {
    const priority = ["ap", "finance", "manager", "admin", "employee"];
    return priority.find((p) => available.some((v) => v.view === p)) || "employee";
  }, [available]);
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem(VIEW_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });
  const active = available.find((v) => v.view === view) || available.find((v) => v.view === defaultView) || VIEWS[0];
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, active.view);
    } catch {
      /* private mode etc. - the choice just isn't remembered */
    }
  }, [active.view]);

  const { data, isLoading, isError, error, refetch, isFetching } = useDashboard(active.view);
  const currency = data?.baseCurrencyCode || "INR";
  const firstName = (user?.name || user?.employee_name || "").split(" ")[0];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={[{ label: "Expense Management", to: "/expense-management/dashboard" }, { label: "Dashboard" }]} />

      <PageHeader
        title={firstName ? `Hi ${firstName}, here's your ${active.label.toLowerCase()} overview` : "Dashboard"}
        subtitle={active.subtitle}
        actions={
          <>
            <Button variant="outline" size="small" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw size={14} className={`mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
            {active.actions.map((a) => (
              <Button key={a.label} variant={a.variant} size="small" onClick={() => navigate(a.to)}>
                {a.icon && <a.icon size={14} className="mr-1" />} {a.label}
              </Button>
            ))}
          </>
        }
      />

      {available.length > 1 && (
        <Tabs value={active.view} onValueChange={setView}>
          <TabsList className="h-auto flex-wrap">
            {available.map((v) => (
              <TabsTrigger key={v.view} value={v.view}>
                {v.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-24">
          <LoadingSpinner text="Loading dashboard…" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-12 text-center">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          <p className="text-sm font-semibold text-rose-700">Couldn't load this dashboard.</p>
          <p className="max-w-md text-xs text-rose-500">{error?.response?.data?.message || error?.message}</p>
          <Button size="small" variant="outline" className="mt-2" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : data ? (
        <DashboardBody data={data} config={active} currency={currency} />
      ) : null}
    </div>
  );
}

function DashboardBody({ data, config, currency }) {
  const hasPipeline = data.pipeline?.length > 0;
  const side = data.breakdown?.length
    ? { title: data.breakdownTitle, node: <Breakdown slices={data.breakdown} currency={currency} /> }
    : data.aging?.length
    ? { title: "How long items have waited", node: <Aging buckets={data.aging} noun={config.agingNoun} /> }
    : null;
  const showAgingBelow = data.breakdown?.length && data.aging?.length;

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {data.kpis.map((k) => (
          <StatCard
            key={k.key}
            title={k.label}
            value={formatKpiValue(k, currency)}
            subtitle={k.hint}
            icon={KPI_ICONS[k.key]}
            textColor={TONE_TEXT[k.tone] || TONE_TEXT.gray}
          />
        ))}
      </div>

      {/* Trend + side panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title={data.trendTitle} subtitle={`Amounts in ${currency}`} className={side ? "lg:col-span-2" : "lg:col-span-3"}>
          <TrendChart points={data.trend} currency={currency} {...config.trend} />
        </ChartCard>
        {side && <ChartCard title={side.title}>{side.node}</ChartCard>}
      </div>

      {/* Tax (Finance and admin views only) */}
      {data.tax && <TaxDashboardSection tax={data.tax} currency={currency} />}

      {hasPipeline && (
        <ChartCard title="Workflow pipeline" subtitle="Where reports are right now">
          <Pipeline stages={data.pipeline} />
        </ChartCard>
      )}

      {/* Ranking / aging / budgets */}
      {(data.ranking?.length > 0 || showAgingBelow || data.budgets?.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.ranking?.length > 0 && (
            <ChartCard title={data.rankingTitle} subtitle={`Amounts in ${currency}`}>
              <Ranking slices={data.ranking} currency={currency} />
            </ChartCard>
          )}
          {showAgingBelow && (
            <ChartCard title="How long items have waited">
              <Aging buckets={data.aging} noun={config.agingNoun} />
            </ChartCard>
          )}
          {data.budgets?.length > 0 && (
            <ChartCard title="Budget utilization" subtitle={`Cost centers, FY ${data.budgets[0].fiscalYear}`}>
              <Budgets budgets={data.budgets} currency={currency} />
            </ChartCard>
          )}
        </div>
      )}

      {/* Attention + activity */}
      {(config.attentionTitle || config.activityTitle) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {config.attentionTitle && (
            <ChartCard title={config.attentionTitle} className={config.activityTitle ? "" : "lg:col-span-2"}>
              <ItemList items={data.attention} currency={currency} linkFor={config.link} showEmployee={config.showEmployee} empty={config.attentionEmpty} />
            </ChartCard>
          )}
          {config.activityTitle && (
            <ChartCard title={config.activityTitle} className={config.attentionTitle ? "" : "lg:col-span-2"}>
              <ItemList items={data.activity} currency={currency} linkFor={config.link} showEmployee={config.showEmployee} timeline empty="No recent activity." />
            </ChartCard>
          )}
        </div>
      )}
    </>
  );
}
