import { HandCoins, FileText, Receipt, IndianRupee, ArrowUp, ArrowDown } from "lucide-react";
import { formatInrCompact } from "../utils/financeFormatters";

function TrendLine({ trend, fallback }) {
  if (!trend) return fallback ? <p className="mt-1 text-[11px] font-medium text-emerald-600">{fallback}</p> : null;
  const up = trend.changePct >= 0;
  const good = up === trend.goodWhenUp;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <p className={`mt-1 flex items-center gap-0.5 text-[11px] font-medium ${good ? "text-emerald-600" : "text-orange-600"}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {Math.abs(trend.changePct)}% {trend.note}
    </p>
  );
}

export default function FinanceKpiCards({ kpis, trends = {} }) {
  const net = kpis.netCashFlow;
  const cards = [
    { id: "totalReceivables", title: "Total Receivables", value: formatInrCompact(kpis.totalReceivables), Icon: HandCoins, chip: "bg-indigo-50 text-indigo-600" },
    { id: "totalPayables", title: "Total Payables", value: formatInrCompact(kpis.totalPayables), Icon: FileText, chip: "bg-orange-50 text-orange-500" },
    { id: "totalExpenses", title: "Total Expenses", value: formatInrCompact(kpis.totalExpenses), Icon: Receipt, chip: "bg-pink-50 text-pink-500" },
    {
      id: "netCashFlow",
      title: "Net Cash Flow",
      value: formatInrCompact(net, { signed: true }),
      Icon: IndianRupee,
      chip: "bg-emerald-50 text-emerald-600",
      fallback: net >= 0 ? "Positive cash movement" : "Negative cash movement",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ id, title, value, Icon, chip, fallback }) => (
        <div key={id} className="flex h-full items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${chip}`}>
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">{title}</p>
            <p className="mt-1 text-2xl font-bold leading-tight text-gray-900">{value}</p>
            <TrendLine trend={id === "netCashFlow" ? null : trends[id]} fallback={fallback} />
          </div>
        </div>
      ))}
    </div>
  );
}
