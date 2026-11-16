import { formatCurrency, formatDisplayDate } from "../../utils/format";

/**
 * Editable allocation of one payment amount across a client's outstanding
 * receivables (same currency). `allocations` is { [receivableId]: "amount" }.
 */
export default function PaymentAllocationEditor({ receivables = [], allocations, onChange, available, currency }) {
  const allocated = Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const remaining = (Number(available) || 0) - allocated;

  const setAmount = (receivableId, value) => onChange({ ...allocations, [receivableId]: value });

  // Oldest due first — mirrors how the backend orders outstanding receivables.
  const autoAllocate = () => {
    let left = Number(available) || 0;
    const next = {};
    receivables.forEach((r) => {
      const amount = Math.min(left, r.outstandingBalance);
      next[r.receivableId] = amount > 0 ? String(Number(amount.toFixed(2))) : "";
      left -= Math.max(amount, 0);
    });
    onChange(next);
  };

  if (receivables.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
        No outstanding receivables for this client in {currency || "this currency"}. The payment will be recorded as unallocated.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Allocate to invoices</p>
        <button
          type="button"
          onClick={autoAllocate}
          disabled={!Number(available)}
          className="text-xs font-semibold text-[#0A0082] hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
        >
          Auto-allocate oldest first
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Invoice No.</th>
              <th className="px-3 py-2 text-left">Due Date</th>
              <th className="px-3 py-2 text-left">Outstanding</th>
              <th className="px-3 py-2 text-left">Allocate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {receivables.map((r) => {
              const value = allocations[r.receivableId] ?? "";
              const over = Number(value) > r.outstandingBalance;
              return (
                <tr key={r.receivableId}>
                  <td className="px-3 py-2 font-mono font-semibold text-indigo-700">{r.invoiceNumber}</td>
                  <td className="px-3 py-2">{r.dueDate ? formatDisplayDate(r.dueDate) : "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{formatCurrency(r.outstandingBalance, r.currencyCode)}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={value}
                      onChange={(e) => setAmount(r.receivableId, e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      aria-label={`Allocation for ${r.invoiceNumber}`}
                      className={`w-32 rounded-md border px-2 py-1 text-xs tabular-nums focus:outline-none focus:ring-2 ${
                        over ? "border-rose-300 focus:ring-rose-500/30" : "border-slate-200 focus:ring-indigo-500/30"
                      }`}
                    />
                    {over && <p className="mt-0.5 text-[11px] text-rose-600">More than outstanding</p>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap justify-end gap-4 text-xs">
        <span className="text-slate-500">
          Allocated <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(allocated, currency)}</span>
        </span>
        <span className={remaining < 0 ? "text-rose-600" : "text-slate-500"}>
          Unallocated{" "}
          <span className={`font-semibold tabular-nums ${remaining < 0 ? "text-rose-700" : "text-slate-900"}`}>
            {formatCurrency(remaining, currency)}
          </span>
        </span>
      </div>
    </div>
  );
}

/** Validates an allocation map against its receivables and the money available. */
export const validateAllocations = (allocations, receivables, available) => {
  const byId = Object.fromEntries(receivables.map((r) => [r.receivableId, r]));
  let total = 0;
  for (const [receivableId, raw] of Object.entries(allocations)) {
    if (raw === "" || raw === null || raw === undefined) continue;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0) return "Allocation amounts must be positive numbers.";
    if (byId[receivableId] && amount > byId[receivableId].outstandingBalance) {
      return `Allocation for ${byId[receivableId].invoiceNumber} is more than its outstanding balance.`;
    }
    total += amount;
  }
  if (total - (Number(available) || 0) > 0.005) return "Total allocated is more than the payment amount.";
  return null;
};

/** Allocation map → API payload (drops empty and zero rows). */
export const toAllocationPayload = (allocations) =>
  Object.entries(allocations)
    .map(([receivableId, raw]) => ({ receivableId, amount: Number(raw) }))
    .filter((a) => Number.isFinite(a.amount) && a.amount > 0);
