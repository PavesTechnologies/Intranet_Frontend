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
      className={`relative flex min-w-0 flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0082] via-[#14108f] to-[#263383] p-5 text-white shadow-lg shadow-[#0A0082]/20 ${className}`}
    >
      {/* Decorative glows */}
      <span className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#B83280]/30 blur-3xl" aria-hidden="true" />
      <span className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            </span>
            Financial Snapshot
          </h2>
          <p className="mb-4 mt-1.5 text-sm text-white/70">Your consolidated financial overview</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(reportsRoute)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-[#0A0082] shadow-sm transition hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          View Reports
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <dl className="relative mt-auto grid grid-cols-3 divide-x divide-white/15 rounded-xl bg-white/10 py-4 ring-1 ring-white/10 backdrop-blur-sm">
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
