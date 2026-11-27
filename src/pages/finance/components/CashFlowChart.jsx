import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";
import FinanceSectionCard from "./FinanceSectionCard";
import { formatInrCompact, formatInrFull } from "../utils/financeFormatters";

// Brand pair: navy (primary) + magenta (secondary) — distinct in hue and lightness.
const CASH_COLORS = { inflow: "#0A0082", outflow: "#B83280" };

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-600">
      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: color }} aria-hidden="true" />
      {label}
    </span>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const inflow = payload.find((p) => p.dataKey === "inflow")?.value ?? 0;
  const outflow = payload.find((p) => p.dataKey === "outflow")?.value ?? 0;
  const net = inflow - outflow;
  return (
    <div className="min-w-[180px] rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="mb-2 font-semibold text-slate-900">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5 text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-medium text-slate-900">{formatInrFull(p.value)}</span>
        </p>
      ))}
      <p className="mt-2 flex items-center justify-between gap-4 border-t border-slate-100 pt-2 font-semibold">
        <span className="text-slate-600">Net</span>
        <span className={net >= 0 ? "text-emerald-700" : "text-red-600"}>{formatInrCompact(net, { signed: true })}</span>
      </p>
    </div>
  );
}

export default function CashFlowChart({ data, onOpen, className = "" }) {
  const totalIn = data.reduce((s, d) => s + d.inflow, 0);
  const totalOut = data.reduce((s, d) => s + d.outflow, 0);

  return (
    <FinanceSectionCard
      title="Cash Inflow vs Outflow"
      subtitle={`Inflow ${formatInrCompact(totalIn)} · Outflow ${formatInrCompact(totalOut)}`}
      icon={TrendingUp}
      className={className}
      action={
        <div className="flex items-center gap-3">
          <LegendDot color={CASH_COLORS.inflow} label="Inflow" />
          <LegendDot color={CASH_COLORS.outflow} label="Outflow" />
          {onOpen && (
            <button
              type="button"
              onClick={onOpen}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0A0082] transition hover:bg-[#0A0082]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40"
            >
              View report →
            </button>
          )}
        </div>
      }
    >
      <div className="h-48" role="img" aria-label="Bar chart comparing monthly cash inflow and outflow">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={6} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="#eef2f7" strokeDasharray="4 4" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} dy={6} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => formatInrCompact(v)} />
            <Tooltip cursor={{ fill: "rgba(10,0,130,0.04)", radius: 8 }} content={<ChartTooltip />} />
            <Bar dataKey="inflow" name="Cash Inflow" fill={CASH_COLORS.inflow} radius={[6, 6, 0, 0]} maxBarSize={20} />
            <Bar dataKey="outflow" name="Cash Outflow" fill={CASH_COLORS.outflow} radius={[6, 6, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Illustrative trend; production figures should come from consolidated finance APIs.</p>
    </FinanceSectionCard>
  );
}
