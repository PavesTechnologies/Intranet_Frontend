import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, BarChart3, Building2, CheckCircle2, Clock, Inbox, Timer, Wallet } from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import { Aging, ItemList, Ranking, TrendChart } from "./DashboardWidgets";
import { formatMoney } from "./dashboardTheme";
import { DashboardHero, FigureCard, HeroButton, QueueTable, TrendTotals, daysSince } from "./DashboardHero";

// Accounts Payable: what is owed to employees and how payments are going. The banner holds what is waiting to be paid
// (count and amount, shown nowhere else) with the quick actions; the figures, queue, aging, cost centres and monthly
// payments follow. Every figure is the backend's AP-view response, shown once.

const ICONS = { paidMonth: CheckCircle2, avgDays: Timer, failed: AlertTriangle };
const QUEUE = "/expense-management/ap-payments/queue";

export default function ApDashboard({ data, config, currency }) {
  const navigate = useNavigate();
  const byKey = Object.fromEntries((data.kpis || []).map((k) => [k.key, k]));
  const toPay = Number(byKey.toPay?.value) || 0;
  const queue = data.attention || [];
  const oldest = queue.reduce((max, it) => Math.max(max, daysSince(it.at)), 0);

  const trend = data.trend || [];
  const paidTotal = trend.reduce((s, p) => s + (Number(p.primary) || 0), 0);
  const paidCount = trend.reduce((s, p) => s + (Number(p.count) || 0), 0);

  return (
    <div className="space-y-4" data-ap-dashboard>
      <DashboardHero
        eyebrow="Accounts Payable · today"
        icon={Wallet}
        headline={
          toPay > 0 ? (
            <>
              <span data-kpi="toPayValue">{formatMoney(byKey.toPayValue?.value, currency)}</span> owed to employees across {toPay} report{toPay === 1 ? "" : "s"}
            </>
          ) : (
            <>
              <span data-kpi="toPayValue">{formatMoney(byKey.toPayValue?.value, currency)}</span> owed: every approved claim is paid
            </>
          )
        }
        detail={
          toPay > 0
            ? `The oldest was approved ${oldest < 1 ? "today" : `${oldest} day${oldest === 1 ? "" : "s"} ago`}. Pay the oldest first.`
            : "New approved reports appear in the payment queue as soon as Finance verifies them."
        }
        aside={<HeroButton icon={Wallet} onClick={() => navigate(QUEUE)}>{toPay > 0 ? "Start paying" : "Open payment queue"}</HeroButton>}
        quickActions={config.quickActions}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {config.steps.map((step) => (
          <FigureCard key={step.key} step={step} kpi={byKey[step.key]} icon={ICONS[step.key]} currency={currency} />
        ))}
      </div>

      <SectionCard title={config.attentionTitle} subtitle={config.attentionSubtitle} icon={Inbox} tone="amber">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <QueueTable items={queue} currency={currency} to={QUEUE} actionLabel="Pay" waitLabel="Approved" emptyTitle={config.attentionEmpty} emptyText="Approved reports waiting for payment show up here." />
          </div>
          <div className="space-y-5 lg:col-span-2 lg:border-l lg:border-slate-100 lg:pl-5">
            <div>
              <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#0a174e]">
                <Clock size={15} className="text-amber-600" aria-hidden="true" /> How long since approval
              </h3>
              <Aging buckets={data.aging || []} noun="reports" />
            </div>
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0a174e]">
                <Building2 size={15} className="text-[#ff3d72]" aria-hidden="true" /> {data.rankingTitle || "To pay by cost center"}
              </h3>
              <Ranking slices={data.ranking} currency={currency} />
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <SectionCard title={data.trendTitle || "Paid per month"} subtitle="Amount paid to employees, by payment date" icon={BarChart3} tone="teal" className="lg:col-span-3">
          <TrendTotals
            cells={[
              { label: "Paid, 6 months", value: formatMoney(paidTotal, currency) },
              { label: "Reports paid", value: paidCount.toLocaleString("en-IN") },
              { label: "Average payment", value: paidCount > 0 ? formatMoney(paidTotal / paidCount, currency) : "—" },
            ]}
          />
          <TrendChart points={trend} currency={currency} countLabel="Reports paid" primaryLabel="Paid" />
        </SectionCard>
        <SectionCard title={config.activityTitle} subtitle={config.activitySubtitle} icon={CheckCircle2} tone="teal" className="lg:col-span-2">
          <ItemList items={data.activity} currency={currency} linkFor={config.link} showEmployee={config.showEmployee} timeline empty="No payments yet." />
        </SectionCard>
      </div>
    </div>
  );
}
