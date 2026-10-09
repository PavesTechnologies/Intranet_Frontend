import React, { useState } from "react";
import { Inbox } from "lucide-react";
import { ACCENT, CHROME, formatMoney } from "@/pages/expense-management/components/dashboard/dashboardTheme";

/**
 * Ranked horizontal bars (one hue, length relative to the largest row) with amount, share of
 * `total` and count. `shareBy` picks whether the share is of amount or of count.
 */
export function RankedList({ rows, currency, total, shareBy = "amount", countNoun = "items", limit = 10, empty = "Nothing in this period." }) {
  const [expanded, setExpanded] = useState(false);
  if (!rows?.length) {
    return (
      <div className="flex min-h-[120px] flex-col items-center justify-center gap-1.5 text-center">
        <Inbox className="h-6 w-6 text-slate-300" />
        <p className="text-xs text-slate-400">{empty}</p>
      </div>
    );
  }

  const value = (r) => Number(shareBy === "count" ? r.count : r.amount) || 0;
  const denominator = Number(total) > 0 ? Number(total) : rows.reduce((s, r) => s + value(r), 0);
  const max = Math.max(...rows.map(value), 1);
  const shown = expanded ? rows : rows.slice(0, limit);

  return (
    <div>
      <ul className="space-y-3">
        {shown.map((r) => {
          const share = denominator > 0 ? (value(r) / denominator) * 100 : 0;
          return (
            <li key={r.key}>
              <div className="mb-1 flex items-baseline gap-3 text-xs">
                <span className="min-w-0 flex-1 truncate text-slate-700" title={r.label}>
                  {r.label}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-slate-900">{formatMoney(r.amount, currency)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max((value(r) / max) * 100, 2)}%`, background: r.key === "unassigned" ? CHROME.axis : ACCENT }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-slate-500">
                  {share < 1 && share > 0 ? "<1" : Math.round(share)}%
                </span>
                <span className="w-20 shrink-0 text-right text-[11px] tabular-nums text-slate-400">
                  {Number(r.count || 0).toLocaleString("en-IN")} {countNoun}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {rows.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-xs font-medium text-[#0A0082] hover:underline"
        >
          {expanded ? `Show top ${limit}` : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
}

function Bone({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />;
}

export function ReportSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading report">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <Bone className="h-3 w-24" />
            <Bone className="mt-3 h-7 w-32" />
            <Bone className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <Bone className="h-4 w-40" />
        <Bone className="mt-4 h-[240px] w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <Bone className="h-4 w-32" />
            {Array.from({ length: 4 }).map((__, j) => (
              <Bone key={j} className="h-6 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
