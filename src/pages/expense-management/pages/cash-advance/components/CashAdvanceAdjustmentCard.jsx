import React from "react";
import { Calculator, ArrowUpRight, ArrowDownLeft, AlertCircle, CheckCircle2 } from "lucide-react";

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
  className = "",
}) {
  const A = Number(advanceAmount) || 0;
  const E = Number(verifiedExpenseAmount) || 0;
  const netBalance = Math.max(0, A - E);
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Advance Disbursed */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Disbursed Advance</p>
          <p className="text-base font-bold text-gray-900 mt-1">{formatMoney(A, currencyCode)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Original funds disbursed</p>
        </div>

        {/* Verified Expense Amount */}
        <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3">
          <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Verified Expenses</p>
          <p className="text-base font-bold text-blue-900 mt-1">{formatMoney(E, currencyCode)}</p>
          <p className="text-[10px] text-blue-600 mt-0.5">Approved eligible expenses</p>
        </div>

        {/* Outstanding Balance to Return */}
        <div className={`border rounded-lg p-3 ${netBalance > 0 ? "bg-amber-50/60 border-amber-200" : "bg-emerald-50/40 border-emerald-200"}`}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">Employee Repayment Due</p>
            {netBalance > 0 && <ArrowDownLeft size={14} className="text-amber-600" />}
          </div>
          <p className={`text-base font-bold mt-1 ${netBalance > 0 ? "text-amber-700" : "text-emerald-700"}`}>
            {formatMoney(netBalance, currencyCode)}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {netBalance > 0 ? "Employee owes company" : "Zero balance to return"}
          </p>
        </div>

        {/* Excess Reimbursement Due to Employee */}
        <div className={`border rounded-lg p-3 ${excessReimbursement > 0 ? "bg-purple-50/60 border-purple-200" : "bg-gray-50 border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-purple-800 uppercase tracking-wider">Additional Reimbursement</p>
            {excessReimbursement > 0 && <ArrowUpRight size={14} className="text-purple-600" />}
          </div>
          <p className={`text-base font-bold mt-1 ${excessReimbursement > 0 ? "text-purple-700" : "text-gray-400"}`}>
            {formatMoney(excessReimbursement, currencyCode)}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {excessReimbursement > 0 ? "Company owes employee" : "No excess reimbursement"}
          </p>
        </div>
      </div>
    </div>
  );
}
