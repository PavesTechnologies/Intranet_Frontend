import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import FinanceSectionCard from "./FinanceSectionCard";
import { formatInrCompact, formatInrFull } from "../utils/financeFormatters";

// Validated 4-slot categorical palette (fixed order). Amber is below 3:1 on
// white, which is why every slice is also labelled with name + % beside it.
const CATEGORY_COLORS = ["#4361ee", "#10a37f", "#e8a317", "#8b6fd6"];

export default function ExpenseOverview({ categories, onExplore, className = "" }) {
  const total = categories.reduce((s, c) => s + c.amount, 0);
  const rows = categories.map((c, i) => ({
    ...c,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    pct: total ? Math.round((c.amount / total) * 100) : 0,
  }));

  return (
    <FinanceSectionCard title="Expense Overview" accent="bg-emerald-500" linkLabel="Explore" onLinkClick={onExplore} className={className}>
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <div className="relative h-32 w-32 shrink-0" role="img" aria-label="Donut chart of expenses by category">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={rows} dataKey="amount" nameKey="label" innerRadius="70%" outerRadius="100%" paddingAngle={1} stroke="#ffffff" strokeWidth={2}>
                {rows.map((r) => (
                  <Cell key={r.id} fill={r.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [formatInrFull(value), name]} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e5e7eb" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-bold text-gray-900">{formatInrCompact(total)}</span>
            <span className="text-[10px] text-gray-500">Total expenses</span>
          </div>
        </div>

        <ul className="w-full min-w-0 space-y-2.5">
          {rows.map((r) => (
            <li key={r.id}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate text-gray-700" title={`${r.label} · ${formatInrFull(r.amount)}`}>
                  {r.label}
                </span>
                <span className="font-semibold text-gray-900">{r.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100">
                <div className="h-1.5 rounded-full" style={{ width: `${r.pct}%`, backgroundColor: r.color }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </FinanceSectionCard>
  );
}
