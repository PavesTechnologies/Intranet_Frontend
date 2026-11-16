import FinanceSectionCard from "./FinanceSectionCard";
import { formatInrCompact } from "../utils/financeFormatters";

/** Outstanding receivables vs payables comparison (from the shared `kpis` object). */
export default function PayablesReceivables({ kpis, className = "" }) {
  const { totalReceivables, totalPayables } = kpis;
  const max = Math.max(totalReceivables, totalPayables, 1);
  const net = totalReceivables - totalPayables;
  const bars = [
    { label: "Receivables", hint: "Outstanding from customers", value: totalReceivables, color: "bg-[#4361ee]" },
    { label: "Payables", hint: "Outstanding to vendors", value: totalPayables, color: "bg-orange-500" },
  ];

  return (
    <FinanceSectionCard title="Payables & Receivables" accent="bg-orange-500" className={className}>
      <div className="flex-1 space-y-3">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-gray-700">
                {b.label} <span className="font-normal text-gray-400">· {b.hint}</span>
              </span>
              <span className="text-sm font-bold text-gray-900">{formatInrCompact(b.value)}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100">
              <div className={`h-2 rounded-full ${b.color}`} style={{ width: `${(b.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <p className="text-[11px] text-gray-500">Net working position</p>
          <p className={`text-base font-bold ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatInrCompact(net, { signed: true })}
          </p>
          <p className="text-[10px] text-gray-400">Receivables − payables</p>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <p className="text-[11px] text-gray-500">Coverage ratio</p>
          <p className="text-base font-bold text-gray-900">
            {totalPayables > 0 ? `${(totalReceivables / totalPayables).toFixed(2)}×` : "—"}
          </p>
          <p className="text-[10px] text-gray-400">Receivables ÷ payables</p>
        </div>
      </div>
    </FinanceSectionCard>
  );
}
