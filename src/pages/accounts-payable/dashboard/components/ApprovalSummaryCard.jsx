import React from "react";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { formatNumber } from "../../utils/formatters";

export default function ApprovalSummaryCard({ summary }) {
  if (!summary) return null;
  const totalAge = summary.byAge.reduce((sum, bucket) => sum + bucket.count, 0) || 1;

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className={Fonts.subheading}>Approval Summary</h3>
      <p className="mt-2 text-2xl font-bold text-slate-800">
        {formatNumber(summary.pendingTotal)} <span className="text-sm font-medium text-slate-500">pending</span>
      </p>
      <p className="text-xs text-slate-400">Avg. turnaround {summary.avgTurnaroundDays} days</p>

      <div className="mt-3 space-y-1.5">
        {summary.byTier.map((tier) => (
          <div key={tier.tier} className="flex items-center justify-between border-b border-dashed border-gray-100 py-1.5 text-sm">
            <span className="text-slate-500">{tier.tier} · {tier.range}</span>
            <span className="font-bold text-slate-700">{tier.count}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="bg-emerald-500" style={{ width: `${(summary.byAge[0].count / totalAge) * 100}%` }} />
        <div className="bg-amber-500" style={{ width: `${(summary.byAge[1].count / totalAge) * 100}%` }} />
        <div className="bg-red-500" style={{ width: `${(summary.byAge[2].count / totalAge) * 100}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {summary.byAge.map((bucket) => (
          <span key={bucket.bucket}>{bucket.bucket} ({bucket.count})</span>
        ))}
      </div>
    </div>
  );
}
