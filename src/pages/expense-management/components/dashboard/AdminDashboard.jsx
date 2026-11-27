import React from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  BarChart3,
  Building2,
  FilePen,
  FileText,
  Gauge,
  Landmark,
  PieChart,
  ShieldAlert,
  ShieldCheck,
  Timer,
  TrendingUp,
  UserCheck,
  Workflow,
} from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import { Breakdown, Budgets, ItemList, Ranking, TrendChart } from "./DashboardWidgets";
import { formatMoney } from "./dashboardTheme";
import { DashboardHero, FigureCard, HeroButton, StageFlow, TrendTotals } from "./DashboardHero";

// Organization view for Admins: this month's spend in the banner (with the quick actions), where every report is,
// how spend moves month to month and by category, budgets, the status mix, and the latest submissions.
// Every figure is the backend's admin-view response, shown once.

const ICONS = { cycle: Timer, violations: ShieldAlert };

const STAGES = {
  draft: { icon: FilePen, help: "Not submitted yet", tone: "bg-slate-100 text-slate-600" },
  approval: { icon: UserCheck, help: "With the approver", tone: "bg-amber-400/15 text-amber-700" },
  finance: { icon: ShieldCheck, help: "Being verified by Finance", tone: "bg-violet-500/10 text-violet-700" },
  ap: { icon: Landmark, help: "Approved, waiting for payment", tone: "bg-[#263383]/10 text-[#263383]" },
  paid: { icon: BadgeCheck, help: "Payment completed", tone: "bg-emerald-500/10 text-emerald-700" },
};

export default function AdminDashboard({ data, config, currency }) {
  const navigate = useNavigate();
  const byKey = Object.fromEntries((data.kpis || []).map((k) => [k.key, k]));
  const submitted = Number(byKey.submitted?.value) || 0;
  const claimants = Number(byKey.claimants?.value) || 0;

  const trend = data.trend || [];
  const yearSpend = trend.reduce((s, p) => s + (Number(p.primary) || 0), 0);
  const activeMonths = trend.filter((p) => Number(p.primary) > 0).length;
  const peak = trend.reduce((best, p) => (Number(p.primary) > Number(best?.primary || 0) ? p : best), null);

  return (
    <div className="space-y-4" data-admin-dashboard>
      <DashboardHero
        eyebrow="Organization · this month"
        icon={Building2}
        headline={
          <>
            <span data-kpi="spendMonth">{formatMoney(byKey.spendMonth?.value, currency)}</span> spent this month
          </>
        }
        detail={
          <span data-kpi="submitted">
            {submitted} report{submitted === 1 ? "" : "s"} submitted by <span data-kpi="claimants">{claimants}</span> employee{claimants === 1 ? "" : "s"}.
          </span>
        }
        aside={<HeroButton icon={FileText} onClick={() => navigate("/expense-management/reports")}>All expense reports</HeroButton>}
        quickActions={config.quickActions}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <SectionCard title="Where reports are now" subtitle="Every report in the organization, by step" icon={Workflow} tone="navy" className="lg:col-span-3">
          <StageFlow stages={data.pipeline} meta={STAGES} />
        </SectionCard>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {config.steps.map((step) => (
            <FigureCard key={step.key} step={step} kpi={byKey[step.key]} icon={ICONS[step.key] || Gauge} currency={currency} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <SectionCard title={data.trendTitle || "Monthly spend"} subtitle={`Submitted expenses, ${currency}`} icon={BarChart3} tone="teal" className="lg:col-span-3">
          <TrendTotals
            cells={[
              { label: "Last 12 months", value: formatMoney(yearSpend, currency) },
              { label: "Monthly average", value: activeMonths > 0 ? formatMoney(yearSpend / trend.length, currency) : "—" },
              { label: "Busiest month", value: peak ? peak.label : "—" },
            ]}
          />
          <TrendChart points={trend} currency={currency} countLabel="Expense lines" primaryLabel="Spend" />
        </SectionCard>
        <SectionCard title={data.rankingTitle || "Top categories"} subtitle="Where the money goes" icon={PieChart} tone="pink" className="lg:col-span-2">
          <Ranking slices={data.ranking} currency={currency} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <SectionCard title="Budget use" subtitle="Cost centres for the current fiscal year" icon={Building2} tone="teal" className="lg:col-span-3" data-budgets>
          <Budgets budgets={data.budgets} currency={currency} />
        </SectionCard>
        <SectionCard title={data.breakdownTitle || "Reports by status"} subtitle="All reports, by where they are" icon={Gauge} tone="amber" className="lg:col-span-2">
          <Breakdown slices={data.breakdown || []} currency={currency} />
        </SectionCard>
      </div>

      <SectionCard title={config.activityTitle} subtitle={config.activitySubtitle} icon={TrendingUp} tone="teal">
        <ItemList items={data.activity} currency={currency} linkFor={config.link} showEmployee={config.showEmployee} timeline empty="No reports submitted yet." />
      </SectionCard>
    </div>
  );
}
