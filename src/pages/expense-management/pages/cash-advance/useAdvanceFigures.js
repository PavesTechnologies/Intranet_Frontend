import { useEffect, useState } from "react";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { recoveryApi } from "@/pages/expense-management/api/recoveryApi";
import { settlementFiguresFor } from "@/pages/expense-management/pages/cash-advance/settlementFigures";

// Before these statuses no cash has been paid, so there are no expenses or recoveries to load.
const NOT_PAID_OUT = [
  "DRAFT", "SUBMITTED", "PENDING", "PENDING_APPROVAL", "PENDING_MANAGER_APPROVAL", "PENDING_COST_CENTER_APPROVAL",
  "PENDING_COST_CENTER", "PENDING_FINANCE_APPROVAL", "PENDING_FINANCE", "APPROVED", "REJECTED", "DEFERRED", "CANCELLED",
];

/** True once cash has gone out on the advance, so disbursed, owed, consumed and the rest have a value. */
export const isPaidOut = (advance) =>
  Number(advance?.disbursedAmount) > 0 || !NOT_PAID_OUT.includes(String(advance?.status || "").toUpperCase());

/**
 * The money of one advance for display. Before cash is paid out, only the requested amount, and the approved amount
 * once Finance has approved, are real figures; the rest are zero and shown as "—" ({@code paidOut} false).
 */
export function figuresForAdvance(advance, utilization, salaryDeducted = 0) {
  const f = settlementFiguresFor(advance, utilization, salaryDeducted);
  // Cut by the approvers: asked for minus approved, once the approved amount is known.
  const cutOf = (approved) => Math.max(0, Math.round((f.requested - approved) * 100) / 100);
  if (isPaidOut(advance)) {
    return { ...f, paidOut: true, approvedKnown: true, cut: cutOf(f.approved), awaitingDisbursement: 0 };
  }
  const approvedKnown =
    advance?.approvedAmount != null || String(advance?.status || "").toUpperCase() === "APPROVED";
  return {
    ...f,
    paidOut: false,
    approvedKnown,
    approved: approvedKnown ? f.approved : 0,
    cut: approvedKnown ? cutOf(f.approved) : 0,
    // Approved but not paid out yet: money the company still has to pay.
    awaitingDisbursement: approvedKnown ? f.approved : 0,
    disbursed: 0, carriedIn: 0, owed: 0, consumed: 0, approvedConsumed: null, remaining: 0, owedToEmployee: 0,
    carriedForward: 0, held: 0, moved: 0, salaryDeducted: 0, otherRepaid: 0, outstanding: 0, reports: [],
  };
}

/**
 * Loads the server's figures for each paid-out advance on a list: the expenses on its linked reports (utilization) and
 * what Payroll has confirmed deducting. Returns {@code figuresOf(advance)}, the money in the order it moves (see
 * settlementFigures.js), and {@code isLoaded(advance)}. Advances not paid out yet are not fetched.
 */
export function useAdvanceFigures(advances) {
  const [usageById, setUsageById] = useState({});

  useEffect(() => {
    let cancelled = false;
    const ids = advances.filter(isPaidOut).map((a) => a.advanceId || a.id).filter(Boolean);
    Promise.all(
      ids.map((id) =>
        Promise.all([
          Promise.resolve()
            .then(() => cashAdvanceApi.getUtilization(id))
            .then((r) => r?.data?.data ?? r?.data ?? null)
            .catch(() => null),
          Promise.resolve()
            .then(() => recoveryApi.listSalaryDeductions(id))
            .then((list) => (Array.isArray(list) ? list : list?.content ?? []))
            // Only what Payroll confirmed is a deduction; a request still waiting for Payroll is not.
            .then((rows) =>
              rows
                .filter((r) => r.status === "PAYROLL_CONFIRMED")
                .reduce((sum, r) => sum + Number(r.actualAmountDeducted || 0), 0)
            )
            .catch(() => 0),
          // A payroll deduction can also be posted straight as a repayment with method PAYROLL (not through the
          // recovery workflow). Those repayments are salary deductions too, not money the employee refunded.
          Promise.resolve()
            .then(() => cashAdvanceApi.getSettlement(id))
            .then((r) => r?.data?.data ?? r?.data ?? null)
            .then((s) =>
              (s?.repayments || [])
                .filter((p) => [p.paymentMethod, p.paymentMode].some((m) => String(m || "").toUpperCase() === "PAYROLL"))
                .reduce((sum, p) => sum + Number(p.amount || 0), 0)
            )
            .catch(() => 0),
        ]).then(([utilization, confirmedRecovery, payrollRepayments]) => [
          id,
          // The two sources describe the same deductions when both exist, so take the larger, never the sum.
          { utilization, salaryDeducted: Math.max(confirmedRecovery, payrollRepayments) },
        ])
      )
    ).then((pairs) => {
      if (!cancelled) setUsageById(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [advances]);

  const figuresOf = (advance) => {
    const usage = usageById[advance.advanceId || advance.id];
    return figuresForAdvance(advance, usage?.utilization ?? null, usage?.salaryDeducted ?? 0);
  };
  const isLoaded = (advance) => !isPaidOut(advance) || Boolean(usageById[advance.advanceId || advance.id]);

  return { figuresOf, isLoaded, usageById };
}
