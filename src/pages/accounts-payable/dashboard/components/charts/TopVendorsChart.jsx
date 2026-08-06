import React from "react";
import { PageCard } from "../../../../../components/Cards/PageCard";
import { Fonts } from "../../../../../components/Fonts/Fonts";
import { formatCompactCurrency } from "../../../utils/formatters";

export default function TopVendorsChart({ data = [] }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <PageCard className="p-4">
      <h3 className={Fonts.subheading}>Top Vendors by Outstanding Spend</h3>
      <p className="mb-3 text-xs text-slate-400">Top {data.length} vendors, open payables</p>
      <div className="space-y-2.5">
        {data.map((item) => (
          <div key={item.vendor} className="flex items-center gap-3">
            <span className="w-36 shrink-0 truncate text-xs text-slate-600">{item.vendor}</span>
            <div className="h-3.5 flex-1 rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
            <span className="w-14 shrink-0 text-right text-xs font-semibold text-slate-700">{formatCompactCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </PageCard>
  );
}
