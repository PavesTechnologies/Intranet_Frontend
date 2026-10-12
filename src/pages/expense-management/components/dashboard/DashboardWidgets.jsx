import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { AlertTriangle, AlertOctagon, CheckCircle2, ChevronRight, Inbox } from "lucide-react";
import StatusBadge from "@/components/status/statusbadge";
import EmployeeLabel from "@/pages/expense-management/approval-engine/components/EmployeeLabel";
import { SERIES, ORDINAL_BLUE, ACCENT, STATUS, CHROME, formatMoney, timeAgo } from "./dashboardTheme";

// ---------------------------------------------------------------- shell

export function ChartCard({ title, subtitle, children, className = "", action }) {
  return (
    <section className={`flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function Empty({ text = "Nothing here yet." }) {
  return (
    <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-1.5 text-center">
      <Inbox className="h-6 w-6 text-slate-300" />
      <p className="text-xs text-slate-400">{text}</p>
    </div>
  );
}

function TooltipBox({ title, rows }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-800">{title}</p>
      {rows.map(([label, value, color]) => (
        <p key={label} className="flex items-center gap-2 text-slate-600">
          {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
          <span>{label}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums text-slate-900">{value}</span>
        </p>
      ))}
    </div>
  );
}

const axisProps = {
  tick: { fill: CHROME.muted, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: CHROME.axis },
};

// ---------------------------------------------------------------- trend

/**
 * Month-by-month trend. `mode`:
 *  - "money": one area series (primary = amount), tooltip adds the item count
 *  - "decisions": stacked columns, approved (count) + sent back (secondary)
 */
export function TrendChart({ points, currency, mode = "money", countLabel = "Items", primaryLabel = "Amount" }) {
  const hasData = points?.some((p) => Number(p.primary) > 0 || p.count > 0 || p.secondary > 0);
  if (!hasData) return <Empty text="No activity in this period yet." />;

  if (mode === "decisions") {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={points} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke={CHROME.grid} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis allowDecimals={false} {...axisProps} axisLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(42,120,214,0.06)" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox title={label} rows={[["Approved", payload[0].payload.count, SERIES[0]], ["Sent back", payload[0].payload.secondary, SERIES[1]]]} />
              ) : null
            }
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#52514e" }} />
          <Bar dataKey="count" name="Approved" stackId="d" fill={SERIES[0]} stroke={CHROME.surface} strokeWidth={2} />
          <Bar dataKey="secondary" name="Sent back" stackId="d" fill={SERIES[1]} stroke={CHROME.surface} strokeWidth={2} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const data = points.map((p) => ({ ...p, primary: Number(p.primary) || 0 }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.22} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={CHROME.grid} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} axisLine={false} width={64} tickFormatter={(v) => formatMoney(v, currency, { compact: true })} />
        <Tooltip
          cursor={{ stroke: CHROME.axis, strokeWidth: 1 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload;
            const rows = [[primaryLabel, formatMoney(p.primary, currency), ACCENT], [countLabel, p.count]];
            if (p.secondary) rows.push(["Queried", p.secondary]);
            return <TooltipBox title={`${label} ${p.period.slice(0, 4)}`} rows={rows} />;
          }}
        />
        <Area
          type="monotone"
          dataKey="primary"
          stroke={ACCENT}
          strokeWidth={2}
          fill="url(#trendFill)"
          dot={{ r: 3, fill: ACCENT, stroke: CHROME.surface, strokeWidth: 2 }}
          activeDot={{ r: 5, fill: ACCENT, stroke: CHROME.surface, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------- tax

/**
 * Tax per month as stacked columns: recoverable (input tax credit) under non-recoverable, so the
 * column height is the total tax. Two fixed categorical hues, 2px surface gap between segments.
 */
export function TaxByMonthChart({ months, currency }) {
  const data = (months || []).map((m) => ({
    ...m,
    recoverable: Number(m.recoverable) || 0,
    nonRecoverable: Number(m.nonRecoverable) || 0,
    tax: Number(m.tax) || 0,
  }));
  if (!data.some((m) => m.tax > 0)) return <Empty text="No tax recorded in this period yet." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke={CHROME.grid} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} axisLine={false} width={64} tickFormatter={(v) => formatMoney(v, currency, { compact: true })} />
        <Tooltip
          cursor={{ fill: "rgba(42,120,214,0.06)" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload;
            return (
              <TooltipBox
                title={`${label} ${String(p.period || "").slice(0, 4)}`}
                rows={[
                  ["Total tax", formatMoney(p.tax, currency)],
                  ["Recoverable", formatMoney(p.recoverable, currency), SERIES[0]],
                  ["Non-recoverable", formatMoney(p.nonRecoverable, currency), SERIES[1]],
                ]}
              />
            );
          }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#52514e" }} />
        <Bar dataKey="recoverable" name="Recoverable (ITC)" stackId="t" fill={SERIES[0]} stroke={CHROME.surface} strokeWidth={2} />
        <Bar dataKey="nonRecoverable" name="Non-recoverable" stackId="t" fill={SERIES[1]} stroke={CHROME.surface} strokeWidth={2} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------- pipeline

/** Ordered workflow stages as a flow of step cards, each with its share of the total. */
export function Pipeline({ stages }) {
  const total = stages.reduce((s, x) => s + x.count, 0);
  if (!total) return <Empty text="No reports in the workflow yet." />;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {stages.map((stage, i) => {
        const share = total ? Math.round((stage.count / total) * 100) : 0;
        const color = ORDINAL_BLUE[Math.min(i, ORDINAL_BLUE.length - 1)];
        return (
          <div key={stage.key} className="relative rounded-lg border border-slate-100 bg-slate-50/60 p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: color }}>
                {i + 1}
              </span>
              <span className="truncate text-xs font-medium text-slate-600">{stage.label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stage.count}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
              <div className="h-full rounded-full" style={{ width: `${share}%`, background: color }} />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">{share}% of reports</p>
            {i < stages.length - 1 && (
              <ChevronRight className="absolute -right-2.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-slate-300 lg:block" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- breakdown

/** Part-to-whole: one stacked bar (2px gaps between segments) plus a labelled legend with counts. */
export function Breakdown({ slices, currency }) {
  const total = slices.reduce((s, x) => s + x.count, 0);
  if (!total) return <Empty />;
  // Beyond 6 slices, fold the tail so colors never cycle.
  const shown = slices.length > 6 ? [...slices.slice(0, 5), {
    key: "other", label: "Other", count: slices.slice(5).reduce((s, x) => s + x.count, 0), amount: null,
  }] : slices;
  return (
    <div className="space-y-4">
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
        {shown.filter((s) => s.count > 0).map((s, i) => (
          <div
            key={s.key}
            title={`${s.label}: ${s.count}`}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(s.count / total) * 100}%`, background: SERIES[i] }}
          />
        ))}
      </div>
      <ul className="space-y-2">
        {shown.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: SERIES[i] }} />
            <span className="min-w-0 flex-1 truncate text-slate-700">{s.label}</span>
            {s.amount != null && Number(s.amount) > 0 && <span className="text-slate-400">{formatMoney(s.amount, currency)}</span>}
            <span className="w-8 text-right font-semibold tabular-nums text-slate-900">{s.count}</span>
            <span className="w-9 text-right tabular-nums text-slate-400">{Math.round((s.count / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- ranking

/** Top items by amount, horizontal bars in one hue with the value labelled. */
export function Ranking({ slices, currency }) {
  if (!slices?.length) return <Empty />;
  const max = Math.max(...slices.map((s) => Number(s.amount) || 0), 1);
  return (
    <ul className="space-y-3">
      {slices.map((s) => {
        const pct = ((Number(s.amount) || 0) / max) * 100;
        return (
          <li key={s.key} title={`${s.label}: ${formatMoney(s.amount, currency)} · ${s.count} item(s)`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
              <span className="truncate text-slate-700">{s.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-900">{formatMoney(s.amount, currency)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, background: s.key === "other" ? CHROME.axis : ACCENT }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- aging

/** How long open items have waited: columns, light -> dark blue as the wait grows. */
export function Aging({ buckets, noun = "items" }) {
  const total = buckets.reduce((s, b) => s + b.count, 0);
  if (!total) return <Empty text={`No ${noun} waiting.`} />;
  const colors = [ORDINAL_BLUE[0], ORDINAL_BLUE[1], ORDINAL_BLUE[3], ORDINAL_BLUE[4]];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={buckets} margin={{ top: 16, right: 8, left: -20, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={CHROME.grid} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis allowDecimals={false} {...axisProps} axisLine={false} />
        <Tooltip
          cursor={{ fill: "rgba(42,120,214,0.06)" }}
          content={({ active, payload }) =>
            active && payload?.length ? <TooltipBox title={payload[0].payload.label} rows={[[`Waiting ${noun}`, payload[0].payload.count]]} /> : null
          }
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} label={{ position: "top", fill: "#52514e", fontSize: 11 }}>
          {buckets.map((b, i) => (
            <Cell key={b.key} fill={colors[i]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------- budgets

/** Cost-center budget meters. Over the warning threshold / over budget use status color + icon + label. */
export function Budgets({ budgets, currency }) {
  if (!budgets?.length) return <Empty text="No budgets set for this fiscal year." />;
  return (
    <ul className="space-y-4">
      {budgets.map((b) => {
        const pct = b.budgetAmount > 0 ? (Number(b.usedAmount) / Number(b.budgetAmount)) * 100 : 0;
        const warnAt = b.warningThreshold != null ? Number(b.warningThreshold) : 80;
        const state = pct >= 100 ? "critical" : pct >= warnAt ? "warning" : "good";
        const Icon = state === "critical" ? AlertOctagon : state === "warning" ? AlertTriangle : CheckCircle2;
        const stateLabel = state === "critical" ? "Over budget" : state === "warning" ? "Near limit" : "On track";
        return (
          <li key={`${b.costCenterName}-${b.fiscalYear}`}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium text-slate-700">{b.costCenterName}</span>
              <span className="flex shrink-0 items-center gap-1 text-slate-500">
                <Icon className="h-3.5 w-3.5" style={{ color: STATUS[state] }} />
                {stateLabel}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: state === "good" ? ACCENT : STATUS[state] }} />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {formatMoney(b.usedAmount, currency)} of {formatMoney(b.budgetAmount, currency)} used · {Math.round(pct)}%
            </p>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- lists

/** Report rows (attention queue or activity timeline). `timeline` draws a connecting rail. */
export function ItemList({ items, currency, linkFor, timeline = false, showEmployee = false, empty }) {
  const navigate = useNavigate();
  if (!items?.length) return <Empty text={empty} />;
  return (
    <ul className={timeline ? "relative space-y-3 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-slate-200" : "divide-y divide-slate-100"}>
      {items.map((it) => {
        const to = linkFor?.(it);
        return (
          <li
            key={`${it.reportId}-${it.at}`}
            onClick={to ? () => navigate(to) : undefined}
            className={`flex items-start gap-3 ${timeline ? "relative pl-5" : "py-2.5"} ${to ? "cursor-pointer rounded-lg hover:bg-slate-50" : ""}`}
          >
            {timeline && <span className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-white bg-indigo-500 shadow" />}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-slate-700">{it.reportNumber}</span>
                <StatusBadge label={it.status} size="sm" />
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {showEmployee && it.employeeId ? <EmployeeLabel employeeId={it.employeeId} /> : it.title || "—"}
                {it.note && <span className="text-slate-400"> · {it.note}</span>}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-semibold tabular-nums text-slate-900">{formatMoney(it.amount, currency)}</p>
              <p className="text-[11px] text-slate-400">{timeAgo(it.at)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
