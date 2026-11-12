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
      <div className="flex flex-col items-center gap-2 py-8 text-center" data-donut="empty">
        <PieChart className="h-8 w-8 text-slate-300" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-600">No claimed expenses yet</p>
        <p className="text-xs text-slate-400">Submitted expense reports will appear here, by category.</p>
      </div>
    );
  }

  const single = positive.length === 1;
  let offset = 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-500" data-donut="period">
        Period: <span className="font-medium text-slate-700">{period}</span>
      </p>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="relative h-44 w-44 shrink-0">
          <svg
            viewBox="0 0 160 160"
            className="-rotate-90"
            role="img"
            aria-label={`Reimbursement by category, total ${formatMoney(centreTotal, currency)}`}
          >
            <circle cx="80" cy="80" r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth="20" />
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
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Claimed</p>
            <p className="px-3 text-sm font-bold tabular-nums text-slate-900" data-donut="centre">
              {formatMoney(centreTotal, currency)}
            </p>
          </div>
        </div>

        <ul className="w-full min-w-0 space-y-2.5" aria-label="Categories">
          {positive.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-sm" data-legend={s.key}>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: categoryColor(s) }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-slate-700" title={s.label}>
                {s.label}
              </span>
              <span className="whitespace-nowrap tabular-nums text-slate-900">{formatMoney(s.amount, currency)}</span>
              <span className="w-12 text-right text-xs tabular-nums text-slate-500">{formatShare(s.amount / sum)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
