import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Gauge,
  Hourglass,
  Inbox,
  Info,
  Landmark,
  Lightbulb,
  MessageCircleQuestion,
  PieChart,
  Receipt,
  ReceiptText,
  ShieldAlert,
  Sparkles,
  Timer,
  Wallet,
  Workflow,
} from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import EmployeeLabel from "@/pages/expense-management/approval-engine/components/EmployeeLabel";
import ApprovalsPage from "@/pages/expense-management/approval-engine/pages/ApprovalsPage";
import { useMyQueue } from "@/pages/expense-management/approval-engine/hooks/useApprovalWorkflow";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { HeroQuickActions } from "./DashboardHero";
import { ACCENT, CHROME, ORDINAL_BLUE, SERIES, STATUS, formatKpiValue, formatMoney, timeAgo } from "./dashboardTheme";

// The Finance desk: one page for everything a Finance user (Finance manager or executive) works on.
//   1. Banner      - what needs doing today, plus the desk's health against the verification target.
//   2. Figures     - the follow-up numbers, each with a status and context.
//   3. Insights    - plain-language callouts worked out from the figures, most urgent first.
//   4. Work area   - the verification queue (with priority) and the approvals routed to this user.
//   5. Pipeline    - where verified reports are on their way to payment.
//   6. Performance - verified value and query rate per month, and the latest decisions.
//   7. Tax & ITC   - this month's tax position.
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

// Priority from wait time, in the same buckets the backend uses for aging.
const priorityFor = (days) =>
  days > 7
    ? { key: "overdue", label: "Overdue", chip: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" }
    : days > SLA_DAYS
      ? { key: "late", label: "Past target", chip: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" }
      : days >= 1
        ? { key: "due", label: "On track", chip: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" }
        : { key: "new", label: "New", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" };

const AGING_STYLE = {
  lt1: { color: STATUS.good, label: "Under 1 day" },
  "1to3": { color: ORDINAL_BLUE[2], label: "1–3 days" },
  "4to7": { color: STATUS.warning, label: "4–7 days" },
  gt7: { color: STATUS.critical, label: "Over 7 days" },
};

const KPI_STYLE = {
  amber: { tile: "bg-amber-400/15 text-amber-700", bar: "from-amber-400 to-orange-300", line: "#d97706" },
  indigo: { tile: "bg-[#0A0082]/10 text-[#0A0082]", bar: "from-[#0A0082] to-[#4f63c9]", line: "#0A0082" },
  rose: { tile: "bg-[#ff3d72]/10 text-[#ff3d72]", bar: "from-[#ff3d72] to-[#ff7aa0]", line: "#ff3d72" },
  orange: { tile: "bg-orange-400/15 text-orange-700", bar: "from-orange-400 to-amber-300", line: "#ea580c" },
  emerald: { tile: "bg-emerald-500/10 text-emerald-700", bar: "from-emerald-500 to-teal-400", line: "#059669" },
  violet: { tile: "bg-violet-500/10 text-violet-700", bar: "from-violet-500 to-fuchsia-400", line: "#7c3aed" },
};
const KPI_ICON = { toVerify: Inbox, queueValue: Wallet, queries: MessageCircleQuestion, exceptions: ShieldAlert, verified: CheckCircle2, approvals: ClipboardCheck };

// Items routed to this user for a decision: expense reports in the approval queue plus cash advances. Same queries
// (and query keys) as the Approvals page, so the count here and the list in the Approvals tab never disagree.
function useApprovalsWaiting() {
  const queue = useMyQueue(0, 20);
  const advances = useQuery({
    queryKey: ["cashAdvanceApprovalCount", "PENDING", 0],
    queryFn: async () => {
      const res = await cashAdvanceApi.getMyApprovals({ page: 0, size: 1 });
      return res.data?.data?.totalElements ?? 0;
    },
  });
  const loading = queue.isLoading || advances.isLoading;
  return { loading, count: (queue.data?.totalElements ?? 0) + (advances.data ?? 0) };
}

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
      ranking: data.ranking || [],
      tax: data.tax || null,
    };
  }, [data]);
}

/** Plain-language callouts, most urgent first. Each one says what is happening and what to do about it. */
function buildInsights(m, currency) {
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

  const taxLines = n(m.tax?.linesAwaitingTaxReview);
  if (taxLines > 0) out.push({ level: "warning", title: `${plural(taxLines, "line")} awaiting tax review`, text: "Confirm GST details so input tax credit is not lost." });

  const order = { critical: 0, warning: 1, info: 2, good: 3 };
  return out.sort((a, b) => order[a.level] - order[b.level]).slice(0, 4);
}

// ---------------------------------------------------------------- banner

function HealthRing({ value }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const shown = value ?? 100;
  const color = shown >= 80 ? "#34d399" : shown >= 50 ? "#fbbf24" : "#fb7185";
  return (
    <div className="relative h-[68px] w-[68px] shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(shown / 100) * c} ${c}`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">{value === null ? "—" : `${value}%`}</span>
    </div>
  );
}

function FinanceHero({ m, currency, quickActions }) {
  const navigate = useNavigate();
  const busy = m.toVerify > 0;
  const headline = busy
    ? `${plural(m.toVerify, "report")} worth ${formatMoney(m.queueValue, currency)} waiting for verification`
    : "The verification queue is clear";
  const detail = busy
    ? `The oldest has been waiting ${waitText(m.oldestDays)}. Verify the oldest first to keep payments on time.`
    : "New reports appear here as soon as managers approve them.";

  const stats = [
    { icon: Hourglass, label: "Oldest wait", value: busy ? (m.oldestDays < 1 ? "< 1 day" : plural(m.oldestDays, "day")) : "—" },
    { icon: Wallet, label: "Avg per report", value: busy ? formatMoney(m.avgPerReport, currency) : "—" },
    { icon: AlertOctagon, label: "Over 7 days", value: fmtInt(m.overdue), alert: m.overdue > 0 },
  ];

  return (
    <section
      data-finance-hero
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0082] via-[#18208f] to-[#2f3f9e] px-5 py-5 text-white shadow-[0_18px_40px_-24px_rgba(10,0,130,0.7)] sm:px-6"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/[0.06]" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-56 h-56 w-56 rounded-full bg-[#ff3d72]/[0.14] blur-2xl" />

      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
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
            <button
              type="button"
              onClick={() => navigate("/expense-management/finance")}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0A0082] shadow-sm transition hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <ClipboardCheck size={16} aria-hidden="true" />
              {busy ? "Start verifying" : "Open verification"}
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Desk health against the verification target */}
        <div data-desk-health className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/15 backdrop-blur-sm lg:w-[380px]">
          <div className="flex items-center gap-4">
            <HealthRing value={m.onTimePct} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Queue on target</p>
              <p className="mt-0.5 text-sm font-semibold leading-snug">
                {m.onTimePct === null ? "Nothing waiting right now" : `${fmtInt(m.withinTarget)} of ${fmtInt(m.agingTotal)} within ${SLA_DAYS} days`}
              </p>
              <p className="mt-0.5 text-[11px] text-white/55">Target: verify within {SLA_DAYS} days of arrival</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="min-w-0">
                  <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                    <Icon size={11} aria-hidden="true" /> {s.label}
                  </dt>
                  <dd className={`mt-0.5 truncate text-sm font-bold tabular-nums ${s.alert ? "text-rose-300" : ""}`}>{s.value}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>

      <HeroQuickActions actions={quickActions} />
    </section>
  );
}

// ---------------------------------------------------------------- figures

function Sparkline({ values, color }) {
  if (!values || values.length < 2 || !values.some((v) => v > 0)) return null;
  const max = Math.max(...values, 1);
  const w = 84;
  const h = 26;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="overflow-visible">
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} fillOpacity="0.08" stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function StatusChip({ tone, children }) {
  const cls = {
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-800",
    bad: "bg-rose-50 text-rose-700",
    neutral: "bg-slate-100 text-slate-600",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{children}</span>;
}

function FinanceKpi({ step, kpi, value, currency, onClick, status, context, spark }) {
  const t = KPI_STYLE[step.tone] || KPI_STYLE.indigo;
  const Icon = KPI_ICON[step.key] || Inbox;
  const shown = value !== undefined ? value : kpi ? formatKpiValue(kpi, currency) : "-";
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      data-kpi={step.key}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition duration-200 ${
        onClick ? "hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.tile}`}>
          <Icon size={17} aria-hidden="true" />
        </span>
        <div className="flex items-center gap-1.5">
          {status && <StatusChip tone={status.tone}>{status.label}</StatusChip>}
          {onClick && <ArrowUpRight size={14} aria-hidden="true" className="text-slate-300 transition group-hover:text-[#0A0082]" />}
        </div>
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{step.label}</p>
      <div className="mt-0.5 flex items-end justify-between gap-2">
        <p className="text-2xl font-bold tabular-nums tracking-tight text-[#0a174e]">{shown}</p>
        {spark && <Sparkline values={spark} color={t.line} />}
      </div>
      <p className="mt-1 text-xs leading-snug text-slate-500">{step.help}</p>
      {context && <p className="mt-auto pt-2 text-[11px] font-medium text-slate-400">{context}</p>}
      <span aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${t.bar}`} />
    </Tag>
  );
}

/** Status and context for each figure, so a number never stands alone. */
function kpiExtras(key, m) {
  const v = m.num(key);
  switch (key) {
    case "queries":
      return { status: v > 0 ? { tone: "warn", label: "Follow up" } : { tone: "good", label: "All clear" }, context: v > 0 ? "Waiting on employee answers" : "No open queries" };
    case "exceptions":
      return {
        status: v > 0 ? { tone: v >= m.toVerify && m.toVerify > 0 ? "bad" : "warn", label: "Review" } : { tone: "good", label: "Clean" },
        context: m.toVerify > 0 ? `${(v / m.toVerify).toFixed(1)} per report in the queue` : "Queue is empty",
      };
    case "verified": {
      const status = m.valueChange === null ? null : { tone: m.valueChange >= 0 ? "good" : "neutral", label: `${m.valueChange >= 0 ? "▲" : "▼"} ${Math.abs(m.valueChange)}% value` };
      return { status, context: m.trend.length ? `Verified value, last ${m.trend.length} months` : null, spark: m.trend.map((p) => p.primary) };
    }
    default:
      return {};
  }
}

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

function EmptyState({ icon: Icon = Inbox, title, text }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <Icon size={20} aria-hidden="true" />
      </span>
      <p className="mt-1 text-sm font-semibold text-[#0a174e]">{title}</p>
      {text && <p className="max-w-xs text-xs text-slate-500">{text}</p>}
    </div>
  );
}

/** The verification queue, oldest first: priority, how long it has waited, its share of the queue value, and a way in. */
function QueueList({ items, currency, queueValue }) {
  const navigate = useNavigate();
  if (!items?.length) {
    return <EmptyState icon={CheckCircle2} title="The queue is empty" text="Nothing is waiting for Finance verification right now." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" data-finance-queue>
        <thead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <tr className="border-b border-slate-100">
            <th className="px-2 py-2">Priority</th>
            <th className="px-2 py-2">Report</th>
            <th className="px-2 py-2">Employee</th>
            <th className="px-2 py-2">Waiting</th>
            <th className="px-2 py-2 text-right">Amount</th>
            <th className="px-2 py-2" aria-label="Action" />
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const days = daysWaiting(it.at);
            const p = priorityFor(days);
            const share = queueValue > 0 ? Math.min(100, (n(it.amount) / queueValue) * 100) : 0;
            return (
              <tr
                key={`${it.reportId}-${it.at}`}
                data-priority={p.key}
                onClick={() => navigate("/expense-management/finance")}
                className="group cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-[#0A0082]/[0.03]"
              >
                <td className="px-2 py-3">
                  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${p.chip}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} aria-hidden="true" />
                    {p.label}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <p className="font-mono text-xs font-semibold text-[#0a174e]">{it.reportNumber}</p>
                  <p className="max-w-[200px] truncate text-xs text-slate-500">{it.title || "Untitled report"}</p>
                </td>
                <td className="px-2 py-3 text-xs text-slate-600">{it.employeeId ? <EmployeeLabel employeeId={it.employeeId} /> : "—"}</td>
                <td className="whitespace-nowrap px-2 py-3 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} aria-hidden="true" className="text-slate-400" />
                    {days < 1 ? "Today" : plural(days, "day")}
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 py-3 text-right">
                  <p className="text-sm font-bold tabular-nums text-[#0a174e]">{formatMoney(it.amount, currency)}</p>
                  {share > 0 && (
                    <div className="ml-auto mt-1 flex w-24 items-center gap-1.5" title={`${Math.round(share)}% of the queue value`}>
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(share, 3)}%`, background: ACCENT }} />
                      </div>
                      <span className="text-[10px] tabular-nums text-slate-400">{Math.round(share)}%</span>
                    </div>
                  )}
                </td>
                <td className="px-2 py-3 text-right">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#0A0082] px-2.5 py-1 text-[11px] font-semibold text-white opacity-90 transition group-hover:opacity-100">
                    Verify <ArrowRight size={11} aria-hidden="true" />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Wait time across the whole queue as one segmented bar, with each bucket's count and share. */
function AgingBar({ buckets, total }) {
  if (!total) return <p className="py-4 text-xs text-slate-400">No reports waiting.</p>;
  return (
    <div data-finance-aging>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100">
        {buckets.filter((b) => b.count > 0).map((b) => (
          <div key={b.key} title={`${b.label}: ${b.count}`} className="h-full" style={{ width: `${(b.count / total) * 100}%`, background: AGING_STYLE[b.key]?.color || CHROME.axis }} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {buckets.map((b) => (
          <li key={b.key} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: AGING_STYLE[b.key]?.color || CHROME.axis }} />
            <span className="min-w-0 flex-1 truncate text-slate-600">{b.label}</span>
            <span className="font-semibold tabular-nums text-[#0a174e]">{fmtInt(b.count)}</span>
            <span className="w-8 text-right tabular-nums text-slate-400">{pct(b.count, total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Queue value by category, with each category's share and line count. */
function CategoryShare({ slices, currency }) {
  if (!slices?.length) return <p className="py-4 text-xs text-slate-400">No categories in the queue.</p>;
  const total = slices.reduce((s, x) => s + n(x.amount), 0);
  return (
    <ul className="space-y-3" data-finance-categories>
      {slices.map((s, i) => {
        const share = pct(n(s.amount), total);
        const color = s.key === "other" ? CHROME.axis : SERIES[i % SERIES.length];
        return (
          <li key={s.key} title={`${s.label}: ${formatMoney(s.amount, currency)} · ${plural(n(s.count), "line")}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                <span className="truncate text-slate-700">{s.label || "Uncategorised"}</span>
                <span className="shrink-0 text-slate-400">· {plural(n(s.count), "line")}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                {formatMoney(s.amount, currency)} <span className="font-normal text-slate-400">{share}%</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${Math.max(share, 2)}%`, background: color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const dayLabel = (at) => {
  if (!at) return "Earlier";
  const d = new Date(at);
  const today = new Date();
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(today) - start(d)) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};

/** Latest Finance decisions, newest first and grouped by day: verified in green, queried in amber. */
function DecisionList({ items, currency }) {
  const navigate = useNavigate();
  if (!items?.length) return <EmptyState icon={Sparkles} title="No verifications yet" text="Reports you verify or query will show up here." />;
  const verified = items.filter((it) => it.status === "Verified").length;
  const groups = [];
  items.forEach((it) => {
    const label = dayLabel(it.at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(it);
    else groups.push({ label, items: [it] });
  });
  return (
    <div data-finance-activity>
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold">
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{fmtInt(verified)} verified</span>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">{fmtInt(items.length - verified)} queried</span>
        <span className="font-normal text-slate-400">in the latest {plural(items.length, "decision")}</span>
      </div>
      {groups.map((g) => (
        <div key={g.label} className="mb-2 last:mb-0">
          <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const ok = it.status === "Verified";
              const Icon = ok ? CheckCircle2 : MessageCircleQuestion;
              return (
                <li
                  key={`${it.reportId}-${it.at}`}
                  onClick={() => navigate("/expense-management/finance")}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[#0A0082]/[0.03]"
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ok ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-[#0a174e]">{it.reportNumber}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{it.status}</span>
                    </div>
                    <p className="truncate text-xs text-slate-500">{it.employeeId ? <EmployeeLabel employeeId={it.employeeId} /> : it.title || "—"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums text-[#0a174e]">{formatMoney(it.amount, currency)}</p>
                    <p className="text-[11px] text-slate-400">{timeAgo(it.at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- pipeline

// Already shown above (the banner and the Open queries figure), so the flow starts after verification.
const SHOWN_ABOVE = ["toVerify", "queried"];

const FLOW = {
  withAp: { icon: Hourglass, help: "Verified, waiting for AP to pay", tone: "bg-[#263383]/10 text-[#263383]", color: ORDINAL_BLUE[2] },
  paid: { icon: CheckCircle2, help: "Payment completed", tone: "bg-emerald-500/10 text-emerald-700", color: STATUS.good },
  invoice: { icon: ReceiptText, help: "Client invoice handoff still pending", tone: "bg-violet-500/10 text-violet-700", color: "#7c3aed" },
};

function ReportFlow({ stages }) {
  if (!stages?.length) return <p className="py-4 text-xs text-slate-400">No verified reports on their way to payment yet.</p>;
  const total = stages.reduce((s, x) => s + n(x.count), 0);
  return (
    <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-finance-flow>
      {stages.map((s, i) => {
        const f = FLOW[s.key] || { icon: FileText, help: "", tone: "bg-slate-100 text-slate-600", color: CHROME.axis };
        const Icon = f.icon;
        const share = pct(n(s.count), total);
        return (
          <li key={s.key} className="relative rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
            <div className="flex items-center justify-between">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${f.tone}`}>
                <Icon size={15} aria-hidden="true" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Step {i + 1}</span>
            </div>
            <p className="mt-3 text-2xl font-bold tabular-nums text-[#0a174e]">{fmtInt(s.count)}</p>
            <p className="text-xs font-semibold text-slate-700">{s.label}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{f.help}</p>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
              <div className="h-full rounded-full" style={{ width: `${share}%`, background: f.color }} />
            </div>
            <p className="mt-1 text-[10px] tabular-nums text-slate-400">{share}% of reports after verification</p>
            {i < stages.length - 1 && (
              <ArrowRight size={14} aria-hidden="true" className="absolute -right-[11px] top-1/2 hidden -translate-y-1/2 rounded-full bg-white text-slate-300 sm:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------- performance

function Delta({ value }) {
  if (value === null || value === undefined) return null;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`ml-1 inline-flex items-center text-[10px] font-semibold ${up ? "text-emerald-600" : "text-rose-600"}`}>
      <Icon size={11} aria-hidden="true" />
      {Math.abs(value)}%
    </span>
  );
}

function TrendSummary({ m, currency }) {
  const amount = m.trend.reduce((s, p) => s + p.primary, 0);
  const lines = m.trend.reduce((s, p) => s + p.count, 0);
  const queried = m.trend.reduce((s, p) => s + p.secondary, 0);
  const queryRate = lines + queried > 0 ? Math.round((queried / (lines + queried)) * 100) : null;
  const avgMonth = m.trend.length ? amount / m.trend.length : 0;
  const cells = [
    { label: "Verified value", value: formatMoney(amount, currency) },
    { label: "Monthly average", value: formatMoney(avgMonth, currency) },
    { label: "This month", value: m.thisMonth ? formatMoney(m.thisMonth.primary, currency) : "—", delta: m.valueChange },
    { label: "Query rate", value: queryRate === null ? "—" : `${queryRate}%`, hint: `${fmtInt(lines)} verified · ${fmtInt(queried)} queried lines` },
  ];
  return (
    <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4" data-finance-trend-summary>
      {cells.map((c) => (
        <div key={c.label} className="rounded-xl bg-slate-50 px-3 py-2" title={c.hint}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{c.label}</p>
          <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-[#0a174e]">
            {c.value}
            <Delta value={c.delta} />
          </p>
        </div>
      ))}
    </div>
  );
}

const axisProps = { tick: { fill: CHROME.muted, fontSize: 11 }, tickLine: false, axisLine: { stroke: CHROME.axis } };

/** Verified value per month as columns, with the month's query rate as a line on its own axis. */
function PerformanceChart({ points, currency }) {
  if (!points.some((p) => p.primary > 0 || p.count > 0 || p.secondary > 0)) {
    return <p className="flex h-[240px] items-center justify-center text-xs text-slate-400">No verifications in this period yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={250}>
      <ComposedChart data={points} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="32%">
        <CartesianGrid vertical={false} stroke={CHROME.grid} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis yAxisId="v" {...axisProps} axisLine={false} width={64} tickFormatter={(v) => formatMoney(v, currency, { compact: true })} />
        <YAxis yAxisId="r" orientation="right" {...axisProps} axisLine={false} width={36} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          cursor={{ fill: "rgba(42,120,214,0.06)" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload;
            const rows = [
              ["Verified value", formatMoney(p.primary, currency), ACCENT],
              ["Lines verified", fmtInt(p.count)],
              ["Lines queried", fmtInt(p.secondary)],
              ["Query rate", p.queryRate === null ? "—" : `${p.queryRate}%`, SERIES[1]],
            ];
            return (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                <p className="mb-1 font-semibold text-slate-800">
                  {label} {String(p.period || "").slice(0, 4)}
                </p>
                {rows.map(([k, v, color]) => (
                  <p key={k} className="flex items-center gap-2 text-slate-600">
                    {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
                    <span>{k}</span>
                    <span className="ml-auto pl-3 font-semibold tabular-nums text-slate-900">{v}</span>
                  </p>
                ))}
              </div>
            );
          }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#52514e" }} />
        <Bar yAxisId="v" dataKey="primary" name="Verified value" fill={ACCENT} radius={[4, 4, 0, 0]} />
        <Line yAxisId="r" type="monotone" dataKey="queryRate" name="Query rate" stroke={SERIES[1]} strokeWidth={2} connectNulls dot={{ r: 3, fill: SERIES[1], stroke: CHROME.surface, strokeWidth: 2 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------- tax

/** This month's tax position: total, recoverable vs non-recoverable split, and the review backlog. */
function TaxSnapshot({ tax, currency }) {
  const total = n(tax.taxThisMonth);
  const rec = n(tax.recoverableThisMonth);
  const non = n(tax.nonRecoverableThisMonth);
  const recShare = rec + non > 0 ? pct(rec, rec + non) : 0;
  const pending = n(tax.linesAwaitingTaxReview);
  const mismatch = n(tax.mismatchRatePercent);
  const months = (tax.byMonth || []).map((m) => ({ label: m.label, tax: n(m.tax) }));
  const maxMonth = Math.max(...months.map((m) => m.tax), 1);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5" data-finance-tax>
      <div className="lg:col-span-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tax this month</p>
            <p className="text-2xl font-bold tabular-nums text-[#0a174e]">{formatMoney(total, currency)}</p>
            <p className="text-xs text-slate-500">{Number(tax.taxSharePercent || 0)}% of gross spend</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Recoverable share</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-700">{recShare}%</p>
          </div>
        </div>
        <div className="mt-3 flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100">
          {rec > 0 && <div className="h-full" style={{ width: `${recShare}%`, background: SERIES[0] }} title="Recoverable (ITC)" />}
          {non > 0 && <div className="h-full" style={{ width: `${100 - recShare}%`, background: SERIES[1] }} title="Non-recoverable" />}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
          <li className="flex items-center gap-2 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[0] }} /> Recoverable (ITC)
            <span className="font-semibold tabular-nums text-[#0a174e]">{formatMoney(rec, currency)}</span>
          </li>
          <li className="flex items-center gap-2 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[1] }} /> Non-recoverable
            <span className="font-semibold tabular-nums text-[#0a174e]">{formatMoney(non, currency)}</span>
          </li>
        </ul>
        {months.some((m) => m.tax > 0) && (
          <div className="mt-4">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tax per month</p>
            <div className="flex h-16 items-end gap-1.5">
              {months.map((m) => (
                <div key={m.label} className="flex flex-1 flex-col items-center gap-1" title={`${m.label}: ${formatMoney(m.tax, currency)}`}>
                  <div className="w-full rounded-t" style={{ height: `${Math.max((m.tax / maxMonth) * 48, 2)}px`, background: ORDINAL_BLUE[1] }} />
                  <span className="text-[10px] text-slate-400">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-1">
        <div className={`rounded-xl border p-3 ${pending > 0 ? "border-amber-200 bg-amber-50/60" : "border-slate-100 bg-slate-50"}`}>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <Timer size={12} aria-hidden="true" /> Awaiting tax review
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-[#0a174e]">{plural(pending, "line")}</p>
          <p className="text-[11px] text-slate-500">{pending > 0 ? "Confirm GST details to protect ITC" : "Nothing waiting"}</p>
        </div>
        <div className={`rounded-xl border p-3 ${mismatch >= 10 ? "border-rose-200 bg-rose-50/60" : "border-slate-100 bg-slate-50"}`}>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <Gauge size={12} aria-hidden="true" /> Receipt mismatch rate
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-[#0a174e]">{mismatch}%</p>
          <p className="text-[11px] text-slate-500">Lines whose tax differs from the scanned receipt</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- page body

export default function FinanceDashboard({ data, config, currency }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("verify");
  const approvals = useApprovalsWaiting();
  const m = useDeskMetrics(data);
  const insights = useMemo(() => buildInsights(m, currency), [m, currency]);
  const quickActions = config.quickActions || [];
  const openVerification = () => navigate("/expense-management/finance");

  const tabs = [
    { key: "verify", label: "Verification queue", icon: Inbox, count: m.toVerify },
    { key: "approvals", label: "My approvals", icon: ClipboardCheck, count: approvals.loading ? null : approvals.count },
  ];

  return (
    <div className="space-y-4" data-finance-dashboard>
      <FinanceHero m={m} currency={currency} quickActions={quickActions} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {config.steps.map((step) => (
          <FinanceKpi key={step.key} step={step} kpi={m.byKey[step.key]} currency={currency} onClick={openVerification} {...kpiExtras(step.key, m)} />
        ))}
        <FinanceKpi
          step={{ key: "approvals", label: "Approvals waiting", help: "Reports and advances routed to you.", tone: "violet" }}
          value={approvals.loading ? "—" : approvals.count.toLocaleString("en-IN")}
          currency={currency}
          onClick={() => setTab("approvals")}
          status={approvals.loading ? null : approvals.count > 0 ? { tone: "warn", label: "Decide" } : { tone: "good", label: "All clear" }}
          context="Opens in the work area below"
        />
      </div>

      <Insights items={insights} />

      {/* Work area: both queues in one place */}
      <section id="finance-work" className="scroll-mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(10,0,130,0.04),0_10px_30px_-18px_rgba(10,0,130,0.18)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Finance work">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-finance-tab={t.key}
                  onClick={() => setTab(t.key)}
                  className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-sm font-semibold transition ${
                    active ? "border-[#0A0082] text-[#0A0082]" : "border-transparent text-slate-500 hover:text-[#0a174e]"
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {t.label}
                  {t.count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${active ? "bg-[#0A0082] text-white" : "bg-amber-100 text-amber-800"}`}>
                      {fmtInt(t.count)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {tab === "verify" && (
            <button
              type="button"
              onClick={openVerification}
              className="mb-3 inline-flex items-center gap-1 self-start text-xs font-semibold text-[#0A0082] hover:underline sm:self-auto"
            >
              Open full verification queue <ArrowRight size={13} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="p-4">
          {tab === "verify" ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <p className="mb-2 text-xs text-slate-500">
                  Oldest first, so the longest waits are seen first.
                  {m.toVerify > m.queue.length && m.queue.length > 0 && ` Showing the ${m.queue.length} oldest of ${fmtInt(m.toVerify)}.`}
                </p>
                <QueueList items={m.queue} currency={currency} queueValue={m.queueValue} />
              </div>
              <div className="space-y-6 lg:col-span-2 lg:border-l lg:border-slate-100 lg:pl-5">
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0a174e]">
                    <Clock size={15} className="text-amber-600" aria-hidden="true" /> How long reports have waited
                  </h3>
                  <AgingBar buckets={m.aging} total={m.agingTotal} />
                </div>
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0a174e]">
                    <PieChart size={15} className="text-[#ff3d72]" aria-hidden="true" /> {data.rankingTitle || "Queue by category"}
                  </h3>
                  <CategoryShare slices={m.ranking} currency={currency} />
                </div>
              </div>
            </div>
          ) : (
            <ApprovalsPage embedded />
          )}
        </div>
      </section>

      <SectionCard title="After verification" subtitle="Where verified reports are on their way to payment" icon={Workflow} tone="navy">
        <ReportFlow stages={m.pipeline.filter((s) => !SHOWN_ABOVE.includes(s.key))} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <SectionCard title={data.trendTitle || "Verified per month"} subtitle="Verified value, with the share of lines queried" icon={BarChart3} tone="teal" className="lg:col-span-3">
          <TrendSummary m={m} currency={currency} />
          <PerformanceChart points={m.trend} currency={currency} />
        </SectionCard>
        <SectionCard title={config.activityTitle} subtitle={config.activitySubtitle} icon={CheckCircle2} tone="teal" className="lg:col-span-2">
          <DecisionList items={data.activity} currency={currency} />
        </SectionCard>
      </div>

      {m.tax && (
        <SectionCard title="Tax & ITC" subtitle="This month's tax position, in base currency" icon={Receipt} tone="pink">
          <TaxSnapshot tax={m.tax} currency={currency} />
        </SectionCard>
      )}
    </div>
  );
}
