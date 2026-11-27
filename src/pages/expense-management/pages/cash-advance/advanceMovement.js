// Where a cash advance's money is and where it went, shared by My Advances and My Expenses so both read the same.
// Every figure comes from the server: the advance record (cash paid out, carried in, balance) and its settlement figures
// from useAdvanceFigures/settlementFigures.js (expenses used, salary deducted, refunded, carried forward).

/** Cash was paid out on this advance (a carried-forward-only advance pays 0 cash but still holds money). */
export const isAdvancePaidOut = (adv) => Boolean(adv?.disbursedAt) || adv?.disbursedAmount != null;

/**
 * The advance record's money:
 *   held        = cash paid out + balance carried in from an earlier advance
 *   outstanding = what the employee still has to account for (the server's balance)
 *   settled     = held - outstanding (spent on approved reports, recovered, refunded or carried forward)
 */
export function advanceMoney(adv) {
  if (!isAdvancePaidOut(adv)) return null;
  const cash = Number(adv.disbursedAmount ?? adv.amount) || 0;
  const carriedIn = Number(adv.carriedInAmount) || 0;
  const outstanding = Number(adv.outstandingBalance) || 0;
  const held = cash + carriedIn;
  return { cash, carriedIn, held, outstanding, settled: Math.max(held - outstanding, 0) };
}

/**
 * Where one advance's money went, top to bottom:
 *   Paid out (+ Carried in)  ->  Used on reports, Salary deduction, Refunded, Carried forward  ->  Remaining.
 * `f` is figuresOf(advance) from useAdvanceFigures. Only expenses on approved reports count as used; expenses on reports
 * still in draft or approval are shown apart. Remaining is the server's balance, so it matches every other total.
 * Lines with nothing in them are left out, except Paid out, Used and Remaining.
 */
export function advanceMovementLines(f, serverOutstanding) {
  if (!f?.paidOut) return null;
  const used = f.approvedConsumed ?? f.consumed;
  const pending = Math.max(0, (f.consumed || 0) - used);
  const outstanding = serverOutstanding ?? f.outstanding;
  const lines = [
    { key: "paid", label: "Paid out", value: f.disbursed, tone: "text-gray-900" },
    f.carriedIn > 0 && { key: "carriedIn", label: "+ Carried in", value: f.carriedIn, tone: "text-violet-700", note: "from an earlier advance" },
    { key: "used", label: "Used on reports", value: used, tone: "text-sky-700", note: "Expenses on approved reports, set against this advance" },
    pending > 0 && { key: "pending", label: "In reports not approved yet", value: pending, tone: "text-gray-500", note: "Will reduce the balance once approved" },
    f.salaryDeducted > 0 && { key: "salary", label: "Salary deduction", value: f.salaryDeducted, tone: "text-rose-700" },
    f.otherRepaid > 0 && { key: "refund", label: "Refunded by you", value: f.otherRepaid, tone: "text-teal-700" },
    f.carriedForward > 0 && {
      key: "carriedOut", label: "Carried forward", value: f.carriedForward, tone: "text-violet-700",
      note: f.held > 0 ? "waiting for your next advance" : "moved to a later advance",
    },
  ].filter(Boolean);
  const remaining = f.owedToEmployee > 0
    ? { key: "owedToYou", label: "Company owes you", value: f.owedToEmployee, tone: "text-emerald-700" }
    : { key: "remaining", label: "Remaining", value: outstanding, tone: outstanding > 0 ? "text-amber-700" : "text-emerald-700" };
  return [...lines, remaining];
}

/** Link to one advance on My Advances: the table opens filtered to it, whatever its status. */
export const myAdvancesLink = (advanceId) => `/expense-management/cash-advance/my?advance=${encodeURIComponent(advanceId)}`;
