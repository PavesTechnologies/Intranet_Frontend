import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Info,
  Landmark,
  Lightbulb,
  Wallet,
} from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import EmployeeMoneyView from "./EmployeeMoneyView";
import { financeClaimService, unwrapList } from "@/pages/expense-management/api/supplementaryClaimApi";
import { financeWaitingSummary } from "@/pages/expense-management/pages/dashboard/SupplementaryWaitingCard";
import { HeroQuickActions } from "./DashboardHero";
import { ORDINAL_BLUE, STATUS, formatMoney } from "./dashboardTheme";

// The Finance desk: one page for everything a Finance user (Finance manager or executive) works on.
//   1. Banner      - what needs doing today, and the desk's quick actions.
//   2. Insights    - plain-language callouts worked out from the figures, most urgent first.
//   3. Money       - advances, expenses, tax & ITC by period, cost center, department and employee (EmployeeMoneyView).
// Every figure comes from the backend's finance-view response; what is worked out here is only arithmetic on it
// (shares, rates, month-over-month changes, how long items have waited).

const DAY = 86_400_000;
/** Target used to judge the queue: reports should be verified within this many days of reaching Finance. */
const SLA_DAYS = 3;

const n = (v) => Number(v) || 0;
const fmtInt = (v) => n(v).toLocaleString("en-IN");
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const plural = (count, word) => `${fmtInt(count)} ${word}${count === 1 ? "" : "s"}`;
const daysWaiting = (at) => (at ? Math.max(0, Math.floor((Date.now() - new Date(at).getTime()) / DAY)) : 0);
const waitText = (days) => (days < 1 ? "less than a day" : plural(days, "day"));

const AGING_STYLE = {
  lt1: { color: STATUS.good, label: "Under 1 day" },
  "1to3": { color: ORDINAL_BLUE[2], label: "1–3 days" },
  "4to7": { color: STATUS.warning, label: "4–7 days" },
  gt7: { color: STATUS.critical, label: "Over 7 days" },
};

// ---------------------------------------------------------------- derived figures

/** Everything the page works out from the response, in one place so each figure is computed once. */
function useDeskMetrics(data) {
  return useMemo(() => {
    const byKey = Object.fromEntries((data.kpis || []).map((k) => [k.key, k]));
    const num = (key) => n(byKey[key]?.value);
    const queue = data.attention || [];

    // Aging: prefer the backend's buckets (they cover the whole queue); fall back to the listed rows.
    let aging = (data.aging || []).map((b) => ({ ...b, count: n(b.count) }));
    if (!aging.some((b) => b.count > 0) && queue.length) {
      const c = { lt1: 0, "1to3": 0, "4to7": 0, gt7: 0 };
      queue.forEach((it) => {
        const d = daysWaiting(it.at);
        c[d < 1 ? "lt1" : d <= 3 ? "1to3" : d <= 7 ? "4to7" : "gt7"]++;
      });
      aging = Object.entries(c).map(([key, count]) => ({ key, label: AGING_STYLE[key].label, count }));
    }
    const agingCount = (key) => aging.find((b) => b.key === key)?.count || 0;
    const agingTotal = aging.reduce((s, b) => s + b.count, 0);
    const withinTarget = agingCount("lt1") + agingCount("1to3");
    const overdue = agingCount("gt7");
    const pastTarget = agingCount("4to7") + overdue;

    const trend = (data.trend || []).map((p) => {
      const lines = n(p.count);
      const queried = n(p.secondary);
      return { ...p, primary: n(p.primary), count: lines, secondary: queried, queryRate: lines + queried > 0 ? Math.round((queried / (lines + queried)) * 100) : null };
    });
    const thisMonth = trend[trend.length - 1];
    const lastMonth = trend[trend.length - 2];
    const change = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);

    const toVerify = num("toVerify");
    const queueValue = num("queueValue");

    return {
      byKey,
      num,
      queue,
      toVerify,
      queueValue,
      avgPerReport: toVerify > 0 ? queueValue / toVerify : 0,
      oldestDays: queue.reduce((max, it) => Math.max(max, daysWaiting(it.at)), 0),
      aging,
      agingTotal,
      withinTarget,
      pastTarget,
      overdue,
      onTimePct: agingTotal > 0 ? pct(withinTarget, agingTotal) : null,
      trend,
      thisMonth,
      lastMonth,
      valueChange: thisMonth && lastMonth ? change(thisMonth.primary, lastMonth.primary) : null,
      pipeline: data.pipeline || [],
      // This month's results, for the banner when the queue is empty (no dashes or zeros to read).
      verifiedThisMonth: num("verified"),
      verifiedValueThisMonth: thisMonth ? thisMonth.primary : 0,
      stageCount: (key) => n((data.pipeline || []).find((s) => s.key === key)?.count),
      ranking: data.ranking || [],
      tax: data.tax || null,
    };
  }, [data]);
}

/** Plain-language callouts, most urgent first. Each one says what is happening and what to do about it. */
function buildInsights(m, currency, supplementary) {
  const out = [];
  const stage = (key) => n(m.pipeline.find((s) => s.key === key)?.count);

  if (m.overdue > 0) {
    out.push({ level: "critical", title: `${plural(m.overdue, "report")} waiting over 7 days`, text: "Verify these first; employees are waiting on their reimbursement." });
  } else if (m.pastTarget > 0) {
    out.push({ level: "warning", title: `${plural(m.pastTarget, "report")} past the ${SLA_DAYS}-day target`, text: "Clear them before they cross a week in the queue." });
  } else if (m.toVerify > 0) {
    out.push({ level: "good", title: `Whole queue within the ${SLA_DAYS}-day target`, text: "Every report waiting for Finance arrived recently." });
  }

  const exceptions = m.num("exceptions");
  if (exceptions > 0 && m.toVerify > 0) {
    out.push({
      level: exceptions / m.toVerify >= 1 ? "warning" : "info",
      title: `${plural(exceptions, "policy exception")} across the queue`,
      text: `About ${(exceptions / m.toVerify).toFixed(1)} per report. Check flagged lines and justifications before verifying.`,
    });
  }

  if (supplementary?.count > 0) {
    const totals = Object.entries(supplementary.totals).map(([cur, amt]) => formatMoney(amt, cur)).join(" + ");
    out.push({
      level: "warning",
      title: `${plural(supplementary.count, "supplementary claim")} waiting for Finance`,
      text: `${totals} in all. Open approvals to decide on them.`,
    });
  }

  const queries = m.num("queries");
  if (queries > 0) {
    out.push({ level: "info", title: `${plural(queries, "report")} back with employees`, text: "They return to the queue once the employee answers your query." });
  }

  const totalRanked = m.ranking.reduce((s, r) => s + n(r.amount), 0);
  const top = m.ranking[0];
  if (top && totalRanked > 0 && m.ranking.length > 1) {
    const share = pct(n(top.amount), totalRanked);
    if (share >= 40) {
      out.push({ level: "info", title: `${top.label} is ${share}% of the queue value`, text: `${formatMoney(top.amount, currency)} across ${plural(n(top.count), "line")}. Worth reviewing as a batch.` });
    }
  }

  if (m.valueChange !== null && m.lastMonth) {
    const up = m.valueChange >= 0;
    out.push({
      level: up ? "good" : "info",
      title: `Verified value ${up ? "up" : "down"} ${Math.abs(m.valueChange)}% vs ${m.lastMonth.label}`,
      text: `${formatMoney(m.thisMonth.primary, currency)} verified so far this month.`,
    });
  }

  if (m.thisMonth?.queryRate != null && m.lastMonth?.queryRate != null && m.thisMonth.queryRate - m.lastMonth.queryRate >= 5) {
    out.push({ level: "warning", title: `Query rate rose to ${m.thisMonth.queryRate}%`, text: `From ${m.lastMonth.queryRate}% in ${m.lastMonth.label}. Look for a repeating cause, such as missing receipts.` });
  }

  const withAp = stage("withAp");
  if (withAp > 0) out.push({ level: "info", title: `${plural(withAp, "verified report")} waiting for AP`, text: "Verified by Finance; payment is with Accounts Payable." });

  const taxThisMonth = n(m.tax?.taxThisMonth);
  if (taxThisMonth > 0 && n(m.tax?.recoverableThisMonth) === 0) {
    out.push({
      level: "warning",
      title: `No GST recoverable this month: ${formatMoney(taxThisMonth, currency)} lost`,
      text: "ITC comes from the tax code's ITC %. Check the tax codes under Masters > Tax Configuration, and the GSTIN on the receipts.",
    });
  }

  const order = { critical: 0, warning: 1, info: 2, good: 3 };
  return out.sort((a, b) => order[a.level] - order[b.level]).slice(0, 4);
}

// ---------------------------------------------------------------- banner

/** The banner: what is waiting today in one line, and the desk's quick actions. */
function FinanceHero({ m, currency, quickActions }) {
  const busy = m.toVerify > 0;
  const headline = busy
    ? `${plural(m.toVerify, "report")} worth ${formatMoney(m.queueValue, currency)} waiting for verification`
    : "The verification queue is clear";
  const detail = busy
    ? `The oldest has been waiting ${waitText(m.oldestDays)}. Verify the oldest first to keep payments on time.`
    : "New reports appear here as soon as managers approve them.";

  return (
    <section
      data-finance-hero
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0082] via-[#18208f] to-[#2f3f9e] px-5 py-5 text-white shadow-[0_18px_40px_-24px_rgba(10,0,130,0.7)] sm:px-6"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/[0.06]" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-56 h-56 w-56 rounded-full bg-[#ff3d72]/[0.14] blur-2xl" />

      <div className="relative">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Landmark size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
              Finance desk · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
            </p>
            <h2 data-finance-headline className="mt-1 text-lg font-bold leading-snug tracking-tight sm:text-xl">
              {headline}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-white/70">{detail}</p>
          </div>
        </div>
      </div>

      <HeroQuickActions actions={quickActions} />
    </section>
  );
}

// ---------------------------------------------------------------- figures

// ---------------------------------------------------------------- insights

const INSIGHT_STYLE = {
  critical: { icon: AlertOctagon, box: "border-rose-200 bg-rose-50/70", tile: "bg-rose-100 text-rose-600", tag: "Urgent" },
  warning: { icon: AlertTriangle, box: "border-amber-200 bg-amber-50/70", tile: "bg-amber-100 text-amber-700", tag: "Attention" },
  info: { icon: Info, box: "border-sky-100 bg-sky-50/60", tile: "bg-sky-100 text-sky-700", tag: "Note" },
  good: { icon: CheckCircle2, box: "border-emerald-200 bg-emerald-50/60", tile: "bg-emerald-100 text-emerald-700", tag: "Good" },
};

function Insights({ items }) {
  if (!items.length) return null;
  return (
    <section data-finance-insights aria-label="Desk insights">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#0a174e]">
        <Lightbulb size={15} className="text-amber-500" aria-hidden="true" /> Desk insights
        <span className="text-xs font-normal text-slate-500">Worked out from today's figures, most urgent first</span>
      </h2>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((it) => {
          const s = INSIGHT_STYLE[it.level];
          const Icon = s.icon;
          return (
            <li key={it.title} data-insight={it.level} className={`flex gap-3 rounded-2xl border p-3.5 ${s.box}`}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.tile}`}>
                <Icon size={15} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{s.tag}</p>
                <p className="text-sm font-semibold leading-snug text-[#0a174e]">{it.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-slate-600">{it.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- lists

// ---------------------------------------------------------------- page body

export default function FinanceDashboard({ data, config, currency }) {
  const m = useDeskMetrics(data);
  const { data: supplementary } = useQuery({
    queryKey: ["xmsFinanceSupplementaryWaiting"],
    queryFn: () => financeClaimService.queue().then((res) => financeWaitingSummary(unwrapList(res))),
    staleTime: 60_000,
    retry: false,
  });
  const insights = useMemo(() => buildInsights(m, currency, supplementary), [m, currency, supplementary]);
  const quickActions = config.quickActions || [];
  return (
    <div className="space-y-4" data-finance-dashboard>
      <FinanceHero m={m} currency={currency} quickActions={quickActions} />

      <Insights items={insights} />

      {/* Advances and expenses by period, cost center, department and employee (EmployeeMoneyView). */}
      <SectionCard
        title="Money flow"
        subtitle="Cash advances, expenses and tax over time, by cost center, department and employee"
        icon={Wallet}
        tone="navy"
      >
        <EmployeeMoneyView />
      </SectionCard>

    </div>
  );
}
