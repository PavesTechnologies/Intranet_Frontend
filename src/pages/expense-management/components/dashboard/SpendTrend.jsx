import React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";
import { TrendChart } from "./DashboardWidgets";

// The employee's spend per month (by expense date), from the backend's `trend`, with three summary figures
// worked out from the same points: this month and its change on last month, the period total, and the monthly average.

function Stat({ label, value, children }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-[#0a174e]">{value}</p>
      {children}
    </div>
  );
}

export default function SpendTrend({ points = [], currency }) {
  const values = points.map((p) => Number(p.primary) || 0);
  const total = values.reduce((a, b) => a + b, 0);
  const average = values.length ? total / values.length : 0;
  const current = values.at(-1) ?? 0;
  const previous = values.at(-2) ?? 0;
  const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
  const Arrow = change === null || change === 0 ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="flex flex-col gap-4" data-spend-trend>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="This month" value={formatMoney(current, currency)}>
          <p className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] text-slate-500">
            <Arrow size={12} aria-hidden="true" />
            {change === null ? "No spend last month" : `${change > 0 ? "+" : ""}${change}% vs last month`}
          </p>
        </Stat>
        <Stat label={`${points.length}-month total`} value={formatMoney(total, currency)} />
        <Stat label="Monthly average" value={formatMoney(average, currency)} />
      </div>
      <TrendChart points={points} currency={currency} mode="money" primaryLabel="Spend" countLabel="Expenses" />
    </div>
  );
}
