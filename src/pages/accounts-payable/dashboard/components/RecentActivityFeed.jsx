import React from "react";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { formatCurrency, formatDateTime } from "../../utils/formatters";

const DOT_COLOR = {
  approval: "bg-emerald-500",
  payment: "bg-blue-500",
  inbound: "bg-slate-400",
  warning: "bg-amber-500",
  critical: "bg-red-500",
};

export default function RecentActivityFeed({ items = [] }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className={Fonts.subheading}>Recent Activity</h3>
      <div className="mt-3 divide-y divide-gray-100">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 py-2.5">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT_COLOR[item.type] || "bg-slate-300"}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-700">
                {item.text}
                {item.amount != null && <span className="font-semibold"> — {formatCurrency(item.amount)}</span>}
                {item.meta && <span className="text-slate-400"> · {item.meta}</span>}
              </p>
              <p className="text-xs text-slate-400">{formatDateTime(item.time)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
