import React from "react";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { formatNumber } from "../../utils/formatters";

export default function ExceptionSummaryCard({ summary }) {
  if (!summary) return null;

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className={Fonts.subheading}>Exception Summary</h3>
      <p className="mt-2 text-2xl font-bold text-slate-800">
        {formatNumber(summary.openTotal)} <span className="text-sm font-medium text-slate-500">open</span>
      </p>
      <p className="text-xs text-slate-400">
        {summary.byType.length} exception types · oldest {summary.oldestDays} days
      </p>

      <div className="mt-3 space-y-1.5">
        {summary.byType.map((item) => (
          <div key={item.type} className="flex items-center justify-between border-b border-dashed border-gray-100 py-1.5 text-sm">
            <span className="text-slate-500">{item.type}</span>
            <span className="font-bold text-slate-700">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
