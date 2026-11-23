import { useNavigate } from "react-router-dom";
import { LayoutGrid, ArrowUpRight } from "lucide-react";
import { formatInrCompact } from "../utils/financeFormatters";

/**
 * Hero panel for the consolidated position. Figures are derived from the same
 * `kpis` object as the KPI cards, so they never disagree.
 */
export default function FinancialSnapshot({ kpis, reportsRoute, className = "" }) {
  const navigate = useNavigate();
  const stats = [
    { label: "Net working position", value: formatInrCompact(kpis.totalReceivables - kpis.totalPayables, { signed: true }) },
    { label: "Net cash flow", value: formatInrCompact(kpis.netCashFlow, { signed: true }) },
    { label: "Total expenses", value: formatInrCompact(kpis.totalExpenses) },
  ];

  return (
    <section
      className={`relative flex min-w-0 flex-col overflow-hidden rounded-xl bg-[#0A0082] p-4 text-white ${className}`}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
            <LayoutGrid className="h-4 w-4 text-white/70" aria-hidden="true" />
            Financial Snapshot
          </h2>
          <p className="mb-4 mt-1 text-xs text-white/70">Your consolidated financial overview</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(reportsRoute)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#0A0082] transition hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          View Reports
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <dl className="relative mt-auto grid grid-cols-3 divide-x divide-white/15 rounded-lg bg-white/10 py-3">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse px-3 text-center">
            <dt className="mt-1 text-[10px] font-medium uppercase tracking-wide text-white/65 sm:text-[11px]">{s.label}</dt>
            <dd className="font-heading text-lg font-semibold sm:text-xl">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
