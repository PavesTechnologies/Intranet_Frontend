/**
 * The money of one cash advance, for the Settlement list, in the order it moves:
 *
 *   requested      cash the employee asked for (before any manager reduction). Carried-in money is not requested cash.
 *   approved       cash approved: the approved amount less any balance carried in (the same rule on every page)
 *   disbursed      cash actually paid to the employee
 *   carriedIn      outstanding from earlier advances brought into this one (Cash Advance + Outstanding, or a set-off)
 *   owed           disbursed + carriedIn: what the employee must account for on this advance. For a plain new
 *                  request nothing is carried in, so owed equals disbursed
 *   consumed       expenses the employee added against this advance (every line on the linked reports)
 *   balance        owed - consumed: what the expenses do not account for
 *   carriedForward balance Finance carried forward out of this advance (carriedOut). Of that:
 *     held         still held in the employee's outstanding, waiting for a later advance to take it in
 *     moved        already taken in by a later advance (it is counted there, in that advance's owed)
 *   salaryDeducted recovered through payroll (deductions Payroll confirmed)
 *   otherRepaid    paid back by the employee in any other way
 *   outstanding    balance - salaryDeducted - otherRepaid - carriedForward: still owed on this advance itself
 *   owedToEmployee consumed above owed: the company owes the employee this much
 *
 * The employee's total outstanding is the outstanding of every advance plus every held carry-forward, so money that
 * was carried forward is never lost and never counted twice: it is either held, or part of the advance that took it in.
 *
 * The utilization comes from the server (GET /cash-advances/{id}/utilization). Payroll deductions are posted as
 * repayments, so they are part of totalRepaidAmount and are taken out of it to give otherRepaid.
 */
const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Math.round(n * 100) / 100;

export function settlementFiguresFor(advance, utilization, salaryDeducted = 0) {
  const amount = num(advance?.amount);
  const carriedIn = Math.max(0, num(advance?.carriedInAmount));
  // amount and approvedAmount include any balance carried in; requested and approved here are cash only, so every page
  // reads Requested -> Cut off -> Approved -> Disbursed in cash, with Carried in added after.
  const approved = Math.max(0, (num(advance?.approvedAmount) || amount) - carriedIn);
  // Cash paid. Before disbursement figures are stored, the cash part of the amount (the carried-in part is not paid).
  const disbursed = num(advance?.disbursedAmount) || Math.max(0, (num(utilization?.advanceAmount) || amount) - carriedIn);
  const owed = disbursed + carriedIn;
  const consumed = utilization ? num(utilization.claimedAmount) : num(advance?.verifiedExpenseAmount);
  const approvedConsumed = utilization ? num(utilization.approvedAmount) : null;
  const salary = Math.max(0, num(salaryDeducted));
  const otherRepaid = Math.max(0, num(utilization?.totalRepaidAmount) - salary);
  const carriedForward = Math.max(0, num(advance?.carriedOutAmount));
  const held = Math.min(carriedForward || Infinity, Math.max(0, num(advance?.carryForwardReadyAmount)));
  const balance = round2(owed - consumed);
  return {
    requested: round2(advance?.requestedAmount != null ? num(advance.requestedAmount) : Math.max(0, amount - carriedIn)),
    approved: round2(approved),
    disbursed: round2(disbursed),
    carriedIn: round2(carriedIn),
    owed: round2(owed),
    consumed: round2(consumed),
    approvedConsumed: approvedConsumed === null ? null : round2(approvedConsumed),
    remaining: Math.max(0, balance),
    owedToEmployee: Math.max(0, -balance),
    carriedForward: round2(carriedForward),
    held: round2(held),
    moved: round2(Math.max(0, carriedForward - held)),
    salaryDeducted: round2(salary),
    otherRepaid: round2(otherRepaid),
    // The advance's own balance (the server's, used by the dashboard and My Advances), so Outstanding is the same number
    // everywhere. It only drops once expenses are approved; the computed figure is a fallback for records without one.
    outstanding: advance?.outstandingBalance != null
      ? Math.max(0, round2(num(advance.outstandingBalance)))
      : Math.max(0, round2(balance - salary - otherRepaid - carriedForward)),
    // Expense reports linked to the advance: { reportId, reportNumber, reportStatus, claimedAmount }.
    reports: Array.isArray(utilization?.linkedReports) ? utilization.linkedReports : [],
    loaded: Boolean(utilization),
  };
}

/**
 * Report statuses whose expenses are not final yet: the advance's balance can still change, so it cannot be settled.
 * Matches CashAdvanceSettlementReadiness.OPEN_REPORT_STATUSES on the server.
 */
export const OPEN_REPORT_STATUSES = [
  "DRAFT", "SUBMITTED", "PENDING_APPROVAL", "PENDING_FINANCE_VERIFICATION", "AWAITING_CORRECTION", "POLICY_REJECTED", "QUERY_RAISED",
];

/** Linked reports still open, each with a readable status: { reportNumber, reportStatus, statusLabel, claimedAmount }. */
export function openLinkedReports(reports) {
  return (Array.isArray(reports) ? reports : [])
    .filter((r) => OPEN_REPORT_STATUSES.includes(String(r?.reportStatus || "").toUpperCase()))
    .map((r) => {
      const words = String(r.reportStatus).replace(/_/g, " ").toLowerCase();
      return { ...r, statusLabel: words.charAt(0).toUpperCase() + words.slice(1) };
    });
}

/** Totals across the advances on the list. Total outstanding adds the held carry-forwards to what each advance owes. */
export function settlementTotals(figuresList) {
  const sum = (key) => round2(figuresList.reduce((total, f) => total + num(f[key]), 0));
  const outstandingOnAdvances = sum("outstanding");
  const held = sum("held");
  return {
    count: figuresList.length,
    requested: sum("requested"),
    approved: sum("approved"),
    // Reduced at approval (asked for minus approved), and on how many advances.
    cut: sum("cut"),
    cutCount: figuresList.filter((f) => num(f.cut) > 0).length,
    // Approved, not paid out yet.
    awaitingDisbursement: sum("awaitingDisbursement"),
    awaitingCount: figuresList.filter((f) => num(f.awaitingDisbursement) > 0).length,
    disbursed: sum("disbursed"),
    carriedIn: sum("carriedIn"),
    owed: sum("owed"),
    // Used = expenses on approved reports set against the advances (the dashboard's "Used on bills"). Expenses on
    // reports not approved yet do not reduce a balance, so they are counted apart.
    consumed: round2(figuresList.reduce((total, f) => total + num(f.approvedConsumed ?? f.consumed), 0)),
    claimed: sum("consumed"),
    pendingInReports: round2(Math.max(0, sum("consumed") - figuresList.reduce((total, f) => total + num(f.approvedConsumed ?? f.consumed), 0))),
    remaining: sum("remaining"),
    carriedForward: sum("carriedForward"),
    held,
    moved: sum("moved"),
    salaryDeducted: sum("salaryDeducted"),
    otherRepaid: sum("otherRepaid"),
    outstandingOnAdvances,
    outstanding: round2(outstandingOnAdvances + held),
    owedToEmployee: sum("owedToEmployee"),
  };
}

/**
 * Shares of what is owed, in percent, for the usage bar: spent on expenses, recovered (salary or repaid), carried
 * forward, and still outstanding.
 */
export function usageShares(figures) {
  const base = figures.owed > 0 ? figures.owed : 0;
  if (!base) return { spent: 0, recovered: 0, carried: 0, outstanding: 0 };
  const pct = (v) => Math.max(0, Math.min(100, (v / base) * 100));
  const spent = pct(Math.min(figures.consumed, base));
  const recovered = Math.min(100 - spent, pct(figures.salaryDeducted + figures.otherRepaid));
  const carried = Math.min(100 - spent - recovered, pct(figures.carriedForward));
  const outstanding = Math.min(100 - spent - recovered - carried, pct(figures.outstanding));
  return { spent, recovered, carried, outstanding };
}
