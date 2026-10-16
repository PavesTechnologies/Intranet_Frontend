import React, { useMemo, useState } from "react";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import DisbursementConfirmationFields, {
  Field,
  confirmationInputClass,
} from "@/pages/expense-management/components/disbursement/DisbursementConfirmationFields";
import {
  buildDisbursementFormData,
  DISBURSEMENT_MODE,
  EMPTY_DISBURSEMENT_CONFIRMATION,
  validateDisbursementConfirmation,
} from "@/pages/expense-management/components/disbursement/disbursementConfirmation";
import { SETTLEMENT_ACTION } from "@/pages/expense-management/components/disbursement/settlementRecord";
import { validateRepaymentAmount } from "@/pages/expense-management/pages/cash-advance/repaymentValidation";
import {
  getNextReviewDate,
  REVIEW_CYCLE,
  REVIEW_CYCLE_OPTIONS,
} from "@/pages/expense-management/pages/cash-advance/settlementCycles";

export const SETTLE_OPTION = {
  REPAY: "REPAY",
  PAYROLL: "PAYROLL",
  DEFER: "DEFER",
};

const OPTIONS = [
  { value: SETTLE_OPTION.REPAY, label: "Repay by transfer", hint: "Employee pays back now (cash, bank or UPI)." },
  { value: SETTLE_OPTION.PAYROLL, label: "Deduct from salary", hint: "Recovered in one payroll month." },
  { value: SETTLE_OPTION.DEFER, label: "Defer to review cycle", hint: "Balance stays outstanding until the review date." },
];

const REPAY_MODES = [DISBURSEMENT_MODE.CASH, DISBURSEMENT_MODE.BANK_TRANSFER, DISBURSEMENT_MODE.UPI];

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none";

const toMonthValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

/** Payroll months from the current month for the next 12 months, as YYYY-MM with a label. */
const payrollMonthOptions = (today = new Date()) =>
  Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return { value: toMonthValue(d), label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) };
  });

const formatReviewDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" }) : "—";

/**
 * Settles the employee's remaining balance on a cash advance. Three outcomes, one per option:
 * repay by transfer (proof recorded), deduct from one salary month (authorization and payroll
 * references), or defer the balance to the next quarterly / half-yearly / financial-year review.
 * The advance only closes when the server reports a zero balance.
 */
export default function SettleBalancePanel({ advanceId, outstanding, currencyCode, advanceNumber, onSettled }) {
  const formatMoney = (amount) =>
    `${currencyCode || "INR"} ${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const [option, setOption] = useState(SETTLE_OPTION.REPAY);
  const [amount, setAmount] = useState(String(outstanding ?? ""));
  const [confirmation, setConfirmation] = useState(EMPTY_DISBURSEMENT_CONFIRMATION);
  const [deductionMonth, setDeductionMonth] = useState(toMonthValue(new Date()));
  const [authorizationReference, setAuthorizationReference] = useState("");
  const [payrollConfirmationReference, setPayrollConfirmationReference] = useState("");
  const [reviewCycle, setReviewCycle] = useState(REVIEW_CYCLE.QUARTERLY);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const monthOptions = useMemo(() => payrollMonthOptions(), []);
  const reviewDate = getNextReviewDate(reviewCycle);
  const balance = Number(outstanding) || 0;

  const switchOption = (value) => {
    setOption(value);
    setErrors({});
    setAmount(String(balance));
  };

  const validate = () => {
    const next = {};
    if (option === SETTLE_OPTION.REPAY) {
      const amountError = validateRepaymentAmount(amount, outstanding, formatMoney);
      if (amountError) next.amount = amountError;
      Object.assign(next, validateDisbursementConfirmation({ ...confirmation, mode: confirmation.mode }));
    }
    if (option === SETTLE_OPTION.PAYROLL) {
      const amountError = validateRepaymentAmount(amount, outstanding, formatMoney);
      if (amountError) next.amount = amountError;
      if (!deductionMonth) next.deductionMonth = "Select the payroll month.";
      if (!authorizationReference.trim()) next.authorizationReference = "Enter the authorization reference.";
      if (!payrollConfirmationReference.trim()) next.payrollConfirmationReference = "Enter the payroll confirmation reference.";
    }
    if (option === SETTLE_OPTION.DEFER) {
      if (!reviewCycle) next.reviewCycle = "Select a review cycle.";
      if (!reviewDate) next.reviewCycle = "The review date could not be calculated.";
      if (balance <= 0) next.reviewCycle = "This advance has no outstanding balance.";
    }
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      if (option === SETTLE_OPTION.REPAY) {
        const formData = buildDisbursementFormData(confirmation);
        formData.append("amount", String(Number(amount)));
        await cashAdvanceApi.repay(advanceId, formData);
      } else if (option === SETTLE_OPTION.PAYROLL) {
        await cashAdvanceApi.initiateRecovery(advanceId, {
          amount: Number(amount),
          deductionMonth,
          authorizationReference: authorizationReference.trim(),
          payrollConfirmationReference: payrollConfirmationReference.trim(),
        });
      } else {
        const formData = new FormData();
        formData.append("cashAdvanceId", advanceId);
        formData.append("settlementAction", SETTLEMENT_ACTION.ADJUST);
        formData.append("adjustmentAmount", String(balance));
        formData.append("currencyCode", currencyCode || "INR");
        formData.append("reviewCycle", reviewCycle);
        formData.append("reviewDate", reviewDate);
        if (notes.trim()) formData.append("notes", notes.trim());
        await cashAdvanceApi.createReimbursementAdjustment(formData);
      }

      const message =
        option === SETTLE_OPTION.REPAY
          ? "Repayment recorded."
          : option === SETTLE_OPTION.PAYROLL
          ? "Salary deduction scheduled."
          : `Balance deferred to the ${formatReviewDate(reviewDate)} review.`;
      showStatusToast(`${advanceNumber || "Advance"}: ${message}`, "success");
      setConfirmation(EMPTY_DISBURSEMENT_CONFIRMATION);
      setAuthorizationReference("");
      setPayrollConfirmationReference("");
      setNotes("");
      onSettled?.();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to record the settlement", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Settle remaining balance</p>
        <p className="text-xs text-gray-600">Outstanding: {formatMoney(balance)}. Choose how it is recovered.</p>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3" role="radiogroup" aria-label="Settlement option">
        {OPTIONS.map((opt) => {
          const selected = option === opt.value;
          return (
            <label
              key={opt.value}
              className={`cursor-pointer rounded-lg border p-3 ${selected ? "border-emerald-600 bg-white ring-2 ring-emerald-500/30" : "border-gray-200 bg-white hover:border-gray-300"}`}
            >
              <input
                type="radio"
                name="settle-option"
                value={opt.value}
                checked={selected}
                onChange={() => switchOption(opt.value)}
                className="sr-only"
              />
              <span className="block text-sm font-semibold text-gray-900">{opt.label}</span>
              <span className="mt-0.5 block text-xs text-gray-500">{opt.hint}</span>
            </label>
          );
        })}
      </div>

      {option === SETTLE_OPTION.REPAY && (
        <div className="space-y-4">
          <Field id="settle-amount" label={`Amount (max ${formatMoney(balance)})`} error={errors.amount}>
            <input
              id="settle-amount"
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <DisbursementConfirmationFields
            values={confirmation}
            errors={errors}
            modes={REPAY_MODES}
            onFieldChange={(key, value) => setConfirmation((prev) => ({ ...prev, [key]: value }))}
          />
        </div>
      )}

      {option === SETTLE_OPTION.PAYROLL && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field id="settle-amount-payroll" label={`Amount to deduct (max ${formatMoney(balance)})`} error={errors.amount}>
            <input
              id="settle-amount-payroll"
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field id="settle-month" label="Payroll month" error={errors.deductionMonth}>
            <select id="settle-month" className={inputClass} value={deductionMonth} onChange={(e) => setDeductionMonth(e.target.value)}>
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="settle-auth" label="Authorization reference" error={errors.authorizationReference}>
            <input id="settle-auth" type="text" maxLength={100} className={inputClass} value={authorizationReference} onChange={(e) => setAuthorizationReference(e.target.value)} />
          </Field>
          <Field id="settle-payroll-ref" label="Payroll confirmation reference" error={errors.payrollConfirmationReference}>
            <input id="settle-payroll-ref" type="text" maxLength={100} className={inputClass} value={payrollConfirmationReference} onChange={(e) => setPayrollConfirmationReference(e.target.value)} />
          </Field>
        </div>
      )}

      {option === SETTLE_OPTION.DEFER && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field id="settle-cycle" label="Review cycle" error={errors.reviewCycle}>
            <select id="settle-cycle" className={inputClass} value={reviewCycle} onChange={(e) => setReviewCycle(e.target.value)}>
              {REVIEW_CYCLE_OPTIONS.filter((o) => o.value !== REVIEW_CYCLE.MONTHLY).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">Review date</p>
            <p className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900">{formatReviewDate(reviewDate)}</p>
            <p className="text-xs text-gray-500">
              {formatMoney(balance)} stays outstanding until this date. At review it must be repaid or deducted from salary.
            </p>
          </div>
          <Field id="settle-defer-notes" label="Notes" required={false}>
            <textarea id="settle-defer-notes" rows={2} maxLength={500} className={confirmationInputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" variant="success" disabled={submitting} loading={submitting}>
          {option === SETTLE_OPTION.REPAY ? "Record repayment" : option === SETTLE_OPTION.PAYROLL ? "Schedule deduction" : "Defer balance"}
        </Button>
      </div>
    </form>
  );
}
