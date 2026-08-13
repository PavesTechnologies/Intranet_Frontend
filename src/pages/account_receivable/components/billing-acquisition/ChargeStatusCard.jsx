import { formatCurrency, formatDisplayDateTime } from "../../utils/format";

const STATUS_STYLES = {
  idle: { label: "Not Acquired", className: "bg-slate-100 text-slate-600" },
  not_applicable: { label: "Not Applicable", className: "bg-slate-100 text-slate-400" },
  success: { label: "Acquired", className: "bg-emerald-100 text-emerald-700" },
  empty: { label: "No Records", className: "bg-amber-100 text-amber-700" },
};

export default function ChargeStatusCard({ label, icon: Icon, result, currency }) {
  const status = result?.status || "idle";
  const disabled = status === "not_applicable";
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.idle;
  const recordsCount = result?.records?.length || 0;

  return (
    <div
      className={`rounded-xl border p-4 ${
        disabled ? "border-slate-100 bg-slate-50 opacity-60" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              disabled ? "bg-slate-200 text-slate-400" : "bg-[#0A0082]/10 text-[#0A0082]"
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-slate-900">{label}</span>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle.className}`}>
          {statusStyle.label}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-slate-400">Records</p>
          <p className="font-semibold text-slate-900">{disabled ? "—" : recordsCount}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Amount</p>
          <p className="font-semibold text-slate-900">{disabled ? "—" : formatCurrency(result?.amount, currency)}</p>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Last Fetched: {result?.lastFetchedAt ? formatDisplayDateTime(result.lastFetchedAt) : "—"}
      </p>
    </div>
  );
}
