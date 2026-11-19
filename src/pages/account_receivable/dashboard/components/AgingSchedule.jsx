import { AlertTriangle, ShieldAlert } from "lucide-react";

import DashboardCard from "./DashboardCard";
import { formatAmounts, formatPercent, pluralize } from "../utils/dashboardFormatters";
import { AGING_BUCKET_COLORS } from "../utils/chartTheme";

/**
 * Open receivables by days since invoice date. Each row carries its label,
 * invoice count and per-currency amounts as text; the bar is supplementary.
 * When more than one currency is open the bar shows share of invoices
 * (amounts in different currencies can't be added up).
 */
export default function AgingSchedule({ buckets, unknownDateCount = 0, critical, className = "" }) {
  const currencies = new Set(buckets.flatMap((b) => b.amounts.map((a) => a.currencyCode)));
  const byAmount = currencies.size === 1;
  const value = (b) => (byAmount ? Number(b.amounts[0]?.amount) || 0 : b.count);
  const total = buckets.reduce((sum, b) => sum + value(b), 0);
  const empty = buckets.every((b) => b.count === 0);

  return (
    <DashboardCard
      title="AR Aging"
      description={`Open receivables by days since invoice date${byAmount ? "" : " (bars show share of invoices)"}.`}
      icon={AlertTriangle}
      className={className}
      bodyClassName="flex flex-1 flex-col p-4 sm:p-5"
    >
      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">No open receivables</p>
          <p className="text-xs text-slate-500">Invoices appear here once they are sent to the client.</p>
        </div>
      ) : (
        <ul className="mb-5 space-y-3.5">
          {buckets.map((bucket) => {
            const share = total ? (value(bucket) / total) * 100 : 0;
            return (
              <li key={bucket.key}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="shrink-0 font-medium text-slate-700">{bucket.label}</span>
                  <span className="flex min-w-0 items-baseline gap-2 tabular-nums">
                    <span className="shrink-0 text-[11px] text-slate-500">{pluralize(bucket.count, "invoice")}</span>
                    <span className="truncate font-semibold text-slate-900" title={formatAmounts(bucket.amounts)}>
                      {formatAmounts(bucket.amounts)}
                    </span>
                  </span>
                </div>
                <div
                  role="meter"
                  aria-label={`${bucket.label} share of open ${byAmount ? "balance" : "invoices"}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(share)}
                  aria-valuetext={formatPercent(share)}
                  className="mt-1.5 flex items-center gap-2"
                >
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${share}%`, backgroundColor: AGING_BUCKET_COLORS[bucket.key] || "#64748b" }}
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
      )}

      {unknownDateCount > 0 ? (
        <p className="mb-3 text-[11px] text-slate-500">
          {pluralize(unknownDateCount, "invoice")} without an invoice date can’t be aged.
        </p>
      ) : null}

      {critical?.count > 0 ? (
        <div
          role="note"
          className="mt-auto flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <p>
            <span className="font-semibold">
              {pluralize(critical.count, "invoice")} over {critical.days} days past due
            </span>
            {critical.clientNames?.length ? ` — ${critical.clientNames.join(", ")}` : ""}.
          </p>
        </div>
      ) : null}
    </DashboardCard>
  );
}
