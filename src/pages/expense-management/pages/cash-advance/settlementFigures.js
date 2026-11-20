/**
 * The money of one cash advance, for the Settlement list, in the order it moves:
 *
 *   requested      what the employee asked for (before any manager reduction)
 *   approved       what Finance approved: the advance's amount, frozen at approval
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
  const approved = num(advance?.approvedAmount) || amount;
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
    requested: round2(Math.max(num(advance?.requestedAmount), amount)),
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
    outstanding: Math.max(0, round2(balance - salary - otherRepaid - carriedForward)),
    // Expense reports linked to the advance: { reportId, reportNumber, reportStatus, claimedAmount }.
    reports: Array.isArray(utilization?.linkedReports) ? utilization.linkedReports : [],
    loaded: Boolean(utilization),
  };
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
    disbursed: sum("disbursed"),
    carriedIn: sum("carriedIn"),
    owed: sum("owed"),
    consumed: sum("consumed"),
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
