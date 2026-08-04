import React from "react";
import { PageCard } from "../../../../../components/Cards/PageCard";
import { Fonts } from "../../../../../components/Fonts/Fonts";
import { formatNumber } from "../../../utils/formatters";

const COLORS = ["#2a78d6", "#008300", "#e87ba4", "#eda100", "#1baf7a", "#eb6834"];

export default function ExceptionBreakdownChart({ data = [] }) {
  const max = Math.max(...data.map((item) => item.count), 1);

  return (
    <PageCard className="p-4">
      <h3 className={Fonts.subheading}>Exceptions by Type</h3>
      <p className="mb-3 text-xs text-slate-400">Open exceptions, current period</p>
      <div className="space-y-2.5">
        {data.map((item, idx) => (
          <div key={item.type} className="flex items-center gap-3">
            <span className="w-36 shrink-0 truncate text-xs text-slate-600">{item.type}</span>
            <div className="h-3.5 flex-1 rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${(item.count / max) * 100}%`, backgroundColor: COLORS[idx % COLORS.length] }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-xs font-semibold text-slate-700">{formatNumber(item.count)}</span>
          </div>
        ))}
      </div>
    </PageCard>
  );
}
