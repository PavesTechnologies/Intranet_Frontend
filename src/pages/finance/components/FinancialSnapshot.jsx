import { useNavigate } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
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
      className={`flex min-w-0 flex-col rounded-xl bg-gradient-to-br from-[#3b2bb0] via-[#4338ca] to-[#5b4fe8] p-5 text-white shadow-md ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          <LayoutGrid className="h-4 w-4 opacity-90" aria-hidden="true" />
          Financial Snapshot
        </h2>
        <button
          type="button"
          onClick={() => navigate(reportsRoute)}
          className="rounded-md bg-white/20 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/30"
        >
          View Reports
        </button>
      </div>
      <p className="mt-3 text-center text-sm font-medium text-white/90">Your consolidated financial overview</p>
      <dl className="mt-4 grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-white/10 px-3 py-2 text-center">
            <dd className="text-base font-bold">{s.value}</dd>
            <dt className="mt-0.5 text-[11px] text-white/75">{s.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
