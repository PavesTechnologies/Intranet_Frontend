import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

import DashboardCard from "./DashboardCard";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { formatPercent } from "../utils/dashboardFormatters";
import { BILLING_MODEL_COLORS, TOOLTIP_STYLE } from "../utils/chartTheme";

/** Revenue share by billing model: donut plus a text legend listing every value. */
export default function BillingModelChart({ models, formatMoney, className = "" }) {
  const reducedMotion = usePrefersReducedMotion();
  const total = models.reduce((sum, m) => sum + m.amount, 0);

  return (
    <DashboardCard
      title="Revenue by Billing Model"
      description="Contribution by rate model configured in the project wizard."
      icon={PieChartIcon}
      className={className}
    >
      <div className="relative mx-auto h-48 w-full max-w-[240px]" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={models}
              dataKey="share"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={84}
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
              isAnimationActive={!reducedMotion}
            >
              {models.map((m) => (
                <Cell key={m.key} fill={BILLING_MODEL_COLORS[m.key]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name, entry) => [
                `${formatPercent(value)} · ${formatMoney(entry.payload.amount)}`,
                name,
              ]}
              contentStyle={TOOLTIP_STYLE}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-slate-500">Total</span>
          <span className="text-sm font-bold tabular-nums text-slate-900">{formatMoney(total)}</span>
        </div>
      </div>

      <ul className="mt-4 space-y-2 text-xs">
        {models.map((m) => (
          <li key={m.key} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: BILLING_MODEL_COLORS[m.key] }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-slate-700" title={m.name}>
              {m.name}
            </span>
            <span className="shrink-0 tabular-nums text-slate-500">{formatMoney(m.amount)}</span>
            <span className="w-10 shrink-0 text-right font-semibold tabular-nums text-slate-900">
              {formatPercent(m.share)}
            </span>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
