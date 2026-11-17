import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

import DashboardCard from "./DashboardCard";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { formatAmounts, formatPercent, pluralize } from "../utils/dashboardFormatters";
import { BILLING_MODEL_PALETTE, TOOLTIP_STYLE } from "../utils/chartTheme";

/**
 * Invoices raised in the period by billing type: donut by invoice count
 * (amounts in different currencies can't be summed) plus a text legend with
 * every value.
 */
export default function BillingModelChart({ slices, periodLabel, className = "" }) {
  const reducedMotion = usePrefersReducedMotion();
  const total = slices.reduce((sum, s) => sum + s.count, 0);
  const data = slices.map((s, i) => ({
    ...s,
    share: total ? (s.count / total) * 100 : 0,
    color: BILLING_MODEL_PALETTE[i % BILLING_MODEL_PALETTE.length],
  }));

  return (
    <DashboardCard
      title="Invoices by Billing Model"
      description={`Invoices raised ${periodLabel.toLowerCase()}, by billing type.`}
      icon={PieChartIcon}
      className={className}
    >
      {total === 0 ? (
        <div className="flex flex-col items-center gap-1 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">No invoices in this period</p>
          <p className="text-xs text-slate-500">Try a longer period.</p>
        </div>
      ) : (
        <>
          <div className="relative mx-auto h-48 w-full max-w-[240px]" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="billingType"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={data.length > 1 ? 2 : 0}
                  stroke="#fff"
                  strokeWidth={data.length > 1 ? 2 : 0}
                  isAnimationActive={!reducedMotion}
                >
                  {data.map((s) => (
                    <Cell key={s.billingType} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, entry) => [
                    `${pluralize(value, "invoice")} · ${formatAmounts(entry.payload.amounts)}`,
                    name,
                  ]}
                  contentStyle={TOOLTIP_STYLE}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[11px] text-slate-500">Invoices</span>
              <span className="text-lg font-bold tabular-nums text-slate-900">{total}</span>
            </div>
          </div>

          <ul className="mt-4 space-y-2 text-xs">
            {data.map((s) => (
              <li key={s.billingType} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-slate-700" title={s.billingType}>
                  {s.billingType}
                </span>
                <span className="max-w-[45%] shrink-0 truncate tabular-nums text-slate-500" title={formatAmounts(s.amounts)}>
                  {formatAmounts(s.amounts)}
                </span>
                <span className="w-10 shrink-0 text-right font-semibold tabular-nums text-slate-900">
                  {formatPercent(s.share)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardCard>
  );
}
