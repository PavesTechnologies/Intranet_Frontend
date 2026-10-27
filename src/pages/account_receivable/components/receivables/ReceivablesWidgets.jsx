import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/**
 * Widgets for the Outstanding Receivables workspace: workflow strip, metric
 * cards, aging / client / trend charts, filters, export menu and numbered
 * pagination. Presentation only — the page passes every value in.
 */

/* --------------------------- Workflow strip --------------------------- */

export function WorkflowStepper({ steps, activeKey, onSelect }) {
  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <ol className="flex min-w-[960px] items-center gap-2 px-1">
        {steps.map((step, index) => {
          const active = step.key === activeKey;
          return (
            <li key={step.key} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => !active && onSelect?.(step)}
                aria-current={active ? "step" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-blue-300"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    active ? "bg-white/20 text-white" : step.tone || "bg-blue-50 text-blue-600"
                  }`}
                >
                  <step.icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold leading-tight">{step.label}</span>
              </button>
              {index < steps.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------------------------- Metric card ---------------------------- */

export function MetricCard({ label, value, hint, icon: Icon, iconClass = "bg-blue-50 text-blue-600", valueClass = "text-slate-900" }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-600">{label}</p>
        <p className={`mt-0.5 truncate text-xl font-bold tabular-nums ${valueClass}`} title={typeof value === "string" ? value : undefined}>
          {value}
        </p>
        {hint && <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

/* ------------------------------ Panels ------------------------------ */

export function ChartPanel({ title, action, className = "", children }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

const tooltipStyle = { borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)" };

/** Bars per aging bucket; the amount sits under each label as in the AR mockup. */
export function AgingChart({ rows, formatAmount, compactAmount }) {
  const data = rows.map((r) => ({ ...r, tick: r.shortLabel }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 18 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="tick"
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            interval={0}
            tick={({ x, y, payload, index }) => (
              <g transform={`translate(${x},${y})`}>
                <text dy={12} textAnchor="middle" fill="#475569" fontSize={11}>{payload.value}</text>
                <text dy={26} textAnchor="middle" fill="#94a3b8" fontSize={10}>({compactAmount(data[index]?.amount || 0)})</text>
              </g>
            )}
          />
          <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={compactAmount} />
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.12)" }}
            contentStyle={tooltipStyle}
            formatter={(value, _name, item) => [`${formatAmount(value)} · ${item.payload.count} invoice${item.payload.count === 1 ? "" : "s"}`, item.payload.label]}
            labelFormatter={() => ""}
          />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={56}>
            {data.map((r) => (
              <Cell key={r.key} fill={r.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut of outstanding balance by client with the total in the middle. */
export function ClientDonut({ slices, centerValue, formatAmount }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="#fff" strokeWidth={2}>
              {slices.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [formatAmount(value), name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-base font-bold tabular-nums text-slate-900">{centerValue}</span>
          <span className="text-[11px] text-slate-500">Outstanding</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="truncate text-slate-700" title={s.name}>{s.name}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">{total > 0 ? Math.round((s.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Billed vs received per month (two series, one axis). */
export function CollectionTrend({ data, formatAmount, compactAmount }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-blue-600" />Billed</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-emerald-600" />Received</span>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#e2e8f0" }} tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={compactAmount} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [formatAmount(value), name === "billed" ? "Billed" : "Received"]} />
            <Line type="monotone" dataKey="billed" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="received" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------------------------ Filters ------------------------------ */

/** Compact select matching the mockup's filter boxes. */
export function FilterSelect({ label, value, onChange, options, className = "" }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      {label && <span className="text-xs font-medium text-slate-500">{label}</span>}
      <span className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </span>
    </label>
  );
}

/** Invoice-date range in one box, like the mockup. */
export function DateRangeFilter({ from, to, onChange }) {
  return (
    <div className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white pl-2.5 pr-2 text-sm text-slate-700 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
      <input
        type="date"
        aria-label="Invoice date from"
        value={from}
        max={to || undefined}
        onChange={(e) => onChange({ from: e.target.value, to })}
        className="w-[7.5rem] border-0 bg-transparent p-0 text-sm focus:outline-none focus:ring-0"
      />
      <span className="text-slate-400">–</span>
      <input
        type="date"
        aria-label="Invoice date to"
        value={to}
        min={from || undefined}
        onChange={(e) => onChange({ from, to: e.target.value })}
        className="w-[7.5rem] border-0 bg-transparent p-0 text-sm focus:outline-none focus:ring-0"
      />
      <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
    </div>
  );
}

/** Split "Export" button with a small menu. items: { label, onClick, disabled }. */
export function ExportMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <Download className="h-4 w-4" /> Export
        <ChevronDown className="h-4 w-4 opacity-80" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1.5 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className="block w-full px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------- Pagination ---------------------------- */

/** Numbered pagination with a fixed page size. */
export function NumberedPagination({ page, pageSize, total, onPageChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // A compact window: first, last, and the pages around the current one.
  const numbers = [];
  for (let p = 1; p <= pages; p += 1) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) numbers.push(p);
    else if (numbers[numbers.length - 1] !== "…") numbers.push("…");
  }

  const btn = "flex h-8 min-w-[2rem] items-center justify-center rounded-md border px-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-500">
        Showing {from} to {to} of {total} entries
      </p>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        {numbers.map((n, i) =>
          n === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-slate-400">…</span>
          ) : (
            <button
              key={n}
              type="button"
              aria-current={n === page ? "page" : undefined}
              onClick={() => onPageChange(n)}
              className={`${btn} ${n === page ? "border-blue-600 bg-blue-600 font-semibold text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              {n}
            </button>
          )
        )}
        <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onPageChange(page + 1)} className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
