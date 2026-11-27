import React, { useState } from "react";
import Modal from "@/components/Modal/modal";
import Button from "@/components/Button/Button";
import SalaryDeductionPanel from "@/pages/expense-management/pages/cash-advance/components/SalaryDeductionPanel";
import CarryForwardPanel from "@/pages/expense-management/pages/cash-advance/components/CarryForwardPanel";
import { SETTLEMENT_LOCK, useSettlementLock } from "@/pages/expense-management/pages/cash-advance/components/settlementLock";

/**
 * Settlement of a cash advance balance. One shared modal for the settlement list.
 *
 * Two ways to clear the balance, as agreed:
 * - Salary deduction: Finance requests the recovery through payroll (SalaryDeductionPanel).
 * - Carry forward to next expense: one click marks the balance ready; it is added to the next approved advance automatically.
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

const formatMoney = (amount, currency) =>
  `${currency || "INR"} ${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * Maps a settlement-list row or an advance to the shape this modal needs.
 *
 * Pass {@code figures} (from useAdvanceFigures / settlementFiguresFor) whenever the list has them, so the modal shows
 * exactly what the row shows: owed, expenses consumed from the server's utilization, and what is still outstanding
 * after salary deductions, repayments and carry-forwards. Without figures it falls back to the advance's own fields.
 */
export const toSettlementAdvance = (adv, figures = null) => {
  if (!adv) return null;
  const base = {
    advanceId: adv.advanceId || adv.id,
    advanceNumber: adv.advanceNumber || `#${String(adv.advanceId || adv.id || "").slice(0, 8)}`,
    employeeName: adv.employeeName || adv.employee?.name || adv.employeeId || "",
    employeeId: adv.employeeId || "",
    title: adv.title || "",
    currencyCode: adv.currencyCode || "INR",
  };
  if (figures) {
    return {
      ...base,
      amount: Number(figures.owed) || 0,
      carriedIn: Number(figures.carriedIn) || 0,
      verifiedExpense: Number(figures.consumed) || 0,
      approvedExpense: figures.approvedConsumed,
      reportCount: Array.isArray(figures.reports) ? figures.reports.length : 0,
      remaining: Number(figures.remaining) || 0,
      recovered: (Number(figures.salaryDeducted) || 0) + (Number(figures.otherRepaid) || 0),
      carriedForward: Number(figures.carriedForward) || 0,
      owedToEmployee: Number(figures.owedToEmployee) || 0,
      balance: Number(figures.outstanding) || 0,
    };
  }
  const amount = Number(adv.amount) || 0;
  const verified = Number(adv.verifiedExpenseAmount || adv.expenseAmount || adv.totalExpenses || 0);
  const balance = Number(adv.outstandingBalance ?? Math.max(0, amount - verified));
  return {
    ...base,
    amount,
    carriedIn: 0,
    verifiedExpense: verified,
    approvedExpense: null,
    reportCount: 0,
    remaining: Math.max(0, amount - verified),
    recovered: 0,
    carriedForward: 0,
    owedToEmployee: Math.max(0, verified - amount),
    balance,
  };
};

function Figure({ label, value, hint, tone = "text-gray-900" }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-base font-semibold tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}

export default function SettlementModal({ isOpen, advance, loading = false, onClose, onSettled }) {
  const [choice, setChoice] = useState(SETTLEMENT_CHOICE.SALARY);
  // Once carry-forward or a salary request is set, the options stay locked until it is cancelled.
  const lock = useSettlementLock(advance?.advanceId, Boolean(isOpen && advance));

  if (!advance) return null;

  const handleChanged = () => {
    lock.reload();
    onSettled?.();
  };
  const activeChoice =
    lock.kind === SETTLEMENT_LOCK.CARRY_FORWARD
      ? SETTLEMENT_CHOICE.CARRY_FORWARD
      : lock.kind === SETTLEMENT_LOCK.SALARY
        ? SETTLEMENT_CHOICE.SALARY
        : choice;

  const cur = advance.currencyCode;
  const balanceIsDue = advance.balance > 0;
  const pendingApproval =
    advance.approvedExpense != null && advance.approvedExpense < advance.verifiedExpense
      ? advance.verifiedExpense - advance.approvedExpense
      : 0;
  const settledOtherwise = advance.recovered > 0 || advance.carriedForward > 0;

  const close = () => {
    setChoice(SETTLEMENT_CHOICE.SALARY);
    onClose?.();
  };

  const subtitle = [
    `Advance ${advance.advanceNumber}`,
    advance.employeeName &&
      `Employee: ${advance.employeeName}${advance.employeeId && advance.employeeId !== advance.employeeName ? ` (${advance.employeeId})` : ""}`,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <Modal isOpen={isOpen} onClose={close} title="Cash Advance Settlement" subtitle={subtitle} size="xl">
      <div className="space-y-5 text-sm">
        {advance.title && <p className="-mt-1 font-medium text-gray-800">{advance.title}</p>}

        {loading ? (
          <div className="h-28 animate-pulse rounded-lg bg-gray-100" aria-label="Loading settlement figures" />
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Figure
                label="Advance owed"
                value={formatMoney(advance.amount, cur)}
                hint={advance.carriedIn > 0 ? `incl. ${formatMoney(advance.carriedIn, cur)} brought in` : "Cash given to the employee"}
              />
              <Figure
                label="Expenses consumed"
                tone="text-sky-700"
                value={formatMoney(advance.verifiedExpense, cur)}
                hint={
                  advance.reportCount > 0
                    ? `${advance.reportCount} linked report${advance.reportCount > 1 ? "s" : ""}${
                        pendingApproval > 0 ? ` · ${formatMoney(pendingApproval, cur)} awaiting approval` : ""
                      }`
                    : "No expense report linked yet"
                }
              />
              <div className={`rounded-md border px-3 py-2 ${balanceIsDue ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Outstanding</p>
                <p className={`mt-1 text-base font-bold tabular-nums ${balanceIsDue ? "text-amber-800" : "text-emerald-700"}`}>
                  {formatMoney(advance.balance, cur)}
                </p>
                <p className={`text-[11px] ${balanceIsDue ? "text-amber-700" : "text-emerald-700"}`}>
                  {balanceIsDue
                    ? "Employee repayment due"
                    : advance.owedToEmployee > 0
                      ? `Company owes employee ${formatMoney(advance.owedToEmployee, cur)}`
                      : "Nothing outstanding"}
                </p>
              </div>
            </div>

            {/* How the outstanding figure is reached, so Finance can check it against the list. */}
            <div className="mt-3 border-t border-gray-200 pt-3 text-xs text-gray-600 tabular-nums">
              {formatMoney(advance.amount, cur)} owed − {formatMoney(advance.verifiedExpense, cur)} expenses
              {settledOtherwise && (
                <>
                  {" "}= {formatMoney(advance.remaining, cur)} balance
                  {advance.recovered > 0 && <> − {formatMoney(advance.recovered, cur)} recovered</>}
                  {advance.carriedForward > 0 && <> − {formatMoney(advance.carriedForward, cur)} carried forward</>}
                </>
              )}
              {" "}= <span className="font-semibold text-gray-900">{formatMoney(advance.balance, cur)} outstanding</span>
            </div>
          </div>
        )}

        {lock.kind && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            {lock.kind === SETTLEMENT_LOCK.CARRY_FORWARD
              ? `Carry-forward is set: ${formatMoney(lock.amount, advance.currencyCode)} is ready for the next approved advance. Settlement options are locked; cancel the carry-forward below to change it.`
              : "A salary deduction is already requested for this advance. Settlement options are locked; cancel the request below to change it."}
          </div>
        )}

        {!lock.kind && !loading && balanceIsDue && (
        <fieldset>
          <legend className="mb-2 font-semibold text-gray-900">Settlement action</legend>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2" role="radiogroup" aria-label="Settlement action">
            {CHOICES.map((opt) => {
              const selected = choice === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    selected ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="settlement-choice"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setChoice(opt.value)}
                    className="mt-1 accent-emerald-600"
                  />
                  <span>
                    <span className="block font-medium text-gray-900">{opt.label}</span>
                    <span className="block text-xs text-gray-500">{opt.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        )}

        {loading ? null : activeChoice === SETTLEMENT_CHOICE.SALARY && balanceIsDue && (
          <SalaryDeductionPanel
            advanceId={advance.advanceId}
            outstanding={advance.balance}
            currencyCode={advance.currencyCode}
            onChanged={handleChanged}
          />
        )}

        {!loading && !balanceIsDue && !lock.kind && (
          <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">This advance has no balance to recover.</p>
        )}

        {!loading && activeChoice === SETTLEMENT_CHOICE.CARRY_FORWARD && balanceIsDue && (
          <CarryForwardPanel
            advanceId={advance.advanceId}
            currencyCode={advance.currencyCode}
            outstanding={advance.balance}
            onChanged={handleChanged}
          />
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
