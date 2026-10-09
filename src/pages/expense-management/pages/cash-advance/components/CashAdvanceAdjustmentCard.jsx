import React, { useState } from "react";
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
  outstandingBalance = null,
  expenseReport = null,
  onApplyOffset = null,
  className = "",
}) {
  const A = Number(advanceAmount) || 0;
  const E = Number(verifiedExpenseAmount) || 0;
  const persistedOutstanding = outstandingBalance != null ? Math.max(0, Number(outstandingBalance) || 0) : null;
  const netBalance = persistedOutstanding != null ? persistedOutstanding : Math.max(0, A - E);
  const excessReimbursement = Math.max(0, E - A);
  const reportId = expenseReport?.reportId || expenseReport?.id || expenseReport?.expenseReportId;
  const reportReimbursable = Number(
    expenseReport?.reimbursableTotal ??
    expenseReport?.reimbursableAmount ??
    expenseReport?.totalAmount ??
    expenseReport?.amount ??
    0
  ) || 0;
  const [offsetAmount, setOffsetAmount] = useState(() => Math.min(E, persistedOutstanding != null ? persistedOutstanding : A));
  const [applyingOffset, setApplyingOffset] = useState(false);

  const maxOffset = Math.min(
    reportReimbursable > 0 ? reportReimbursable : E,
    persistedOutstanding != null ? persistedOutstanding : A
  );

  const handleApplyOffset = async () => {
    if (!onApplyOffset || !reportId) return;
    const amount = Number(offsetAmount) || 0;
    if (amount <= 0 || amount > maxOffset) return;
    setApplyingOffset(true);
    try {
      await onApplyOffset({ expenseReportId: reportId, offsetAmount: amount });
    } finally {
      setApplyingOffset(false);
    }
  };

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
            <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">Outstanding Balance to Return</p>
            {netBalance > 0 && <ArrowDownLeft size={14} className="text-amber-600" />}
          </div>
          <p className={`text-base font-bold mt-1 ${netBalance > 0 ? "text-amber-700" : "text-emerald-700"}`}>
            {formatMoney(netBalance, currencyCode)}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {persistedOutstanding != null ? (netBalance > 0 ? "Authoritative backend outstanding balance" : "Zero balance") : (netBalance > 0 ? "Employee owes company" : "Zero balance to return")}
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

      {onApplyOffset && reportId && maxOffset > 0 && !isSettled && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold text-indigo-800 uppercase tracking-wider">Apply Advance Offset</p>
              <p className="text-[10px] text-indigo-700 mt-0.5">Offset cannot exceed the report reimbursable amount or outstanding advance balance.</p>
            </div>
            <span className="text-xs font-bold text-indigo-800">Max: {formatMoney(maxOffset, currencyCode)}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-gray-600 mb-1">Offset Amount</label>
              <input
                type="number"
                min="0"
                max={maxOffset}
                step="0.01"
                value={offsetAmount}
                onChange={(e) => setOffsetAmount(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyOffset}
              disabled={applyingOffset || Number(offsetAmount) <= 0 || Number(offsetAmount) > maxOffset}
              className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {applyingOffset ? "Applying..." : "Apply Offset"}
            </button>
          </div>
          {E > 0 && E < A && (
            <p className="text-[10px] text-amber-700 flex items-center gap-1"><AlertCircle size={12} /> If verified expenses are less than the advance, the residual remains outstanding and may enter recovery (ERR-08).</p>
          )}
        </div>
      )}
    </div>
  );
}
