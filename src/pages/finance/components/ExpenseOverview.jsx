import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import FinanceSectionCard from "./FinanceSectionCard";
import { formatInrCompact, formatInrFull } from "../utils/financeFormatters";

// Brand-led 4-slot palette (fixed order). Amber is below 3:1 on white, which is
// why every slice is also labelled with name, amount and % beside it.
const CATEGORY_COLORS = ["#0A0082", "#B83280", "#6366f1", "#f59e0b"];

export default function ExpenseOverview({ categories, onExplore, className = "" }) {
  const total = categories.reduce((s, c) => s + c.amount, 0);
  const rows = categories.map((c, i) => ({
    ...c,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    pct: total ? Math.round((c.amount / total) * 100) : 0,
  }));

  return (
    <FinanceSectionCard title="Expense Overview" subtitle="Spend by category" icon={PieIcon} linkLabel={onExplore ? "Explore" : undefined} onLinkClick={onExplore} className={className}>
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <div className="relative h-32 w-32 shrink-0" role="img" aria-label="Donut chart of expenses by category">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={rows} dataKey="amount" nameKey="label" innerRadius="72%" outerRadius="100%" paddingAngle={2} cornerRadius={4} stroke="none">
                {rows.map((r) => (
                  <Cell key={r.id} fill={r.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [formatInrFull(value), name]}
                contentStyle={{ fontSize: 12, borderRadius: 12, borderColor: "#e2e8f0", boxShadow: "0 8px 24px rgba(15,23,42,0.1)" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Total</span>
            <span className="font-heading text-lg font-bold text-slate-900">{formatInrCompact(total)}</span>
          </div>
        </div>

        <ul className="w-full min-w-0 space-y-2.5">
          {rows.map((r) => (
            <li key={r.id}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: r.color }} aria-hidden="true" />
                  <span className="truncate text-slate-700" title={`${r.label} · ${formatInrFull(r.amount)}`}>
                    {r.label}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">
                  <span className="text-slate-500">{formatInrCompact(r.amount)}</span>
                  <span className="ml-2 inline-block w-8 text-right font-semibold text-slate-900">{r.pct}%</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${r.pct}%`, backgroundColor: r.color }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </FinanceSectionCard>
  );
}
