import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import FinanceSectionCard from "./FinanceSectionCard";
import { formatInrCompact, formatInrFull } from "../utils/financeFormatters";

// Validated categorical pair (CVD-safe, ≥3:1 contrast on white).
const CASH_COLORS = { inflow: "#4361ee", outflow: "#10a37f" };

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {label}
    </span>
  );
}

export default function CashFlowChart({ data, className = "" }) {
  return (
    <FinanceSectionCard
      title="Cash Inflow vs Outflow"
      accent="bg-indigo-600"
      className={className}
      action={
        <div className="flex items-center gap-3">
          <LegendDot color={CASH_COLORS.inflow} label="Inflow" />
          <LegendDot color={CASH_COLORS.outflow} label="Outflow" />
        </div>
      }
    >
      <div className="h-56" role="img" aria-label="Bar chart comparing monthly cash inflow and outflow">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 4, left: 0, bottom: 0 }} barGap={4} barCategoryGap="34%">
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v) => formatInrCompact(v)}
            />
            <Tooltip
              cursor={{ fill: "rgba(67,97,238,0.06)" }}
              formatter={(value, name) => [formatInrFull(value), name]}
              contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e5e7eb" }}
            />
            <Bar dataKey="inflow" name="Cash Inflow" fill={CASH_COLORS.inflow} radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar dataKey="outflow" name="Cash Outflow" fill={CASH_COLORS.outflow} radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] text-gray-400">
        Illustrative trend; production figures should come from consolidated finance APIs.
      </p>
    </FinanceSectionCard>
  );
}
