import React from "react";
import { PieChart } from "lucide-react";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";
import { categoryColor } from "./categoryColors";

// Claimed amount by category. Each slice's share is of the sum of the slices, so the ring always closes at 100%.
// The centre shows the claimed total (the backend's figure, passed in as `claimed`). Colour comes from the category
// name, so the same category keeps the same colour on every visit.

const RADIUS = 56;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const formatShare = (share) => {
  const pct = Math.round(share * 100);
  if (share > 0 && pct === 0) return "<1%";
  return `${pct}%`;
};

export default function CategoryDonut({ slices, currency, claimed = null, period = "All time" }) {
  const positive = (slices || [])
    .map((s) => ({ ...s, amount: Number(s.amount) || 0 }))
    .filter((s) => s.amount > 0);
  const sum = positive.reduce((acc, s) => acc + s.amount, 0);
  const centreTotal = claimed !== null && claimed !== undefined && Number(claimed) > 0 ? Number(claimed) : sum;

  if (sum <= 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-gradient-to-b from-slate-50 to-white px-4 py-8 text-center" data-donut="empty">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff3d72]/10 text-[#ff3d72]">
          <PieChart className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-[#0a174e]">No claimed expenses yet</p>
        <p className="max-w-xs text-xs text-slate-500">Once you submit an expense report, your spend by category will appear here.</p>
      </div>
    );
  }

  const single = positive.length === 1;
  let offset = 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#0A0082]/5 px-3 py-1 text-xs text-slate-600" data-donut="period">
        <span className="h-1.5 w-1.5 rounded-full bg-[#0A0082]" aria-hidden="true" />
        Period: <span className="font-semibold text-[#0a174e]">{period}</span>
      </p>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="relative h-48 w-48 shrink-0">
          <svg
            viewBox="0 0 160 160"
            className="-rotate-90"
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
                stroke={categoryColor(positive[0])}
                strokeWidth="20"
                data-slice={positive[0].key}
                strokeDasharray={`${CIRCUMFERENCE} 0`}
              />
            ) : (
              positive.map((s) => {
                const length = (s.amount / sum) * CIRCUMFERENCE;
                const el = (
                  <circle
                    key={s.key}
                    cx="80"
                    cy="80"
                    r={RADIUS}
                    fill="none"
                    stroke={categoryColor(s)}
                    strokeWidth="20"
                    data-slice={s.key}
                    strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += length;
                return el;
              })
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Claimed</p>
            <p className="px-2 text-xs font-bold tabular-nums text-[#0a174e] sm:text-sm" data-donut="centre">
              {formatMoney(centreTotal, currency)}
            </p>
          </div>
        </div>

        <ul className="w-full min-w-0 space-y-1" aria-label="Categories">
          {positive.map((s) => (
            <li
              key={s.key}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm transition-colors hover:bg-slate-50"
              data-legend={s.key}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full ring-4 ring-white shadow-sm"
                style={{ background: categoryColor(s) }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate font-medium text-slate-700" title={s.label}>
                {s.label}
              </span>
              <span className="whitespace-nowrap tabular-nums text-slate-900">{formatMoney(s.amount, currency)}</span>
              <span
                className="w-14 rounded-full bg-slate-100 py-0.5 text-center text-[11px] font-semibold tabular-nums text-slate-600"
              >
                {formatShare(s.amount / sum)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
