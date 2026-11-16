import React from "react";
import { Calculator } from "lucide-react";

const formatMoney = (amount, currencyCode = "INR") => {
  const num = Number(amount) || 0;
  return `${currencyCode} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Stage 6 - Cash Advance Adjustment Card
 * Calculates:
 * - Advance Disbursed Amount (A)
 * - Verified / Eligible Expense Amount (E)
 * - Outstanding Balance to return by employee (B = max(0, A - E))
 * - Additional Reimbursement Payout due to employee (R = max(0, E - A))
 * - Adjustment Status: PARTIALLY ADJUSTED vs ADJUSTED / FULLY ADJUSTED
 */
export default function CashAdvanceAdjustmentCard({
  advanceAmount = 0,
  verifiedExpenseAmount = 0,
  currencyCode = "INR",
  status = "",
  outstandingBalance = null,
  carriedOutAmount = 0,
  salaryDeductedAmount = 0,
  expenseReport = null,
  className = "",
}) {
  const A = Number(advanceAmount) || 0;
  const E = Number(verifiedExpenseAmount) || 0;
  const C = Number(carriedOutAmount) || 0;
  const D = Number(salaryDeductedAmount) || 0;
  const persistedOutstanding = outstandingBalance != null ? Math.max(0, Number(outstandingBalance) || 0) : null;
  const netBalance = persistedOutstanding != null ? persistedOutstanding : Math.max(0, A - E);
  const excessReimbursement = Math.max(0, E - A);
  const upperStatus = (status || "").toUpperCase();
  const isSettled = upperStatus === "SETTLED" || upperStatus === "CLOSED";
  const isFullyAdjusted = (E >= A && A > 0) || upperStatus === "ADJUSTED" || upperStatus === "FULLY_ADJUSTED";
  const isPartiallyAdjusted = E > 0 && E < A;

  let adjustmentBadge = (
    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      Pending Adjustment
    </span>
  );

  if (isSettled) {
    adjustmentBadge = (
      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        Settled & Closed
      </span>
    );
  } else if (E === A && A > 0) {
    adjustmentBadge = (
      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        Fully Settled
      </span>
    );
  } else if (excessReimbursement > 0) {
    adjustmentBadge = (
      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200">
        Additional Reimbursement Due
      </span>
    );
  } else if (isPartiallyAdjusted) {
    adjustmentBadge = (
      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
        Partially Adjusted
      </span>
    );
  }

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4 ${className}`}>
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
            <Calculator size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0a174e] uppercase tracking-wider">
              Stage 6 – Advance Adjustment Details
            </h4>
            <p className="text-[11px] text-gray-500">
              Verified expense adjustment calculation & remaining balance breakdown
            </p>
          </div>
        </div>
        {adjustmentBadge}
      </div>

      {/* One result line: the calculation once, then what happens next. The amounts themselves are shown above. */}
      <div className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${
        netBalance > 0 ? "bg-amber-50/60 border-amber-200" : excessReimbursement > 0 ? "bg-purple-50/60 border-purple-200" : "bg-emerald-50/40 border-emerald-200"
      }`}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Settlement result</p>
          <p className={`text-sm font-bold mt-0.5 ${netBalance > 0 ? "text-amber-700" : excessReimbursement > 0 ? "text-purple-700" : "text-emerald-700"}`}>
            {netBalance > 0
              ? `Employee returns ${formatMoney(netBalance, currencyCode)}`
              : excessReimbursement > 0
                ? `Company reimburses ${formatMoney(excessReimbursement, currencyCode)}`
                : "Fully settled, no cash to return"}
          </p>
        </div>
        <p className="text-[11px] text-gray-500">
          {formatMoney(A, currencyCode)} advance
          {C > 0 ? <> − {formatMoney(C, currencyCode)} carried forward</> : null} − {formatMoney(E, currencyCode)} approved
          {D > 0 ? <> − {formatMoney(D, currencyCode)} salary deducted</> : null} ={" "}
          {A - C - E - D >= 0
            ? formatMoney(A - C - E - D, currencyCode)
            : `${formatMoney(Math.abs(A - C - E - D), currencyCode)} payable to employee`}
        </p>
      </div>

    </div>
  );
}
