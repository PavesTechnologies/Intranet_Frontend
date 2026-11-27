import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Clock3,
  FileText,
  Inbox,
  Receipt,
  ReceiptText,
  ScanLine,
  Settings,
  Shield,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import EmployeeLabel from "@/pages/expense-management/approval-engine/components/EmployeeLabel";
import { formatKpiValue, formatMoney } from "./dashboardTheme";

// Shared pieces for every Expense dashboard, so they all read the same way: a navy banner that says what matters today
// with the role's quick actions built into it, figure cards, a "waiting longest" queue table and a step flow.

const QUICK_ICONS = { Banknote, Bell, ClipboardCheck, FileText, Clock3, Inbox, Receipt, ReceiptText, ScanLine, Settings, Shield, Wallet };

/** The role's quick actions as a row inside the banner. An action shows only when the role can open its route. */
export function HeroQuickActions({ actions = [] }) {
  // No actions: render nothing, without needing a router (the banner is also used on its own in tests).
  if (!actions?.length) return null;
  return <QuickActionRow actions={actions} />;
}

function QuickActionRow({ actions }) {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const visible = actions.filter((a) => !a.roles || hasRole(a.roles));
  if (!visible.length) return null;
  return (
    <div className="relative mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3" data-quick-actions>
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">Quick actions</span>
      {visible.map((a) => {
        const Icon = QUICK_ICONS[a.icon] || FileText;
        return (
          <button
            key={a.key || a.label}
            type="button"
            data-quick-action={a.key}
            title={a.hint}
            onClick={() => navigate(a.to)}
            className={`group inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
              a.primary
                ? "bg-white text-[#0A0082] ring-white hover:bg-white/90"
                : "bg-white/[0.08] text-white ring-white/15 hover:bg-white/[0.16]"
            }`}
          >
            <Icon size={14} aria-hidden="true" />
            {a.label}
            <ArrowUpRight size={12} aria-hidden="true" className="opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        );
      })}
    </div>
  );
}

/** Navy banner: eyebrow, headline, one line of detail, an optional right-hand slot, and the quick actions. */
export function DashboardHero({ eyebrow, icon: Icon, headline, detail, aside, quickActions, ...rest }) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0082] via-[#18208f] to-[#2f3f9e] px-5 py-5 text-white shadow-[0_18px_40px_-24px_rgba(10,0,130,0.7)] sm:px-6"
      {...rest}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/[0.06]" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-56 h-56 w-56 rounded-full bg-[#ff3d72]/[0.14] blur-2xl" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {Icon && (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <Icon size={22} aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">{eyebrow}</p>
            <h2 data-hero-headline className="mt-1 text-lg font-bold leading-snug tracking-tight sm:text-xl">
              {headline}
            </h2>
            {detail && <p className="mt-1 max-w-2xl text-sm text-white/70">{detail}</p>}
          </div>
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>

      <HeroQuickActions actions={quickActions} />
    </section>
  );
}

/** A white call-to-action button for the banner's right-hand slot. */
export function HeroButton({ icon: Icon = ArrowRight, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0A0082] shadow-sm transition hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      <Icon size={16} aria-hidden="true" />
      {children}
    </button>
  );
}

const FIGURE_STYLE = {
  amber: { tile: "bg-amber-400/15 text-amber-700", bar: "from-amber-400 to-orange-300" },
  indigo: { tile: "bg-[#0A0082]/10 text-[#0A0082]", bar: "from-[#0A0082] to-[#4f63c9]" },
  blue: { tile: "bg-[#263383]/10 text-[#263383]", bar: "from-[#263383] to-[#4f63c9]" },
  rose: { tile: "bg-[#ff3d72]/10 text-[#ff3d72]", bar: "from-[#ff3d72] to-[#ff7aa0]" },
  orange: { tile: "bg-orange-400/15 text-orange-700", bar: "from-orange-400 to-amber-300" },
  emerald: { tile: "bg-emerald-500/10 text-emerald-700", bar: "from-emerald-500 to-teal-400" },
  violet: { tile: "bg-violet-500/10 text-violet-700", bar: "from-violet-500 to-fuchsia-400" },
  gray: { tile: "bg-slate-100 text-slate-600", bar: "from-slate-400 to-slate-300" },
};

/** One figure: icon, label, value, what it means, and the backend's hint (e.g. "3 report(s)"). */
export function FigureCard({ step, kpi, icon: Icon = Inbox, currency, onClick }) {
  const t = FIGURE_STYLE[step.tone] || FIGURE_STYLE.indigo;
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
        {kpi?.hint && <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">{kpi.hint}</span>}
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{step.label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-[#0a174e]">{kpi ? formatKpiValue(kpi, currency) : "—"}</p>
      <p className="mt-1 text-xs leading-snug text-slate-500">{step.help}</p>
      <span aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${t.bar}`} />
    </Tag>
  );
}

const DAY = 86_400_000;
export const daysSince = (at) => (at ? Math.max(0, Math.floor((Date.now() - new Date(at).getTime()) / DAY)) : 0);

// Wait-time chip, in the same four buckets the backend uses for its aging chart.
const waitTone = (days) =>
  days < 1
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : days <= 3
      ? "bg-sky-50 text-sky-700 ring-sky-200"
      : days <= 7
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-rose-50 text-rose-700 ring-rose-200";

export function EmptyState({ icon: Icon = CheckCircle2, title, text }) {
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

/** A queue, oldest first: report, employee, how long it has waited, amount, and a button into the work page. */
export function QueueTable({ items, currency, to, actionLabel, waitLabel = "Waiting", emptyTitle, emptyText }) {
  const navigate = useNavigate();
  if (!items?.length) return <EmptyState title={emptyTitle} text={emptyText} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" data-queue-table>
        <thead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <tr className="border-b border-slate-100">
            <th className="px-2 py-2">Report</th>
            <th className="px-2 py-2">Employee</th>
            <th className="px-2 py-2">{waitLabel}</th>
            <th className="px-2 py-2 text-right">Amount</th>
            <th className="px-2 py-2" aria-label="Action" />
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const days = daysSince(it.at);
            return (
              <tr
                key={`${it.reportId}-${it.at}`}
                onClick={() => navigate(to)}
                className="group cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-[#0A0082]/[0.03]"
              >
                <td className="px-2 py-3">
                  <p className="font-mono text-xs font-semibold text-[#0a174e]">{it.reportNumber}</p>
                  <p className="max-w-[220px] truncate text-xs text-slate-500">{it.title || "Untitled report"}</p>
                </td>
                <td className="px-2 py-3 text-xs text-slate-600">{it.employeeId ? <EmployeeLabel employeeId={it.employeeId} /> : "—"}</td>
                <td className="px-2 py-3">
                  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${waitTone(days)}`}>
                    <Clock size={11} aria-hidden="true" />
                    {days < 1 ? "Today" : `${days} day${days === 1 ? "" : "s"}`}
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 py-3 text-right text-sm font-bold tabular-nums text-[#0a174e]">{formatMoney(it.amount, currency)}</td>
                <td className="px-2 py-3 text-right">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#0A0082] px-2.5 py-1 text-[11px] font-semibold text-white opacity-90 transition group-hover:opacity-100">
                    {actionLabel} <ArrowRight size={11} aria-hidden="true" />
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

/** Ordered stages with their counts, each with an icon and one line saying what it means. */
export function StageFlow({ stages, meta }) {
  if (!stages?.length) return null;
  return (
    <ol className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${stages.length >= 5 ? "lg:grid-cols-5" : stages.length === 4 ? "lg:grid-cols-4" : ""}`} data-stage-flow>
      {stages.map((s, i) => {
        const m = meta[s.key] || { icon: FileText, help: "", tone: "bg-slate-100 text-slate-600" };
        const Icon = m.icon;
        return (
          <li key={s.key} data-stage={s.key} className="relative rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.tone}`}>
              <Icon size={15} aria-hidden="true" />
            </span>
            <p className="mt-3 text-2xl font-bold tabular-nums text-[#0a174e]">{Number(s.count || 0).toLocaleString("en-IN")}</p>
            <p className="text-xs font-semibold text-slate-700">{s.label}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{m.help}</p>
            {i < stages.length - 1 && (
              <ArrowRight size={14} aria-hidden="true" className="absolute -right-[11px] top-1/2 hidden -translate-y-1/2 rounded-full bg-white text-slate-300 lg:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Three small totals above a trend chart. */
export function TrendTotals({ cells }) {
  return (
    <div className="mb-3 grid grid-cols-3 gap-2">
      {cells.map((c) => (
        <div key={c.label} className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{c.label}</p>
          <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-[#0a174e]">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
