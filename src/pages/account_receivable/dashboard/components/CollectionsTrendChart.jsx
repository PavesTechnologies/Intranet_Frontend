import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";

import DashboardCard from "./DashboardCard";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { CHART_COLORS, TOOLTIP_STYLE } from "../utils/chartTheme";

const SERIES = [
  { key: "invoiced", label: "Invoiced", color: CHART_COLORS.invoiced, swatch: "solid" },
  { key: "collected", label: "Cash Realized", color: CHART_COLORS.collected, swatch: "solid" },
  { key: "projected", label: "Projected", color: CHART_COLORS.projected, swatch: "dashed" },
];

const SERIES_LABEL = Object.fromEntries(SERIES.map((s) => [s.key, s.label]));

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Chart legend">
      {SERIES.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block w-4 border-t-2"
            style={{ borderColor: s.color, borderStyle: s.swatch }}
          />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

export default function CollectionsTrendChart({ data, money, className = "" }) {
  const reducedMotion = usePrefersReducedMotion();
  const first = data[0];
  const last = data[data.length - 1];

  return (
    <DashboardCard
      title="Invoicing & Cash Realization Trend"
      description="Monthly invoiced amount against collected cash and the projected trajectory."
      icon={BarChart3}
      actions={<Legend />}
      className={className}
    >
      <p className="sr-only">
        From {first.period} to {last.period}, invoicing grew from {money.format(first.invoiced)} to{" "}
        {money.format(last.invoiced)} and collections grew from {money.format(first.collected)} to{" "}
        {money.format(last.collected)}.
      </p>

      <div className="h-72 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="arInvoicedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.invoiced} stopOpacity={0.18} />
                <stop offset="95%" stopColor={CHART_COLORS.invoiced} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="arCollectedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.collected} stopOpacity={0.18} />
                <stop offset="95%" stopColor={CHART_COLORS.collected} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={{ stroke: CHART_COLORS.grid }}
              tick={{ fontSize: 12, fill: CHART_COLORS.axis }}
            />
            <YAxis
              width={64}
              tickLine={false}
              axisLine={false}
              tickFormatter={money.compact}
              tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            />
            <Tooltip
              formatter={(value, name) => [money.format(value), SERIES_LABEL[name] || name]}
              contentStyle={TOOLTIP_STYLE}
            />
            <Area
              type="monotone"
              dataKey="invoiced"
              stroke={CHART_COLORS.invoiced}
              strokeWidth={2.5}
              fill="url(#arInvoicedFill)"
              isAnimationActive={!reducedMotion}
            />
            <Area
              type="monotone"
              dataKey="collected"
              stroke={CHART_COLORS.collected}
              strokeWidth={2.5}
              fill="url(#arCollectedFill)"
              isAnimationActive={!reducedMotion}
            />
            <Area
              type="monotone"
              dataKey="projected"
              stroke={CHART_COLORS.projected}
              strokeWidth={2}
              strokeDasharray="6 4"
              fill="none"
              isAnimationActive={!reducedMotion}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Screen-reader equivalent of the chart. */}
      <table className="sr-only">
        <caption>Monthly invoiced, collected and projected amounts</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            {SERIES.map((s) => (
              <th key={s.key} scope="col">{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.period}>
              <th scope="row">{row.period}</th>
              {SERIES.map((s) => (
                <td key={s.key}>{money.format(row[s.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </DashboardCard>
  );
}
