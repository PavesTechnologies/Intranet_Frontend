import React from "react";
import { ArrowRight, CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatMoney } from "@/pages/expense-management/pages/cash-advance/cashAdvanceDisplay";

const MANAGER_STAGE = ["SUBMITTED", "PENDING", "PENDING_APPROVAL", "PENDING_MANAGER_APPROVAL"];
const BEFORE_FINANCE_DECISION = [
  "DRAFT", ...MANAGER_STAGE, "PENDING_COST_CENTER_APPROVAL", "PENDING_COST_CENTER", "PENDING_FINANCE_APPROVAL", "PENDING_FINANCE",
];
const STOPPED = ["REJECTED", "DEFERRED", "CANCELLED"];

const num = (value) => (value === null || value === undefined || value === "" ? null : Number(value));

/**
 * The money of one advance as a flow: what the employee asked for, what the manager kept, what Finance approved, the
 * cash actually paid, and what is still owed. Every figure comes from the advance record; nothing is recalculated
 * except the expected payout (approved amount less any balance carried in), which is the rule disbursement follows.
 */
export function moneyFlowOf(advance, outstanding) {
  const status = String(advance?.status || "").toUpperCase();
  const amount = num(advance?.amount) ?? 0;
  const requested = Math.max(num(advance?.requestedAmount) ?? amount, amount);
  const carriedIn = Math.max(0, num(advance?.carriedInAmount) ?? 0);
  const approved = num(advance?.approvedAmount);
  const disbursed = num(advance?.disbursedAmount);
  const stopped = STOPPED.includes(status);
  const managerDone = !!advance?.managerTreatment || !(status === "DRAFT" || MANAGER_STAGE.includes(status));
  const financeDone = approved !== null || (!stopped && !BEFORE_FINANCE_DECISION.includes(status));
  const paid = disbursed !== null && disbursed > 0;

  return {
    status,
    stopped,
    requested,
    afterManager: amount,
    reduction: requested - amount,
    managerDone,
    approved: approved ?? amount,
    financeDone,
    carriedIn,
    cashToPay: Math.max(0, (approved ?? amount) - carriedIn),
    paid,
    disbursed: disbursed ?? 0,
    outstanding: num(outstanding) ?? num(advance?.outstandingBalance) ?? 0,
  };
}

const STATE = {
  done: { Icon: CheckCircle2, ring: "border-emerald-200 bg-emerald-50/60", icon: "text-emerald-600", value: "text-gray-900" },
  pending: { Icon: Clock, ring: "border-dashed border-gray-200 bg-gray-50", icon: "text-gray-400", value: "text-gray-400" },
  stopped: { Icon: XCircle, ring: "border-rose-200 bg-rose-50/60", icon: "text-rose-600", value: "text-rose-700" },
  owed: { Icon: Clock, ring: "border-amber-200 bg-amber-50/60", icon: "text-amber-600", value: "text-amber-800" },
};

function Step({ label, value, note, state, testId }) {
  const meta = STATE[state];
  const { Icon } = meta;
  return (
    <li className={`flex min-w-0 flex-1 flex-col rounded-lg border p-3 ${meta.ring}`} data-testid={testId}>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.icon}`} />
        {label}
      </p>
      <p className={`mt-1 text-base font-bold tabular-nums ${meta.value}`}>{value}</p>
      {note && <p className="mt-0.5 text-[11px] leading-snug text-gray-500">{note}</p>}
    </li>
  );
}

const Arrow = () => (
  <li aria-hidden className="hidden items-center justify-center text-gray-300 md:flex">
    <ArrowRight className="h-4 w-4" />
  </li>
);

export default function AdvanceMoneyFlow({ advance, outstanding }) {
  const cur = advance?.currencyCode || "INR";
  const m = moneyFlowOf(advance, outstanding);
  const money = (v) => formatMoney(v, cur);

  const managerNote = !m.managerDone
    ? m.stopped ? "Not reviewed" : "Awaiting the manager"
    : m.reduction > 0
      ? `Reduced by ${money(m.reduction)}`
      : "Full amount kept";

  let approvedState = "pending";
  let approvedNote = "Awaiting Finance";
  if (m.financeDone) {
    approvedState = "done";
    approvedNote = "Fixed at final approval";
  } else if (m.stopped) {
    approvedState = "stopped";
    approvedNote = m.status === "DEFERRED" ? "Deferred, nothing approved" : "Rejected, nothing approved";
  }

  let paidState = "pending";
  let paidValue = money(m.cashToPay);
  let paidNote = m.financeDone ? "Approved, not paid yet" : "Paid after approval";
  if (m.paid) {
    paidState = "done";
    paidValue = money(m.disbursed);
    paidNote = m.carriedIn > 0 ? `${money(m.carriedIn)} covered by a carried-in balance` : "Sent to the employee";
  } else if (m.stopped) {
    paidState = "stopped";
    paidValue = money(0);
    paidNote = "Nothing will be paid";
  } else if (m.carriedIn > 0) {
    paidNote = `${paidNote}; ${money(m.carriedIn)} covered by a carried-in balance`;
  }

  return (
    <section aria-label="Money flow" className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#0a174e]">Money flow</h4>
        <p className="text-[11px] text-gray-500">From the employee's request to the cash paid out</p>
      </div>
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:items-stretch md:gap-1.5">
        <Step testId="flow-requested" label="Requested" value={money(m.requested)} note="Asked for by the employee" state="done" />
        <Arrow />
        <Step
          testId="flow-manager"
          label="Manager review"
          value={m.managerDone ? money(m.afterManager) : money(m.requested)}
          note={managerNote}
          state={m.managerDone ? "done" : m.stopped ? "stopped" : "pending"}
        />
        <Arrow />
        <Step testId="flow-approved" label="Approved" value={money(m.approved)} note={approvedNote} state={approvedState} />
        <Arrow />
        <Step testId="flow-paid" label="Paid to employee" value={paidValue} note={paidNote} state={paidState} />
        {m.paid && (
          <>
            <Arrow />
            <Step
              testId="flow-owed"
              label="Still owed"
              value={money(m.outstanding)}
              note={m.outstanding > 0 ? "To settle with expenses or repayment" : "Fully settled"}
              state={m.outstanding > 0 ? "owed" : "done"}
            />
          </>
        )}
      </ol>
    </section>
  );
}
