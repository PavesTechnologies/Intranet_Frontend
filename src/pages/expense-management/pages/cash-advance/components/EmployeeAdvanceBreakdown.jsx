import React from "react";
import { Users, X } from "lucide-react";
import { formatMoney } from "@/pages/expense-management/pages/cash-advance/cashAdvanceDisplay";
import { settlementTotals, usageShares } from "@/pages/expense-management/pages/cash-advance/settlementFigures";
import { UsageBar } from "@/pages/expense-management/pages/cash-advance/components/AdvanceRowDetails";

/** Stable key for the employee who owns an advance: their id, or their name when no id is present. */
export const employeeKeyOf = (adv, name) =>
  String(adv?.employeeId ?? adv?.employee_id ?? adv?.userId ?? adv?.user_id ?? name ?? "").trim().toLowerCase();

/**
 * Groups advances by employee and sums each group's figures with the same settlementTotals the overview card uses,
 * so one employee's row adds up exactly like the all-employee card. Sorted by total outstanding, highest first.
 */
export function employeeBreakdown(advances, { figuresOf, nameOf }) {
  const groups = new Map();
  advances.forEach((adv) => {
    const name = nameOf(adv);
    const key = employeeKeyOf(adv, name);
    if (!groups.has(key)) groups.set(key, { key, name, figures: [] });
    groups.get(key).figures.push(figuresOf(adv));
  });
  return [...groups.values()]
    .map(({ key, name, figures }) => ({ key, name, totals: settlementTotals(figures) }))
    .sort((a, b) => b.totals.outstanding - a.totals.outstanding || a.name.localeCompare(b.name));
}

/**
 * "By employee": one row per employee for the advances on the list. Clicking a row narrows the overview card and the
 * advance list to that employee; clicking it again (or "Show all") clears the selection.
 */
export default function EmployeeAdvanceBreakdown({ rows, selectedKey = "", onSelect, loading = false }) {
  const money = (v) => formatMoney(v);
  const toggle = (key) => onSelect(selectedKey === key ? "" : key);

  return (
    <section aria-label="Advances by employee" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 px-5 py-3.5">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-[#0a174e]">
          <Users size={15} aria-hidden="true" />
          By employee
        </h2>
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span>
            {rows.length} employee{rows.length === 1 ? "" : "s"}
            {loading ? " · loading figures…" : ""}
          </span>
          {selectedKey && (
            <button
              type="button"
              onClick={() => onSelect("")}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-0.5 font-medium text-gray-600 hover:bg-gray-50"
            >
              <X size={11} aria-hidden="true" /> Show all
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-6 text-center text-xs text-gray-400">No advances on this list.</p>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="sticky top-0 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-2.5">Employee</th>
                <th className="px-4 py-2.5 text-right">Advances</th>
                <th className="px-4 py-2.5 text-right">Owed</th>
                <th className="px-4 py-2.5 text-right">Consumed</th>
                <th className="px-4 py-2.5 text-right">Recovered</th>
                <th className="px-5 py-2.5 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(({ key, name, totals: t }) => {
                const selected = key === selectedKey;
                const recovered = t.salaryDeducted + t.otherRepaid;
                return (
                  <tr
                    key={key}
                    onClick={() => toggle(key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggle(key);
                      }
                    }}
                    tabIndex={0}
                    aria-selected={selected}
                    title={selected ? "Show all employees" : `Show only ${name}'s advances`}
                    className={`cursor-pointer transition ${selected ? "bg-blue-50/70" : "hover:bg-gray-50/80"}`}
                  >
                    <td className="px-5 py-2.5 min-w-[11rem]">
                      <p className={`font-semibold ${selected ? "text-blue-800" : "text-gray-900"}`}>{name}</p>
                      {t.owed > 0 && (
                        <div className="mt-1 flex items-center gap-2">
                          <div className="w-28"><UsageBar figures={t} /></div>
                          <span className="text-[10px] text-gray-500">{Math.round(usageShares(t).spent)}% used</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{t.count}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-900 whitespace-nowrap">{money(t.owed)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-sky-700 whitespace-nowrap">{money(t.consumed)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700 whitespace-nowrap">{money(recovered)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-bold whitespace-nowrap">
                      <span className={t.outstanding > 0 ? "text-amber-700" : "text-emerald-600"}>{money(t.outstanding)}</span>
                      {t.held > 0 && <p className="text-[10px] font-medium text-violet-700">incl. {money(t.held)} carried forward</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
