import React, { useState } from "react";
// import PaymentRequestPanel from "@/pages/expense-management/pages/cash-advance/components/PaymentRequestPanel";
import SalaryDeductionPanel from "@/pages/expense-management/pages/cash-advance/components/SalaryDeductionPanel";
import CarryForwardPanel from "@/pages/expense-management/pages/cash-advance/components/CarryForwardPanel";

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
            onChanged={onSettled}
          />
        </div>
        */}

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

        {option === SETTLE_OPTION.SALARY && (
          <SalaryDeductionPanel
            advanceId={advanceId}
            outstanding={balance}
            currencyCode={currencyCode}
            onChanged={onSettled}
          />
        )}

        {option === SETTLE_OPTION.DEFER && (
          <CarryForwardPanel
            advanceId={advanceId}
            currencyCode={currencyCode}
            outstanding={balance}
            onChanged={onSettled}
          />
        )}
      </div>
    </div>
  );
}
