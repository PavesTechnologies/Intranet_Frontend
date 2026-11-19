import React, { useState } from "react";
// import PaymentRequestPanel from "@/pages/expense-management/pages/cash-advance/components/PaymentRequestPanel";
import SalaryDeductionPanel from "@/pages/expense-management/pages/cash-advance/components/SalaryDeductionPanel";
import CarryForwardPanel from "@/pages/expense-management/pages/cash-advance/components/CarryForwardPanel";
import { SETTLEMENT_LOCK, useSettlementLock } from "@/pages/expense-management/pages/cash-advance/components/settlementLock";

/**
 * The two ways to clear an outstanding balance after the employee has been asked to pay:
 * - Salary deduction: Finance requests the recovery through payroll (see SalaryDeductionPanel).
 * - Carry forward to the next approved advance: marked ready here, added automatically when that advance is approved (see CarryForwardPanel).
 *
 * The employee's own payment is not a separate option. It is recorded against the payment request.
 */
export const SETTLE_OPTION = {
  SALARY: "SALARY",
  DEFER: "DEFER",
};

const OPTIONS = [
  { value: SETTLE_OPTION.SALARY, label: "Salary deduction", hint: "Recovered from salary in a payroll month Finance chooses." },
  { value: SETTLE_OPTION.DEFER, label: "Carry forward to next expense", hint: "The balance moves to another approved advance for this employee, once Finance approves it." },
];

export default function SettleBalancePanel({ advanceId, outstanding, currencyCode, advanceNumber, onSettled }) {
  const [option, setOption] = useState(SETTLE_OPTION.SALARY);
  const balance = Number(outstanding) || 0;
  // Once carry-forward or a salary request is set, the options stay locked until it is cancelled.
  const lock = useSettlementLock(advanceId);
  const handleChanged = () => {
    lock.reload();
    onSettled?.();
  };
  const effectiveOption =
    lock.kind === SETTLEMENT_LOCK.CARRY_FORWARD
      ? SETTLE_OPTION.DEFER
      : lock.kind === SETTLEMENT_LOCK.SALARY
        ? SETTLE_OPTION.SALARY
        : option;

  const formatMoney = (amount) =>
    `${currencyCode || "INR"} ${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Settle remaining balance</p>
          <p className="text-xs text-gray-600">
            Outstanding: {formatMoney(balance)} {advanceNumber ? `· ${advanceNumber}` : ""}
          </p>
        </div>

        {/* Repayment by the employee is not part of the current flows. Only salary deduction and carry-forward remain.
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-800">Step 1 · Ask the employee to pay</p>
          <PaymentRequestPanel
            advanceId={advanceId}
            outstanding={balance}
            currencyCode={currencyCode}
            onChanged={handleChanged}
          />
        </div>
        */}

        {!lock.kind && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-800">Choose how it is cleared</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2" role="radiogroup" aria-label="Settlement option">
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
                    onChange={() => setOption(opt.value)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-semibold text-gray-900">{opt.label}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">{opt.hint}</span>
                </label>
              );
            })}
          </div>
        </div>
        )}

        {lock.kind && (
          <div className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-900">
            {lock.kind === SETTLEMENT_LOCK.CARRY_FORWARD
              ? `Carry-forward is set: ${formatMoney(lock.amount)} is ready for the next approved advance. Settlement options are locked; cancel the carry-forward below to change it.`
              : "A salary deduction is already requested for this advance. Settlement options are locked; cancel the request below to change it."}
          </div>
        )}

        {effectiveOption === SETTLE_OPTION.SALARY && (
          <SalaryDeductionPanel
            advanceId={advanceId}
            outstanding={balance}
            currencyCode={currencyCode}
            onChanged={handleChanged}
          />
        )}

        {effectiveOption === SETTLE_OPTION.DEFER && (
          <CarryForwardPanel
            advanceId={advanceId}
            currencyCode={currencyCode}
            outstanding={balance}
            onChanged={handleChanged}
          />
        )}
      </div>
    </div>
  );
}
