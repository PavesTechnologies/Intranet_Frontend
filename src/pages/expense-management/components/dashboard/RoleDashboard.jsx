import React from "react";
import { Building2, Gauge, Users, Wallet, TrendingUp, Inbox, PieChart } from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import CategoryDonut from "@/components/ui/CategoryDonut";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";
import { formatKpiValue } from "./dashboardTheme";
import { ItemList } from "./DashboardWidgets";
import QuickActions from "./QuickActions";

// Dashboard body for the manager, finance, AP and admin views. It shows only what that role acts on: its quick actions,
// its headline figures, the items waiting for it, and its recent activity. Admin also sees budgets and a category breakdown.
// Every figure comes from the role's dashboard response; nothing is computed here beyond laying it out.

// Each tone has a soft tile colour for the icon and a matching accent stripe for the number card.
const TONE = {
  indigo: { tile: "bg-[#0A0082]/10 text-[#0A0082]", stripe: "from-[#0A0082] to-[#263383]" },
  blue: { tile: "bg-[#263383]/10 text-[#263383]", stripe: "from-[#263383] to-[#4f63c9]" },
  emerald: { tile: "bg-emerald-500/10 text-emerald-700", stripe: "from-emerald-500 to-teal-400" },
  amber: { tile: "bg-amber-400/15 text-amber-700", stripe: "from-amber-400 to-orange-300" },
  rose: { tile: "bg-[#ff3d72]/10 text-[#ff3d72]", stripe: "from-[#ff3d72] to-[#ff7aa0]" },
  gray: { tile: "bg-slate-100 text-slate-600", stripe: "from-slate-400 to-slate-300" },
};

const ICON_FOR = {
  pending: Inbox,
  pendingValue: Wallet,
  approved30: TrendingUp,
  sentBack30: Gauge,
  toVerify: Inbox,
  queueValue: Wallet,
  queries: Users,
  verified: TrendingUp,
  toPay: Inbox,
  toPayValue: Wallet,
  paidMonth: TrendingUp,
  failed: Gauge,
  spendMonth: Wallet,
  submitted: Inbox,
  claimants: Users,
  violations: Gauge,
};

function KpiTile({ step, kpi, currency }) {
  const t = TONE[step.tone] || TONE.gray;
  const Icon = ICON_FOR[step.key] || Inbox;
  return (
    <div
      data-kpi={step.key}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{step.label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.tile}`}>
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-[#0a174e]">{kpi ? formatKpiValue(kpi, currency) : "-"}</p>
      <p className="mt-1 text-xs text-slate-500">{step.help}</p>
      {kpi?.hint && <p className="mt-auto pt-2 text-[11px] font-medium text-slate-400">{kpi.hint}</p>}
      <span aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${t.stripe}`} />
    </div>
  );
}

function BudgetsCard({ budgets, currency }) {
  if (!budgets?.length) {
    return (
      <SectionCard title="Budget use" subtitle="Cost centres for the current fiscal year" icon={Building2} tone="teal" className="lg:col-span-2">
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Building2 className="h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-600">No budgets set up yet</p>
          <p className="text-xs text-slate-400">Budgets you add to cost centres will show here.</p>
        </div>
      </SectionCard>
    );
  }
  return (
    <SectionCard title="Budget use" subtitle="Cost centres for the current fiscal year, highest use first" icon={Building2} tone="teal" className="lg:col-span-2">
      <ul className="space-y-5" data-budgets>
        {budgets.map((b) => {
          const budget = Number(b.budgetAmount) || 0;
          const used = Number(b.usedAmount) || 0;
          const pct = budget > 0 ? (used / budget) * 100 : 0;
          const threshold = Number(b.warningThreshold);
          const warn = threshold > 0 && (threshold <= 1 ? pct >= threshold * 100 : pct >= threshold);
          return (
            <li key={`${b.costCenterName}-${b.fiscalYear}`} data-budget={b.costCenterName}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-semibold text-[#0a174e]">{b.costCenterName}</span>
                <span className="whitespace-nowrap text-xs tabular-nums text-slate-500">
                  {formatMoney(used, currency)} <span className="text-slate-300">/</span> {formatMoney(budget, currency)}
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <div
                  className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${warn ? "from-[#ff3d72] to-[#ff7aa0]" : "from-[#0A0082] to-[#4f63c9]"}`}
                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                />
              </div>
              <p className={`mt-1.5 text-[11px] font-medium ${warn ? "text-[#ff3d72]" : "text-slate-400"}`}>
                {Math.round(pct)}% used{warn ? " · above warning level" : ""}
              </p>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

export default function RoleDashboard({ data, config, currency }) {
  const byKey = Object.fromEntries((data.kpis || []).map((k) => [k.key, k]));
  const hasAttention = !!config.attentionTitle;
  const hasActivity = !!config.activityTitle;

  return (
    <>
      <QuickActions actions={config.quickActions} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {config.steps.map((step) => (
          <KpiTile key={step.key} step={step} kpi={byKey[step.key]} currency={currency} />
        ))}
      </div>

      {(hasAttention || hasActivity) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {hasAttention && (
            <SectionCard title={config.attentionTitle} subtitle={config.attentionSubtitle} icon={Inbox} tone="amber" className={hasActivity ? "lg:col-span-3" : "lg:col-span-5"}>
              <ItemList items={data.attention} currency={currency} linkFor={config.link} showEmployee={config.showEmployee} empty={config.attentionEmpty} />
            </SectionCard>
          )}
          {hasActivity && (
            <SectionCard title={config.activityTitle} subtitle={config.activitySubtitle} icon={TrendingUp} tone="teal" className={hasAttention ? "lg:col-span-2" : "lg:col-span-5"}>
              <ItemList items={data.activity} currency={currency} linkFor={config.link} showEmployee={config.showEmployee} timeline empty="No recent activity yet." />
            </SectionCard>
          )}
        </div>
      )}

      {config.showBudgets && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <BudgetsCard budgets={data.budgets} currency={currency} />
          {config.showBreakdown && (
            <SectionCard title={data.breakdownTitle || "Top categories"} subtitle={`Claimed amounts, ${currency}`} icon={PieChart} tone="pink" className="lg:col-span-3">
              <CategoryDonut slices={data.breakdown} currency={currency} claimed={null} period="Last 12 months" />
            </SectionCard>
          )}
        </div>
      )}
    </>
  );
}
