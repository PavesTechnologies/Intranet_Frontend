import React from "react";
import { AlertCircle, ChevronRight, Clock } from "lucide-react";
import { formatMoney } from "@/pages/expense-management/pages/cash-advance/cashAdvanceDisplay";
import { usageShares } from "@/pages/expense-management/pages/cash-advance/settlementFigures";

/**
 * "Where the advance money went" for a list of advances, read in three parts:
 *  1. the pipeline the cash moved through (requested → approved → disbursed → owed),
 *  2. how the owed amount was used, as one stacked bar with a legend,
 *  3. the total still outstanding, highlighted on the right.
 * {@code totals} is the summed figures the Settlement page already computes; nothing is recalculated here
 * except percentages for display.
 */
export default function AdvanceMoneyOverview({ totals, loading = false }) {
  const money = (v) => formatMoney(v);
  const owed = totals.owed || 0;
  const share = (v) => (owed > 0 ? Math.round((Math.max(0, v) / owed) * 100) : 0);
  const s = usageShares(totals);
  const recovered = totals.salaryDeducted + totals.otherRepaid;
  const reduced = totals.requested - totals.approved;

  const pipeline = [
    { label: "Requested", value: totals.requested, note: "Asked for by employees" },
    { label: "Approved", value: totals.approved, note: reduced > 0 ? `${money(reduced)} less than asked` : "By Finance" },
    { label: "Disbursed", value: totals.disbursed, note: "Cash paid out" },
    { label: "Owed", value: owed, note: totals.carriedIn > 0 ? `incl. ${money(totals.carriedIn)} brought in` : "Disbursed + brought in", strong: true },
  ];

  const usage = [
    { key: "spent", label: "Consumed by expenses", value: totals.consumed, pct: s.spent, dot: "bg-sky-500", text: "text-sky-700" },
    {
      key: "recovered",
      label: "Recovered",
      value: recovered,
      pct: s.recovered,
      dot: "bg-emerald-500",
      text: "text-emerald-700",
      note: `${money(totals.salaryDeducted)} salary · ${money(totals.otherRepaid)} repaid`,
    },
    {
      key: "carried",
      label: "Carried forward",
      value: totals.carriedForward,
      pct: s.carried,
      dot: "bg-violet-500",
      text: "text-violet-700",
      note: totals.moved > 0 ? `${money(totals.moved)} into a later advance` : null,
    },
    { key: "outstanding", label: "Outstanding on advances", value: totals.outstandingOnAdvances, pct: s.outstanding, dot: "bg-amber-400", text: "text-amber-700" },
  ];

  const owing = totals.outstanding > 0;

  return (
    <section aria-label="Money summary" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 px-5 py-3.5">
        <h2 className="text-sm font-bold text-[#0a174e]">Where the advance money went</h2>
        <p className="text-[11px] text-gray-500">
          {totals.count} advance{totals.count === 1 ? "" : "s"} on this list
          {loading ? " · loading figures…" : ""}
        </p>
      </div>

      {/* 1. Pipeline: how much moved through each step */}
      <ol className="grid grid-cols-2 border-b border-gray-100 bg-[#F8F9FD] md:grid-cols-4">
        {pipeline.map((step, i) => (
          <li key={step.label} className="relative px-5 py-3.5">
            {i > 0 && (
              <ChevronRight
                size={16}
                aria-hidden="true"
                className="absolute -left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-[#F8F9FD] text-gray-300 md:block"
              />
            )}
            <p className="text-[11px] font-medium text-gray-500">{step.label}</p>
            <p className={`mt-0.5 tabular-nums ${step.strong ? "text-lg font-bold text-[#0a174e]" : "text-base font-semibold text-gray-900"}`}>
              {money(step.value)}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-gray-400" title={step.note}>{step.note}</p>
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-3">
        {/* 2. How the owed amount was used */}
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-gray-700">
              How the owed <span className="tabular-nums text-[#0a174e]">{money(owed)}</span> was used
            </p>
            <p className="text-[11px] text-gray-500">
              Balance (owed − consumed): <span className="font-semibold tabular-nums text-gray-800">{money(totals.remaining)}</span>
            </p>
          </div>

          {owed > 0 ? (
            <>
              <div
                className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-gray-100"
                role="img"
                aria-label={usage.map((u) => `${Math.round(u.pct)}% ${u.label.toLowerCase()}`).join(", ")}
              >
                {usage.map((u) => (
                  <div key={u.key} className={`${u.dot} transition-all`} style={{ width: `${u.pct}%` }} />
                ))}
              </div>

              <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {usage.map((u) => (
                  <li key={u.key} className="flex items-start gap-2.5">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${u.dot}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs text-gray-600">{u.label}</span>
                        <span className="text-[11px] tabular-nums text-gray-400">{share(u.value)}%</span>
                      </div>
                      <p className={`text-sm font-semibold tabular-nums ${u.value > 0 ? u.text : "text-gray-400"}`}>{money(u.value)}</p>
                      {u.note && <p className="text-[11px] text-gray-400">{u.note}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400">
              Nothing disbursed yet. Usage appears once cash is paid out.
            </p>
          )}
        </div>

        {/* 3. What is still to recover */}
        <div className={`flex flex-col rounded-xl border p-4 ${owing ? "border-amber-200 bg-amber-50/60" : "border-emerald-200 bg-emerald-50/50"}`}>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            <Clock size={13} className={owing ? "text-amber-600" : "text-emerald-600"} aria-hidden="true" />
            Total outstanding
          </p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${owing ? "text-amber-700" : "text-emerald-700"}`}>{money(totals.outstanding)}</p>
          <p className="text-[11px] text-gray-500">{owing ? "Not yet deducted from salary or repaid" : "Everything is recovered"}</p>

          <dl className="mt-3 space-y-1.5 border-t border-black/5 pt-3 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-gray-600">On advances</dt>
              <dd className="font-semibold tabular-nums text-gray-900">{money(totals.outstandingOnAdvances)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-600">Carried forward, held</dt>
              <dd className="font-semibold tabular-nums text-gray-900">{money(totals.held)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {totals.owedToEmployee > 0 && (
        <p className="mx-5 mb-5 flex items-start gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-800">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          Expenses exceed the advance on some rows: the company owes employees {money(totals.owedToEmployee)} in reimbursement.
        </p>
      )}
    </section>
  );
}
