import { HandCoins, FileText, Receipt, IndianRupee, ArrowUp, ArrowDown } from "lucide-react";
import ClickTarget from "./ClickTarget";
import { formatInrCompact } from "../utils/financeFormatters";

const TONES = {
  navy: "bg-[#0A0082]/[0.07] text-[#0A0082]",
  magenta: "bg-[#B83280]/[0.08] text-[#B83280]",
};

function Badge({ good, children }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
        good ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
      }`}
    >
      {children}
    </span>
  );
}

function TrendRow({ trend, fallback, positive }) {
  if (!trend) {
    if (!fallback) return null;
    const [first, ...rest] = fallback.split(" ");
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-xs">
        <Badge good={positive}>{first}</Badge>
        <span className="truncate text-slate-500">{rest.join(" ")}</span>
      </span>
    );
  }
  const up = trend.changePct >= 0;
  const good = up === trend.goodWhenUp;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs">
      <Badge good={good}>
        <Icon className="h-3 w-3" aria-hidden="true" />
        {Math.abs(trend.changePct)}%
      </Badge>
      <span className="truncate text-slate-500">{trend.note}</span>
    </span>
  );
}

/**
 * KPI cards. `links` maps card id → route; a card is clickable only when a
 * route is given (the dashboard passes one only if the user's role allows it).
 */
export default function FinanceKpiCards({ kpis, trends = {}, links = {} }) {
  const net = kpis.netCashFlow;
  const cards = [
    { id: "totalReceivables", title: "Total Receivables", value: formatInrCompact(kpis.totalReceivables), Icon: HandCoins, tone: "navy" },
    { id: "totalPayables", title: "Total Payables", value: formatInrCompact(kpis.totalPayables), Icon: FileText, tone: "magenta" },
    { id: "totalExpenses", title: "Total Expenses", value: formatInrCompact(kpis.totalExpenses), Icon: Receipt, tone: "navy" },
    {
      id: "netCashFlow",
      title: "Net Cash Flow",
      value: formatInrCompact(net, { signed: true }),
      Icon: IndianRupee,
      tone: "magenta",
      fallback: net >= 0 ? "Positive cash movement" : "Negative cash movement",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ id, title, value, Icon, tone, fallback }) => (
        <ClickTarget
          key={id}
          to={links[id]}
          label={`Open ${title}`}
          className="h-full rounded-xl border border-slate-200 bg-white p-4"
          clickableClassName="cursor-pointer hover:border-[#0A0082]/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</p>
              <p className="mt-2 font-heading text-2xl font-semibold leading-none tracking-tight text-slate-900">{value}</p>
            </div>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-3">
            <TrendRow trend={id === "netCashFlow" ? null : trends[id]} fallback={fallback} positive={net >= 0} />
          </div>
        </ClickTarget>
      ))}
    </div>
  );
}
