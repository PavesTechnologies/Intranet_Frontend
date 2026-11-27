import React from "react";
import { ArrowRight } from "lucide-react";
import { formatMoney } from "@/pages/expense-management/pages/cash-advance/cashAdvanceDisplay";
import { advanceMovementLines } from "@/pages/expense-management/pages/cash-advance/advanceMovement";

/** One colour per kind of movement, the same on My Expenses and My Advances. */
export const TRACKER_STEP_STYLE = {
  paid: "border-slate-200 bg-white text-slate-900",
  carriedIn: "border-violet-200 bg-violet-50 text-violet-800",
  used: "border-sky-200 bg-sky-50 text-sky-800",
  pending: "border-dashed border-slate-300 bg-white text-slate-500",
  salary: "border-rose-200 bg-rose-50 text-rose-800",
  refund: "border-teal-200 bg-teal-50 text-teal-800",
  carriedOut: "border-violet-200 bg-violet-50 text-violet-800",
  remaining: "border-amber-200 bg-amber-50 text-amber-800",
  requested: "border-slate-200 bg-slate-50 text-slate-700",
  cut: "border-rose-200 bg-rose-50 text-rose-700",
  approved: "border-indigo-200 bg-indigo-50 text-indigo-800",
  waiting: "border-dashed border-slate-300 bg-white text-slate-500",
  settledZero: "border-emerald-200 bg-emerald-50 text-emerald-800",
  owedToYou: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

/**
 * Where one advance's money went, as a line of steps: Paid out (+ Carried in) → Used on reports, Salary deduction,
 * Refunded, Carried forward → Remaining, with one plain sentence about what is left. `figures` is figuresOf(advance);
 * `serverOutstanding` is the advance's own balance, so Remaining matches every other total. Before the advance is paid
 * out nothing has moved, and it says so. With `withRequest`, the steps start from the request: Requested → (Cut off) →
 * Approved, so the whole life of the advance reads as one line.
 */
export default function AdvanceMoneyTracker({ figures, serverOutstanding, currency = "INR", loading = false, withRequest = false }) {
  if (loading) return <p className="text-xs text-slate-400">Loading where the money went…</p>;
  const f = figures || {};
  const cut = f.approvedKnown ? Math.max(0, (f.requested || 0) - (f.approved || 0)) : 0;
  const requestSteps = withRequest
    ? [
        { key: "requested", label: "Requested", value: f.requested || 0, note: "Cash you asked for" },
        cut > 0 && { key: "cut", label: "Cut off", value: cut, note: "Reduced by the approvers", minus: true },
        f.approvedKnown
          ? { key: "approved", label: "Approved", value: f.approved || 0, note: "Cash approved" }
          : { key: "waiting", label: "Approved", value: null, note: "Waiting for approval" },
      ].filter(Boolean)
    : [];
  const moved = advanceMovementLines(figures, serverOutstanding);
  if (!moved && !withRequest) return <p className="text-xs text-slate-500">This advance has not been paid out yet, so no money has moved.</p>;
  const lines = [...requestSteps, ...(moved || [])];
  const remaining = lines.find((l) => l.key === "remaining");
  const owed = lines.find((l) => l.key === "owedToYou");
  return (
    <div data-advance-tracker>
      <ol className="flex flex-wrap items-stretch gap-1.5" aria-label="Advance money flow">
        {lines.map((l, i) => {
          const styleKey = l.key === "remaining" && !(l.value > 0) ? "settledZero" : l.key;
          return (
            <li key={l.key} className="flex items-center gap-1.5">
              {i > 0 && <ArrowRight size={13} className="shrink-0 text-slate-300" aria-hidden="true" />}
              <div className={`rounded-lg border px-2.5 py-1.5 ${TRACKER_STEP_STYLE[styleKey] || TRACKER_STEP_STYLE.paid}`} title={l.note}>
                <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide opacity-75">{l.label.replace(/^\+ /, "")}</p>
                <p className="whitespace-nowrap text-sm font-bold tabular-nums">
                  {l.value == null ? "Pending" : `${l.minus ? "− " : ""}${formatMoney(l.value, currency)}`}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {!moved ? (
        <p className="mt-2 text-[11px] text-slate-500">
          {f.approvedKnown ? "Approved, not paid out yet, so no money has moved." : "Waiting for approval. Nothing is paid out until it is approved."}
        </p>
      ) : owed ? (
        <p className="mt-2 text-[11px] text-emerald-700">Your expenses are more than the advance: the company owes you {formatMoney(owed.value, currency)}.</p>
      ) : remaining && remaining.value > 0 ? (
        <p className="mt-2 text-[11px] text-amber-700">
          {formatMoney(remaining.value, currency)} is still with you. Settle it by adding bills to a report, refunding it, or Finance can
          recover it from your salary or carry it forward to your next advance.
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-emerald-700">Nothing is left on this advance.</p>
      )}
    </div>
  );
}
