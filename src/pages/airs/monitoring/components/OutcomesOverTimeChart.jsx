import React, { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Outcome states use the status palette (good / warning / critical; pending is neutral), always with
// their label in the legend and the tooltip, and the table view - never color alone.
const SERIES = [
  { key: "PASS", label: "Pass", color: "#0ca30c" },
  { key: "HOLD", label: "Hold", color: "#fab219" },
  { key: "REJECT", label: "Reject", color: "#d03b3b" },
  { key: "PENDING", label: "Pending", color: "#9ca3af" },
];
const SURFACE = "#ffffff";

function mergePeriods(series) {
  const byPeriod = {};
  series.forEach((campaign) => (campaign.periods || []).forEach((p) => {
    const row = byPeriod[p.period] || (byPeriod[p.period] = { period: p.period, total: 0 });
    SERIES.forEach(({ key }) => { row[key] = (row[key] || 0) + (p[key] || 0); });
    row.total += p.total || 0;
  }));
  return Object.values(byPeriod).sort((a, b) => a.period.localeCompare(b.period));
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-semibold text-slate-800">{label}</p>
      {SERIES.filter((s) => row[s.key]).map((s) => (
        <p key={s.key} className="flex items-center gap-2 text-slate-700">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
          {s.label}: <span className="font-semibold">{row[s.key]}</span>
        </p>
      ))}
      <p className="mt-1 text-slate-500">Total {row.total}</p>
    </div>
  );
}

// Decided screening outcomes (results acted on) per day or week, for the chosen campaign or all of them.
export default function OutcomesOverTimeChart({ series, bucket }) {
  const [asTable, setAsTable] = useState(false);
  const rows = useMemo(() => mergePeriods(series || []), [series]);
  const shown = SERIES.filter((s) => rows.some((r) => r[s.key]));
  const top = shown[shown.length - 1]?.key;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-[11px] font-bold text-slate-600">Outcomes per {bucket === "week" ? "week" : "day"}</h4>
        <div className="flex items-center gap-3">
          <ul className="flex flex-wrap gap-3" aria-label="Legend">
            {shown.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
                {s.label}
              </li>
            ))}
          </ul>
          <button type="button" className="text-[11px] font-semibold text-blue-600 hover:underline"
            onClick={() => setAsTable((v) => !v)}>
            {asTable ? "Show chart" : "Show table"}
          </button>
        </div>
      </div>
      {!rows.length ? <p className="text-xs text-slate-400">No decided outcomes in this period.</p> : asTable ? (
        <table className="w-full text-xs">
          <thead><tr className="text-left text-[10px] uppercase text-slate-400">
            <th className="py-1 pr-3">Period</th>
            {SERIES.map((s) => <th key={s.key} className="py-1 pr-3 text-right">{s.label}</th>)}
            <th className="py-1 text-right">Total</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.period} className="border-t border-slate-100 text-slate-700">
                <td className="py-1 pr-3">{r.period}</td>
                {SERIES.map((s) => <td key={s.key} className="py-1 pr-3 text-right tabular-nums">{r[s.key] || 0}</td>)}
                <td className="py-1 text-right font-semibold tabular-nums">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows} margin={{ left: 0, right: 8, top: 4 }} barCategoryGap="30%">
            <CartesianGrid stroke="#E6E9F0" vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#5B6472" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#5B6472" }} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F1F5F9" }} />
            {shown.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} stackId="outcomes" fill={s.color}
                stroke={SURFACE} strokeWidth={2} maxBarSize={28} radius={s.key === top ? [4, 4, 0, 0] : 0} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
