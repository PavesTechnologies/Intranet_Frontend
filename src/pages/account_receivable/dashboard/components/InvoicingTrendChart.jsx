import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";

import DashboardCard from "./DashboardCard";
import SegmentedControl from "./SegmentedControl";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { amountIn, currenciesIn, formatMoney, formatMoneyCompact, pluralize } from "../utils/dashboardFormatters";
import { CHART_COLORS, TOOLTIP_STYLE } from "../utils/chartTheme";

const monthLabel = (yyyyMm) => {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
};

/**
 * Monthly invoiced amount (rejected invoices excluded). One currency is
 * charted at a time; a switch appears when invoices span several currencies.
 */
export default function InvoicingTrendChart({ points, className = "" }) {
  const reducedMotion = usePrefersReducedMotion();
  const currencies = useMemo(() => currenciesIn(points.map((p) => p.invoiced)), [points]);
  const [picked, setPicked] = useState(null);
  const currency = currencies.includes(picked) ? picked : currencies[0];

  const data = points.map((p) => ({
    month: monthLabel(p.month),
    invoiced: currency ? amountIn(p.invoiced, currency) : 0,
    invoiceCount: p.invoiceCount,
  }));
  const totalInvoices = points.reduce((sum, p) => sum + p.invoiceCount, 0);

  return (
    <DashboardCard
      title="Invoicing Trend"
      description={`Amount invoiced per month over the last ${points.length} months.`}
      icon={BarChart3}
      className={className}
      actions={
        currencies.length > 1 ? (
          <SegmentedControl
            label="Chart currency"
            size="sm"
            value={currency}
            onChange={setPicked}
            options={currencies.map((c) => ({ value: c, label: c }))}
          />
        ) : null
      }
    >
      {totalInvoices === 0 ? (
        <div className="flex h-72 flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm font-medium text-slate-700">No invoices in the last {points.length} months</p>
          <p className="text-xs text-slate-500">Generated invoices will be charted here.</p>
        </div>
      ) : (
        <>
          <div className="h-72 w-full" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer={false}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: CHART_COLORS.grid }}
                  tick={{ fontSize: 12, fill: CHART_COLORS.axis }}
                />
                <YAxis
                  width={64}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatMoneyCompact(v, currency)}
                  tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(79,70,229,0.06)" }}
                  formatter={(value, _name, entry) => [
                    `${formatMoney(value, currency)} · ${pluralize(entry.payload.invoiceCount, "invoice")}`,
                    "Invoiced",
                  ]}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Bar
                  dataKey="invoiced"
                  fill={CHART_COLORS.invoiced}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={56}
                  isAnimationActive={!reducedMotion}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Screen-reader equivalent of the chart. */}
          <table className="sr-only">
            <caption>Amount invoiced per month in {currency}</caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Invoiced</th>
                <th scope="col">Invoices</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={points[i].month}>
                  <th scope="row">{points[i].month}</th>
                  <td>{formatMoney(row.invoiced, currency)}</td>
                  <td>{row.invoiceCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </DashboardCard>
  );
}
