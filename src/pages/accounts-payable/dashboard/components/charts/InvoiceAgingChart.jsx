import React from "react";
import { PageCard } from "../../../../../components/Cards/PageCard";
import { Fonts } from "../../../../../components/Fonts/Fonts";
import { formatCurrency, formatNumber } from "../../../utils/formatters";

const BAR_COLORS = ["#b7d3f6", "#6da7ec", "#2a78d6", "#184f95"];

export default function InvoiceAgingChart({ data = [] }) {
  const maxCount = Math.max(...data.map((bucket) => bucket.count), 1);

  return (
    <PageCard className="p-4">
      <h3 className={Fonts.subheading}>Invoice Aging</h3>
      <p className="mb-3 text-xs text-slate-400">Open invoices by days outstanding</p>
      <div className="flex h-36 items-end gap-4">
        {data.map((bucket, idx) => (
          <div
            key={bucket.bucket}
            className="flex flex-1 flex-col items-center justify-end gap-1"
            title={`${bucket.bucket}: ${formatNumber(bucket.count)} invoices, ${formatCurrency(bucket.value)}`}
          >
            <span className={`text-xs font-semibold ${bucket.flag === "critical" ? "text-red-600" : "text-slate-600"}`}>
              {formatNumber(bucket.count)}
            </span>
            <div
              className="w-full rounded-t-md"
              style={{
                height: `${Math.max(6, (bucket.count / maxCount) * 130)}px`,
                backgroundColor: bucket.flag === "critical" ? "#d03b3b" : BAR_COLORS[idx] || BAR_COLORS[BAR_COLORS.length - 1],
              }}
            />
            <span className="text-xs text-slate-500">{bucket.bucket}</span>
          </div>
        ))}
      </div>
    </PageCard>
  );
}
