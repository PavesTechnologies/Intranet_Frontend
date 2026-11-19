import { Scale, ChevronRight } from "lucide-react";
import FinanceSectionCard from "./FinanceSectionCard";
import ClickTarget from "./ClickTarget";
import { formatInrCompact } from "../utils/financeFormatters";

/**
 * Outstanding receivables vs payables comparison (from the shared `kpis` object).
 * Each bar links to its module only when `links.ar` / `links.ap` is set.
 */
export default function PayablesReceivables({ kpis, links = {}, className = "" }) {
  const { totalReceivables, totalPayables } = kpis;
  const max = Math.max(totalReceivables, totalPayables, 1);
  const net = totalReceivables - totalPayables;
  const bars = [
    { label: "Receivables", hint: "From customers", value: totalReceivables, color: "bg-[#0A0082]", to: links.ar },
    { label: "Payables", hint: "To vendors", value: totalPayables, color: "bg-[#B83280]", to: links.ap },
  ];

  return (
    <FinanceSectionCard title="Payables & Receivables" subtitle="Outstanding balances" icon={Scale} className={className}>
      <div className="-mx-2 space-y-1">
        {bars.map((b) => (
          <ClickTarget key={b.label} to={b.to} label={`Open ${b.label}`} className="rounded-xl px-2 py-1.5" clickableClassName="cursor-pointer hover:bg-slate-50">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-700">
                {b.label} <span className="font-normal text-slate-400">· {b.hint}</span>
              </span>
              <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                {formatInrCompact(b.value)}
                {b.to && <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-[#0A0082]" aria-hidden="true" />}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className={`h-2 rounded-full ${b.color}`} style={{ width: `${(b.value / max) * 100}%` }} />
            </div>
          </ClickTarget>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
          <p className="text-[11px] text-slate-500">Net working position</p>
          <p className={`text-base font-semibold ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatInrCompact(net, { signed: true })}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
          <p className="text-[11px] text-slate-500">Coverage ratio</p>
          <p className="text-base font-semibold text-slate-900">
            {totalPayables > 0 ? `${(totalReceivables / totalPayables).toFixed(2)}×` : "—"}
          </p>
        </div>
      </div>
    </FinanceSectionCard>
  );
}
