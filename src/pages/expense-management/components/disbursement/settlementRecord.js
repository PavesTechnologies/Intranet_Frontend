/**
 * Settlement of a cash advance against its verified expenses. Every settlement is recorded as an
 * adjustment entry that keeps the original advance, verified expenses, the amount settled and the
 * way it was settled. The advance is only closed by the server once its balance is actually zero.
 *
 * Actions:
 * - SETTLE: money moves now (employee repays or company reimburses). Needs cash or bank proof when
 *   the difference is not zero.
 * - PAYROLL_DEDUCTION: the employee owes the balance and it is recovered from salary. Needs the
 *   authorization and the payroll confirmation references.
 * - ADJUST: defer the unresolved balance to the next review cycle (quarterly, half-yearly or
 *   financial year). Nothing is paid now, so no proof is required.
 */

import { DISBURSEMENT_MODE, buildDisbursementFormData, validateDisbursementConfirmation } from "./disbursementConfirmation";
import { getNextReviewDate, REVIEW_CYCLE } from "@/pages/expense-management/pages/cash-advance/settlementCycles";

export const SETTLEMENT_ACTION = {
  SETTLE: "SETTLE",
  PAYROLL_DEDUCTION: "PAYROLL_DEDUCTION",
  ADJUST: "ADJUST",
};

export const SETTLEMENT_MODES = [DISBURSEMENT_MODE.CASH, DISBURSEMENT_MODE.BANK_TRANSFER, DISBURSEMENT_MODE.UPI];

export const EMPTY_PAYROLL_DEDUCTION = {
  authorizationReference: "",
  payrollConfirmationReference: "",
};

/** Review cycle used when a deferred balance is not given one. */
export const DEFAULT_REVIEW_CYCLE = REVIEW_CYCLE.QUARTERLY;

/** The settled amount is the difference between the advance and the verified expenses. */
export const getSettlementDifference = (advanceAmount, verifiedExpenseAmount) =>
  (Number(advanceAmount) || 0) - (Number(verifiedExpenseAmount) || 0);

/** Returns a map of field -> message. Empty means the settlement can be recorded. */
export const validateSettlement = ({ action, diff, confirmation, payroll, reviewCycle }) => {
  if (action === SETTLEMENT_ACTION.ADJUST) {
    return reviewCycle && getNextReviewDate(reviewCycle) ? {} : { reviewCycle: "Select a review cycle." };
  }

  if (action === SETTLEMENT_ACTION.PAYROLL_DEDUCTION) {
    const errors = {};
    if (diff <= 0) {
      errors.action = "Salary deduction applies only when the employee owes the balance.";
    }
    if (!payroll.authorizationReference.trim()) {
      errors.authorizationReference = "Enter the authorization reference.";
    }
    if (!payroll.payrollConfirmationReference.trim()) {
      errors.payrollConfirmationReference = "Enter the payroll confirmation reference.";
    }
    return errors;
  }

  // SETTLE: a zero difference moves no money, so there is nothing to prove.
  if (diff === 0) return {};
  return validateDisbursementConfirmation(confirmation);
};

const direction = (diff) => (diff > 0 ? "EMPLOYEE_REPAYS" : diff < 0 ? "COMPANY_REIMBURSES" : "ZERO_BALANCE");

/**
 * Multipart body for the settlement adjustment endpoint. Keeps the full record: original advance,
 * verified expenses, the amount settled, the direction and the proof for the chosen action.
 */
export const buildSettlementFormData = ({
  advanceId,
  expenseReportId,
  action,
  advanceAmount,
  verifiedExpenseAmount,
  currencyCode,
  confirmation,
  payroll,
  reviewCycle,
  notes,
}) => {
  const diff = getSettlementDifference(advanceAmount, verifiedExpenseAmount);
  const formData = new FormData();

  formData.append("cashAdvanceId", advanceId);
  if (expenseReportId) formData.append("expenseReportId", expenseReportId);
  formData.append("settlementAction", action);
  formData.append("settlementDirection", direction(diff));
  formData.append("advanceAmount", String(Number(advanceAmount) || 0));
  formData.append("verifiedExpenseAmount", String(Number(verifiedExpenseAmount) || 0));
  formData.append("adjustmentAmount", String(Math.abs(diff)));
  formData.append("currencyCode", currencyCode || "INR");
  if (notes && notes.trim()) formData.append("notes", notes.trim());

  if (action === SETTLEMENT_ACTION.ADJUST) {
    formData.append("reviewCycle", reviewCycle);
    formData.append("reviewDate", getNextReviewDate(reviewCycle));
  }

  if (action === SETTLEMENT_ACTION.PAYROLL_DEDUCTION) {
    formData.append("disbursementMode", "PAYROLL_DEDUCTION");
    formData.append("authorizationReference", payroll.authorizationReference.trim());
    formData.append("payrollConfirmationReference", payroll.payrollConfirmationReference.trim());
  } else if (action === SETTLEMENT_ACTION.SETTLE && diff !== 0) {
    // Copy the proof fields across so the adjustment carries the same confirmation as a payout.
    for (const [key, value] of buildDisbursementFormData(confirmation).entries()) {
      formData.append(key, value);
    }
  }

  return formData;
};

export const SETTLEMENT_SUCCESS_MESSAGE = {
  [SETTLEMENT_ACTION.SETTLE]: "Settlement recorded. The advance closes once its balance is zero.",
  [SETTLEMENT_ACTION.PAYROLL_DEDUCTION]: "Salary deduction recorded.",
  [SETTLEMENT_ACTION.ADJUST]: "Balance deferred to the review cycle.",
};
