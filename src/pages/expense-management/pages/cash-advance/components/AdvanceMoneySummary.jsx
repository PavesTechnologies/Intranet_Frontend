import React, { useState } from "react";
import { ChevronDown, Wallet } from "lucide-react";
import { formatMoney } from "@/pages/expense-management/pages/cash-advance/cashAdvanceDisplay";
import { UsageBar, UsageLegend } from "@/pages/expense-management/pages/cash-advance/components/AdvanceRowDetails";

function Row({ label, value, note, tone = "text-gray-900", muted = false, strong = false }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className={`text-xs ${strong ? "font-semibold text-gray-900" : "text-gray-600"}`}>{label}</p>
        {note && <p className="mt-0.5 text-[11px] leading-snug text-gray-400">{note}</p>}
      </div>
      <p className={`shrink-0 tabular-nums ${strong ? "text-base font-bold" : "text-sm font-semibold"} ${muted ? "text-gray-300" : tone}`}>
        {value}
      </p>
    </div>
  );
}

/**
 * A statement-style summary of one advance's money: the four figures people look for first, with the rest
 * (owed, consumed, balance, carried forward, salary deducted) behind "More". {@code figures} comes from
 * figuresForAdvance(); nothing is recalculated here.
 */
export default function AdvanceMoneySummary({ advance, figures: f }) {
  const [open, setOpen] = useState(false);
  const cur = advance.currencyCode || "INR";
  const money = (v) => formatMoney(v, cur);
  const later = (v) => (f.paidOut ? money(v) : "—");
  const cashApproved = f.approved - f.carriedIn;
  const owing = f.paidOut && f.outstanding > 0;

  return (
    <section aria-label="Money summary" className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0A0082]/10 text-[#0A0082]">
          <Wallet size={15} aria-hidden="true" />
        </span>
        <h3 className="text-sm font-bold text-[#0a174e]">Money</h3>
      </div>

      <div className="divide-y divide-dashed divide-gray-200 px-4">
        <Row label="Requested" value={money(f.requested)} />
        <Row
          label="Approved"
          value={f.approvedKnown ? money(f.approved) : "—"}
          muted={!f.approvedKnown}
          tone="text-indigo-700"
          note={
            !f.approvedKnown
              ? "Not approved yet"
              : cashApproved > 0 && f.requested > cashApproved
                ? `Reduced by ${money(f.requested - cashApproved)}`
                : null
          }
        />
        <Row label="Paid to you" value={later(f.disbursed)} muted={!f.paidOut} tone="text-indigo-700" note={f.paidOut ? null : "Not paid yet"} />

        {open && (
          <>
            <Row
              label="Owed"
              value={later(f.owed)}
              muted={!f.paidOut}
              note={f.carriedIn > 0 ? `incl. ${money(f.carriedIn)} brought in` : "Paid + brought in"}
            />
            <Row
              label="Consumed"
              value={later(f.consumed)}
              muted={!f.paidOut}
              tone="text-sky-700"
              note={f.paidOut && f.approvedConsumed !== null && f.consumed > 0 ? `${money(f.approvedConsumed)} approved` : "Expenses added"}
            />
            <Row
              label="Balance"
              value={later(f.remaining)}
              muted={!f.paidOut}
              note={f.paidOut && f.owedToEmployee > 0 ? `Company owes ${money(f.owedToEmployee)}` : "Owed − consumed"}
            />
            <Row
              label="Carried forward"
              value={later(f.carriedForward)}
              muted={!f.paidOut}
              tone="text-violet-700"
              note={f.held > 0 ? `${money(f.held)} held in outstanding` : f.moved > 0 ? `${money(f.moved)} taken into a later advance` : null}
            />
            <Row
              label="Salary deducted"
              value={later(f.salaryDeducted)}
              muted={!f.paidOut}
              tone="text-emerald-700"
              note={f.paidOut && f.otherRepaid > 0 ? `+ ${money(f.otherRepaid)} repaid` : null}
            />
          </>
        )}
      </div>

      <div className={`mx-4 mb-3 mt-1 rounded-lg px-3 ${owing ? "bg-amber-50" : "bg-[#F4F6FC]"}`}>
        <Row label="Outstanding" value={later(f.outstanding)} muted={!f.paidOut} tone={owing ? "text-amber-700" : "text-[#0a174e]"} strong />
      </div>

      {f.paidOut && f.owed > 0 && (
        <div className="px-4 pb-3">
          <UsageBar figures={f} />
          <UsageLegend />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-center gap-1 border-t border-gray-100 py-2.5 text-xs font-semibold text-[#0A0082] transition hover:bg-gray-50"
      >
        {open ? "Less" : "More"}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
    </section>
  );
}
