import { HandCoins, FileText, Receipt, IndianRupee, ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import ClickTarget from "./ClickTarget";
import { formatInrCompact } from "../utils/financeFormatters";

const TONES = {
  navy: { chip: "bg-[#0A0082] text-white shadow-[#0A0082]/25", glow: "bg-[#0A0082]/[0.06]" },
  magenta: { chip: "bg-[#B83280] text-white shadow-[#B83280]/25", glow: "bg-[#B83280]/[0.07]" },
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
          className="relative h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_-8px_rgba(15,23,42,0.08)]"
          clickableClassName="cursor-pointer duration-200 hover:-translate-y-0.5 hover:border-[#0A0082]/25 hover:shadow-[0_12px_28px_-12px_rgba(10,0,130,0.22)]"
        >
          <span className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full ${TONES[tone].glow}`} aria-hidden="true" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</p>
              <p className="mt-2 font-heading text-2xl font-semibold leading-none tracking-tight text-slate-900">{value}</p>
            </div>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md ${TONES[tone].chip}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          <div className="relative mt-3 flex items-center justify-between gap-2">
            <TrendRow trend={id === "netCashFlow" ? null : trends[id]} fallback={fallback} positive={net >= 0} />
            {links[id] && (
              <ArrowRight
                className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#0A0082]"
                aria-hidden="true"
              />
            )}
          </div>
        </ClickTarget>
      ))}
    </div>
  );
}
