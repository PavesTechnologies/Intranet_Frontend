import React, { useState } from "react";
import Modal from "@/components/Modal/modal";
import Button from "@/components/Button/Button";
import SalaryDeductionPanel from "@/pages/expense-management/pages/cash-advance/components/SalaryDeductionPanel";

/**
 * Settlement of a cash advance balance. One shared modal for the settlement list.
 *
 * Two ways to clear the balance, as agreed:
 * - Salary deduction: Finance requests the recovery through payroll (SalaryDeductionPanel).
 * - Carry forward to next expense: not enabled by policy yet, so it is shown but not submitted.
 *
 * The employee's own payment is requested and recorded on the advance's settlement page, not here.
 */

export const SETTLEMENT_CHOICE = {
  SALARY: "SALARY",
  CARRY_FORWARD: "CARRY_FORWARD",
};

const CHOICES = [
  { value: SETTLEMENT_CHOICE.SALARY, label: "Salary deduction", hint: "Recovered from salary in a payroll month Finance chooses" },
  { value: SETTLEMENT_CHOICE.CARRY_FORWARD, label: "Carry forward to next expense", hint: "The balance is set against the next expense report" },
];

const NOT_ENABLED_MESSAGE =
  "Carry forward is not enabled yet. It needs the Finance policy to be approved first.";

const formatMoney = (amount, currency) =>
  `${currency || "INR"} ${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Maps a settlement-list row or an advance to the shape this modal needs. */
export const toSettlementAdvance = (adv) => {
  if (!adv) return null;
  const amount = Number(adv.amount) || 0;
  const verified = Number(adv.verifiedExpenseAmount || adv.expenseAmount || adv.totalExpenses || 0);
  const balance = Number(adv.outstandingBalance ?? amount);
  return {
    advanceId: adv.advanceId || adv.id,
    advanceNumber: adv.advanceNumber || `#${String(adv.advanceId || adv.id || "").slice(0, 8)}`,
    employeeName: adv.employeeName || adv.employee?.name || adv.employeeId || "",
    amount,
    verifiedExpense: verified,
    balance,
    currencyCode: adv.currencyCode || "INR",
  };
};

export default function SettlementModal({ isOpen, advance, onClose, onSettled }) {
  const [choice, setChoice] = useState(SETTLEMENT_CHOICE.SALARY);

  if (!advance) return null;

  const balanceIsDue = advance.balance > 0;
  const difference = advance.amount - advance.verifiedExpense;

  const close = () => {
    setChoice(SETTLEMENT_CHOICE.SALARY);
    onClose?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Cash Advance Settlement"
      subtitle={`Advance ${advance.advanceNumber} • Employee: ${advance.employeeName}`}
      size="xl"
    >
      <div className="space-y-5 text-sm">
        <div className="grid grid-cols-1 gap-3 rounded-lg bg-gray-50 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Advance amount</p>
            <p className="mt-1 text-base font-semibold text-gray-900">{formatMoney(advance.amount, advance.currencyCode)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Total expenses</p>
            <p className="mt-1 text-base font-semibold text-gray-900">{formatMoney(advance.verifiedExpense, advance.currencyCode)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Balance</p>
            <div className="mt-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
              <p className="font-semibold text-amber-800">{formatMoney(advance.balance, advance.currencyCode)}</p>
              <p className="text-xs text-amber-700">
                {balanceIsDue
                  ? difference >= 0
                    ? "Employee repayment due"
                    : "Company reimbursement due"
                  : "Nothing outstanding"}
              </p>
            </div>
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 font-semibold text-gray-900">Settlement action</legend>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2" role="radiogroup" aria-label="Settlement action">
            {CHOICES.map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 hover:border-gray-300">
                <input
                  type="radio"
                  name="settlement-choice"
                  value={opt.value}
                  checked={choice === opt.value}
                  onChange={() => setChoice(opt.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium text-gray-900">{opt.label}</span>
                  <span className="block text-xs text-gray-500">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {choice === SETTLEMENT_CHOICE.SALARY && balanceIsDue && (
          <SalaryDeductionPanel
            advanceId={advance.advanceId}
            outstanding={advance.balance}
            currencyCode={advance.currencyCode}
            onChanged={() => onSettled?.()}
          />
        )}

        {choice === SETTLEMENT_CHOICE.SALARY && !balanceIsDue && (
          <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">This advance has no balance to recover.</p>
        )}

        {choice === SETTLEMENT_CHOICE.CARRY_FORWARD && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{NOT_ENABLED_MESSAGE}</p>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
          <Button type="button" variant="outline" onClick={close}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
