import { AlertTriangle, ShieldAlert } from "lucide-react";

import DashboardCard from "./DashboardCard";
import { formatPercent } from "../utils/dashboardFormatters";
import { AGING_RISK_COLORS } from "../utils/chartTheme";

/**
 * Outstanding balance by delinquency bucket. Each row carries its label,
 * invoice count, amount and share as text; the bar is supplementary.
 */
export default function AgingSchedule({ buckets, formatMoney, className = "" }) {
  const total = buckets.reduce((sum, b) => sum + b.amount, 0) || 1;

  return (
    <DashboardCard
      title="AR Aging & Delinquency"
      description="Outstanding balance by days past invoice date."
      icon={AlertTriangle}
      className={className}
      bodyClassName="flex flex-1 flex-col p-4 sm:p-5"
    >
      <ul className="mb-5 space-y-3.5">
        {buckets.map((bucket) => {
          const share = (bucket.amount / total) * 100;
          return (
            <li key={bucket.key}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="min-w-0 truncate font-medium text-slate-700">{bucket.label}</span>
                <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                  <span className="text-[11px] text-slate-500">
                    {bucket.count} {bucket.count === 1 ? "invoice" : "invoices"}
                  </span>
                  <span className="font-semibold text-slate-900">{formatMoney(bucket.amount)}</span>
                </span>
              </div>
              <div
                role="meter"
                aria-label={`${bucket.label} share of outstanding balance`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(share)}
                aria-valuetext={formatPercent(share)}
                className="mt-1.5 flex items-center gap-2"
              >
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${share}%`, backgroundColor: AGING_RISK_COLORS[bucket.risk] }}
                  />
                </span>
                <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-slate-500">
                  {formatPercent(share)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div
        role="note"
        className="mt-auto flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"
      >
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
        <p>
          <span className="font-semibold">Dunning rule triggered:</span> 2 enterprise accounts past 60 days are
          flagged for finance escalation.
        </p>
      </div>
    </DashboardCard>
  );
}
