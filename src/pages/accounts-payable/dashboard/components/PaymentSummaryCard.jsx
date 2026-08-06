import React from "react";
import { Fonts } from "../../../../components/Fonts/Fonts";
import StatusBadge from "../../../../components/status/statusbadge";
import { formatCurrency, formatDate } from "../../utils/formatters";

const METHOD_COLORS = { ACH: "bg-blue-500", Wire: "bg-teal-500", Check: "bg-orange-500" };

export default function PaymentSummaryCard({ summary }) {
  if (!summary) return null;
  const { nextRun, lastCompleted, byMethod } = summary;

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className={Fonts.subheading}>Payment Summary</h3>
      <p className="mt-2 text-2xl font-bold text-slate-800">{formatCurrency(nextRun.amount)}</p>
      <p className="text-xs text-slate-400">
        Next run · {formatDate(nextRun.scheduledDate)} · {nextRun.invoiceCount} invoices
      </p>

      <div className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-500">{nextRun.batchId}</span>
          <StatusBadge label={nextRun.status} size="sm" />
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-500">
            {lastCompleted.batchId} · {formatCurrency(lastCompleted.amount)}
          </span>
          <StatusBadge label={lastCompleted.status} size="sm" />
        </div>
      </div>

      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-gray-100">
        {byMethod.map((method) => (
          <div key={method.method} className={METHOD_COLORS[method.method] || "bg-slate-400"} style={{ width: `${method.pct}%` }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {byMethod.map((method) => (
          <span key={method.method}>{method.method} {method.pct}%</span>
        ))}
      </div>
    </div>
  );
}
