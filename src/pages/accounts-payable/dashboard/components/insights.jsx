/**
 * Shared building blocks for the AP Finance dashboard and Reports page. Deliberately built on the
 * Expense Management dashboard's own pieces — StatCard, ChartCard, Ranking and the validated
 * dashboardTheme palette/formatters — so both modules read as one product. Chart rules: one money
 * axis, a legend whenever there are 2+ series, a tooltip on every mark, status color only with a
 * label, categorical hues in fixed order.
 */
import { useId } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Inbox } from "lucide-react";
import clsx from "clsx";
import StatCard from "../../../../components/Cards/StatCard";
import {
  ChartCard,
  Ranking,
} from "../../../expense-management/components/dashboard/DashboardWidgets";
import {
  ACCENT,
  CHROME,
  ORDINAL_BLUE,
  SERIES,
  formatMoney,
} from "../../../expense-management/components/dashboard/dashboardTheme";

export { ChartCard, Ranking, formatMoney, SERIES, ACCENT };

const TONE_TEXT = {
  indigo: "text-indigo-700",
  blue: "text-blue-700",
  emerald: "text-emerald-700",
  amber: "text-amber-700",
  rose: "text-rose-700",
  gray: "text-slate-800",
};

export const axisProps = {
  tick: { fill: CHROME.muted, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: CHROME.axis },
};

export function formatKpi(kpi, currency = "INR") {
  if (kpi.value === null || kpi.value === undefined) return "—";
  if (kpi.format === "money") return formatMoney(kpi.value, kpi.currency_code || currency);
  if (kpi.format === "percent") return `${Number(kpi.value).toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`;
  if (kpi.format === "days") return `${Number(kpi.value).toLocaleString("en-IN", { maximumFractionDigits: 1 })} d`;
  return Number(kpi.value).toLocaleString("en-IN");
}

/** StatCard with the Expense dashboard's tone mapping; clickable when the KPI carries a link. */
export function KpiTile({ kpi, icon, currency }) {
  const navigate = useNavigate();
  const others = kpi.other_currencies?.filter((o) => Number(o.amount) > 0) || [];
  const subtitle = [kpi.subtitle, others.length ? `+ ${others.map((o) => formatMoney(o.amount, o.currency_code)).join(", ")}` : null]
    .filter(Boolean)
    .join(" · ");
  const card = (
    <StatCard title={kpi.label} value={formatKpi(kpi, currency)} subtitle={subtitle} textColor={TONE_TEXT[kpi.tone] || TONE_TEXT.gray} icon={icon} />
  );
  // Equal-height tiles in a row whether or not they are clickable.
  if (!kpi.link) return <div className="h-full [&>div]:h-full">{card}</div>;
  return (
    <button
      type="button"
      onClick={() => navigate(kpi.link)}
      className="h-full rounded-xl text-left transition hover:-translate-y-px hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40 [&>div]:h-full"
      aria-label={`${kpi.label}: ${formatKpi(kpi, currency)} — open`}
    >
      {card}
    </button>
  );
}

export function Empty({ text = "Nothing here yet." }) {
  return (
    <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-1.5 text-center">
      <Inbox className="h-6 w-6 text-slate-300" />
      <p className="text-xs text-slate-400">{text}</p>
    </div>
  );
}

export function TooltipBox({ title, rows }) {
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

const legendProps = { iconType: "circle", iconSize: 8, wrapperStyle: { fontSize: 11, color: "#52514e", paddingTop: 4 } };

/**
 * Money over time on one axis. `series`: [{key, label, color}] — 1 series needs no legend (the card
 * title names it); 2+ get a legend. `countKey`/`countLabel` add an item count to the tooltip.
 */
const fmtValue = (v, format, currency, compact = false) =>
  format === "count" ? Number(v || 0).toLocaleString("en-IN") : formatMoney(v, currency, { compact });

export function MoneyAreaChart({ points, series, currency = "INR", height = 240, countKeys = {}, format = "money" }) {
  const gradientBase = useId().replace(/:/g, "");
  const hasData = points?.some((p) => series.some((s) => Number(p[s.key]) > 0));
  if (!hasData) return <Empty text="No amounts in this period." />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`${gradientBase}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={series.length > 1 ? 0.16 : 0.22} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke={CHROME.grid} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} axisLine={false} width={format === "count" ? 36 : 64} allowDecimals={format !== "count"} tickFormatter={(v) => fmtValue(v, format, currency, true)} />
        <Tooltip
          cursor={{ stroke: CHROME.axis, strokeWidth: 1 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload;
            const rows = series.map((s) => [s.label, fmtValue(p[s.key], format, currency), s.color]);
            Object.entries(countKeys).forEach(([key, text]) => rows.push([text, p[key] ?? 0]));
            return <TooltipBox title={label} rows={rows} />;
          }}
        />
        {series.length > 1 && <Legend {...legendProps} />}
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#${gradientBase}-${s.key})`}
            dot={{ r: 3, fill: s.color, stroke: CHROME.surface, strokeWidth: 2 }}
            activeDot={{ r: 5, fill: s.color, stroke: CHROME.surface, strokeWidth: 2 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Stacked money columns (part-to-whole per period) with a 2px surface gap between segments. */
export function StackedMoneyBars({ points, series, currency = "INR", height = 240, onBarClick, format = "money", countLabel = "Invoices" }) {
  const hasData = points?.some((p) => series.some((s) => Number(p[s.key]) > 0));
  if (!hasData) return <Empty text={format === "count" ? "Nothing in this period." : "Nothing due."} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={points} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={CHROME.grid} />
        <XAxis dataKey="label" {...axisProps} interval={0} />
        <YAxis {...axisProps} axisLine={false} width={format === "count" ? 36 : 64} allowDecimals={format !== "count"} tickFormatter={(v) => fmtValue(v, format, currency, true)} />
        <Tooltip
          cursor={{ fill: "rgba(42,120,214,0.06)" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload;
            const total = series.reduce((sum, s) => sum + Number(p[s.key] || 0), 0);
            return (
              <TooltipBox
                title={label}
                rows={[
                  ...series.map((s) => [s.label, fmtValue(p[s.key], format, currency), s.color]),
                  ["Total", fmtValue(total, format, currency)],
                  ...(format === "money" && p.count != null ? [[countLabel, p.count]] : []),
                ]}
              />
            );
          }}
        />
        <Legend {...legendProps} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="stack"
            fill={s.color}
            stroke={CHROME.surface}
            strokeWidth={2}
            radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            onClick={onBarClick ? (d) => onBarClick(d.payload) : undefined}
            cursor={onBarClick ? "pointer" : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Ageing columns, one measure (money): light -> dark blue as the delay grows (ordinal ramp), "not
 * yet due" and "unverified" in recessive neutrals so color never implies a status on its own — the
 * x-axis labels carry the meaning.
 */
export function AgeingColumns({ buckets, currency = "INR", height = 220 }) {
  const total = buckets.reduce((s, b) => s + Number(b.amount || 0), 0);
  if (!total) return <Empty text="Nothing approved and unpaid." />;
  const ramp = [ORDINAL_BLUE[0], ORDINAL_BLUE[1], ORDINAL_BLUE[2], ORDINAL_BLUE[3], ORDINAL_BLUE[4]];
  let overdueIndex = 0;
  const colorFor = (b) => {
    if (b.kind === "not_due") return "#cbd5e1";
    if (b.kind === "unverified") return CHROME.axis;
    return ramp[Math.min(overdueIndex++, ramp.length - 1)];
  };
  const colored = buckets.map((b) => ({ ...b, fill: colorFor(b) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={colored} margin={{ top: 16, right: 8, left: 4, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke={CHROME.grid} />
        <XAxis dataKey="short" {...axisProps} interval={0} />
        <YAxis {...axisProps} axisLine={false} width={56} tickFormatter={(v) => formatMoney(v, currency, { compact: true })} />
        <Tooltip
          cursor={{ fill: "rgba(42,120,214,0.06)" }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox
                title={payload[0].payload.label}
                rows={[["Outstanding", formatMoney(payload[0].payload.amount, currency)], ["Invoices", payload[0].payload.count ?? 0]]}
              />
            ) : null
          }
        />
        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
          {colored.map((b) => (
            <Cell key={b.label} fill={b.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Pill-shaped period presets, same look as the Expense Reports page. */
export function PresetPills({ presets, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Period presets">
      {presets.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          aria-pressed={value === p.value}
          className={clsx(
            "rounded-full border px-3 py-1 text-xs font-medium transition",
            value === p.value
              ? "border-[#0A0082] bg-[#0A0082] text-white shadow-sm"
              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/** Segmented tabs styled like the Expense dashboard's "My expenses | Finance" switcher. */
export function SegmentedTabs({ tabs, value, onChange, className }) {
  return (
    <div className={clsx("inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1", className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={clsx(
            "rounded-md px-3 py-1.5 text-sm font-medium transition",
            value === t.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
          )}
        >
          {t.label}
          {t.count != null && (
            <span className={clsx("ml-1.5 rounded-full px-1.5 text-xs", value === t.value ? "bg-[#0A0082]/10 text-[#0A0082]" : "bg-slate-200 text-slate-600")}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Native date input styled like the Expense Reports filter bar. */
export function DateField({ label, value, onChange, min, max, invalid }) {
  return (
    <label className="text-xs font-medium text-slate-600">
      {label}
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          "mt-1 block w-44 rounded-md border px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20",
          invalid ? "border-rose-400" : "border-slate-300",
        )}
      />
    </label>
  );
}
