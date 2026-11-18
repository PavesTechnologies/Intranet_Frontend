import React, { useState } from "react";
import { Lightbulb, PieChart } from "lucide-react";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";
import { categoryColor } from "./categoryColors";
import EmptyPanel, { GhostDonut } from "./EmptyPanel";

// Claimed amount by category. Each slice's share is of the sum of the slices, so the ring always closes at 100%.
// The centre shows the claimed total (the backend's figure, passed in as `claimed`); hovering or focusing a slice or a
// category row shows that category instead. Colour comes from the category name, so the same category keeps the same
// colour on every visit. Below the ring, every category is listed by size with its amount, share, expense count and
// average per expense, so the chart never relies on colour alone.

const RADIUS = 56;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 2; // surface gap between slices, in ring units

export const formatShare = (share) => {
  const pct = Math.round(share * 100);
  if (share > 0 && pct === 0) return "<1%";
  return `${pct}%`;
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// One sentence on where the money goes, built only from the slices shown.
function insight(sorted, sum) {
  const top = sorted[0];
  const topShare = top.amount / sum;
  if (sorted.length === 1) return `All of it is ${top.label}.`;
  const two = (sorted[0].amount + sorted[1].amount) / sum;
  if (topShare >= 0.5) return `${top.label} is more than half of the total, at ${formatShare(topShare)}.`;
  if (sorted.length > 2 && two >= 0.6)
    return `${sorted[0].label} and ${sorted[1].label} together make up ${formatShare(two)} of the total.`;
  return `Spread fairly evenly: the largest, ${top.label}, is ${formatShare(topShare)} of the total.`;
}

export default function CategoryDonut({ slices, currency, claimed = null, period = "All time", emptyActions = [] }) {
  const [active, setActive] = useState(null);

  const positive = (slices || [])
    .map((s) => ({ ...s, amount: Number(s.amount) || 0, count: Number(s.count) || 0 }))
    .filter((s) => s.amount > 0);
  const sum = positive.reduce((acc, s) => acc + s.amount, 0);
  const centreTotal = claimed !== null && claimed !== undefined && Number(claimed) > 0 ? Number(claimed) : sum;

  if (sum <= 0) {
    return (
      <EmptyPanel
        icon={PieChart}
        tone="pink"
        title="No claimed expenses yet"
        text="Once you submit an expense report, your spend by category will appear here: each category's amount, its share of the total, how many expenses it holds and the average per expense."
        preview={<GhostDonut />}
        steps={["Pick a category per expense", "Submit the report", "See where your money goes"]}
        actions={emptyActions}
        data-donut="empty"
      />
    );
  }

  // Largest first; "Other" (the backend's roll-up) always last.
  const sorted = [...positive].sort((a, b) => (a.key === "other") - (b.key === "other") || b.amount - a.amount);
  const single = sorted.length === 1;
  const expenses = sorted.reduce((acc, s) => acc + s.count, 0);
  const focused = sorted.find((s) => s.key === active) || null;
  const hoverProps = (key) => ({
    onMouseEnter: () => setActive(key),
    onMouseLeave: () => setActive(null),
    onFocus: () => setActive(key),
    onBlur: () => setActive(null),
  });

  let offset = 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#0A0082]/5 px-3 py-1 text-xs text-slate-600" data-donut="period">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0A0082]" aria-hidden="true" />
          Period: <span className="font-semibold text-[#0a174e]">{period}</span>
        </p>
        <p className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600" data-donut="summary">
          {sorted.length} {sorted.length === 1 ? "category" : "categories"}
          {expenses > 0 && <> · {plural(expenses, "expense")} · avg {formatMoney(sum / expenses, currency)}</>}
        </p>
      </div>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="relative h-44 w-44 shrink-0">
          <svg
            viewBox="0 0 160 160"
            className="-rotate-90 overflow-visible"
            role="img"
            aria-label={`Reimbursement by category, total ${formatMoney(centreTotal, currency)}`}
          >
            <circle cx="80" cy="80" r={RADIUS} fill="none" stroke="#f1f5fb" strokeWidth="20" />
            {single ? (
              <circle
                cx="80"
                cy="80"
                r={RADIUS}
                fill="none"
                stroke={categoryColor(sorted[0])}
                strokeWidth="20"
                data-slice={sorted[0].key}
                strokeDasharray={`${CIRCUMFERENCE} 0`}
                {...hoverProps(sorted[0].key)}
              />
            ) : (
              sorted.map((s) => {
                const length = (s.amount / sum) * CIRCUMFERENCE;
                const drawn = Math.max(length - GAP, 0.75);
                const dim = focused && focused.key !== s.key;
                const el = (
                  <circle
                    key={s.key}
                    cx="80"
                    cy="80"
                    r={RADIUS}
                    fill="none"
                    stroke={categoryColor(s)}
                    strokeWidth={focused?.key === s.key ? 24 : 20}
                    data-slice={s.key}
                    strokeDasharray={`${drawn} ${CIRCUMFERENCE - drawn}`}
                    strokeDashoffset={-offset}
                    className="cursor-pointer transition-all duration-200"
                    style={{ opacity: dim ? 0.3 : 1 }}
                    {...hoverProps(s.key)}
                  >
                    <title>{`${s.label}: ${formatMoney(s.amount, currency)} (${formatShare(s.amount / sum)})`}</title>
                  </circle>
                );
                offset += length;
                return el;
              })
            )}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            {focused ? (
              <>
                <p className="line-clamp-2 text-[11px] font-semibold text-slate-500">{focused.label}</p>
                <p className="text-sm font-bold tabular-nums text-[#0a174e]">{formatMoney(focused.amount, currency)}</p>
                <p className="text-[11px] tabular-nums text-slate-400">{formatShare(focused.amount / sum)} of total</p>
              </>
            ) : (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Claimed</p>
                <p className="text-sm font-bold tabular-nums text-[#0a174e]" data-donut="centre">
                  {formatMoney(centreTotal, currency)}
                </p>
                {expenses > 0 && <p className="text-[11px] text-slate-400">{plural(expenses, "expense")}</p>}
              </>
            )}
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-3">
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900" data-donut="insight">
            <Lightbulb size={15} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
            <span>{insight(sorted, sum)}</span>
          </p>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 px-2 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Largest</p>
              <p className="truncate text-xs font-bold tabular-nums text-[#0a174e]" title={sorted[0].label}>
                {formatMoney(sorted[0].amount, currency)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-2 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Per category</p>
              <p className="text-xs font-bold tabular-nums text-[#0a174e]">{formatMoney(sum / sorted.length, currency)}</p>
            </div>
          </div>
        </div>
      </div>

      <ul className="space-y-1" aria-label="Categories">
        {sorted.map((s, i) => {
          const color = categoryColor(s);
          const share = s.amount / sum;
          const isActive = focused?.key === s.key;
          return (
            <li
              key={s.key}
              tabIndex={0}
              className={`rounded-xl px-2.5 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/30 ${
                isActive ? "bg-[#0A0082]/[0.04]" : "hover:bg-slate-50"
              }`}
              data-legend={s.key}
              {...hoverProps(s.key)}
            >
              <div className="flex items-center gap-2.5 text-sm">
                <span className="h-3 w-3 shrink-0 rounded-full ring-4 ring-white shadow-sm" style={{ background: color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 break-words font-medium text-slate-700" title={s.label}>
                  {s.label}
                </span>
                <span className="whitespace-nowrap font-semibold tabular-nums text-[#0a174e]">{formatMoney(s.amount, currency)}</span>
                <span className="w-12 rounded-full bg-slate-100 py-0.5 text-center text-[11px] font-semibold tabular-nums text-slate-600">
                  {formatShare(share)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-3 pl-[22px]">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(share * 100, 1)}%`, background: color }} />
                </div>
                {s.count > 0 && (
                  <span className="whitespace-nowrap text-[11px] tabular-nums text-slate-400">
                    {plural(s.count, "expense")} · avg {formatMoney(s.amount / s.count, currency)}
                  </span>
                )}
                {i === 0 && sorted.length > 1 && (
                  <span className="rounded-full bg-[#ff3d72]/10 px-2 py-0.5 text-[10px] font-semibold text-[#d81b5a]">Top</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
