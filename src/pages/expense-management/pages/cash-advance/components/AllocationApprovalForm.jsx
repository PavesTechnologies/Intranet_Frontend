import React, { useState } from "react";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { useAuth } from "@/contexts/AuthContext";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";

// Statuses the server treats as eligible for a rollover. The server decides again on approval; this list only shows the
// figures Finance is choosing between.
const ELIGIBLE = ["DISBURSED", "IN_PROGRESS", "SETTLEMENT_PENDING", "PARTIALLY_SETTLED", "PARTIALLY_ADJUSTED", "ADJUSTED"];

const numOrNull = (value) => (value === "" || value == null ? null : Number(value));

/**
 * Finance's approval of a Cash Advance + Outstanding request. Sets the rollover, the approved cash, and (for a Finance
 * executive only) an overdue exception. The server recalculates and refuses anything that does not reconcile.
 */
export default function AllocationApprovalForm({ advance, balance, onApproved }) {
  const { hasRole } = useAuth();
  // Overdue exceptions are for Finance executives only; the server checks the same role again.
  const isExecutive = hasRole(["FINANCE_EXECUTIVE", "Finance_Executive"]);
  const cur = advance.currencyCode || "INR";
  const requestedCash = Number(advance.additionalAmountRequested) || 0;
  const others = balance?.otherOpenAdvances || [];
  const eligible = others
    .filter((o) => ELIGIBLE.includes(String(o.status || "").toUpperCase()))
    .reduce((sum, o) => sum + (Number(o.outstandingBalance) || 0), 0);
  const overdueAdvances = isExecutive ? others.filter((o) => String(o.status || "").toUpperCase() === "OVERDUE") : [];

  const [rollover, setRollover] = useState("");
  const [cash, setCash] = useState(String(requestedCash));
  const [reduction, setReduction] = useState("");
  const [overdueId, setOverdueId] = useState("");
  const [overdueAmount, setOverdueAmount] = useState("");
  const [overdueReason, setOverdueReason] = useState("");
  const [busy, setBusy] = useState(false);

  const overdueChosen = overdueAdvances.find((o) => o.advanceId === overdueId);
  const maxRollover = eligible + (overdueChosen ? Number(overdueAmount) || 0 : 0);
  const rolloverValue = numOrNull(rollover);
  const reductionNeeded = rolloverValue != null ? rolloverValue < maxRollover : false;

  const submit = async () => {
    setBusy(true);
    try {
      await cashAdvanceApi.approveAllocation(advance.advanceId, {
        rolloverAmount: rolloverValue,
        approvedCashAmount: numOrNull(cash),
        reductionJustification: reduction.trim() || null,
        overdueSourceAdvanceId: overdueId || null,
        overdueAmount: overdueId ? numOrNull(overdueAmount) : null,
        overdueJustification: overdueId ? overdueReason.trim() || null : null,
      });
      showStatusToast("Allocation approved. The rollover and the cash are recorded.", "success", 6000);
      onApproved?.();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "The allocation could not be approved", "error", 8000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/40 p-4 text-xs" aria-label="Approve allocation">
      <p className="text-sm font-semibold text-gray-900">Approve the allocation</p>
      <dl className="grid grid-cols-2 gap-2">
        <dt className="text-gray-600">Eligible balance to roll over</dt>
        <dd className="text-right font-medium tabular-nums">{formatMoney(eligible, cur)}</dd>
        <dt className="text-gray-600">Cash requested now</dt>
        <dd className="text-right font-medium tabular-nums">{formatMoney(requestedCash, cur)}</dd>
      </dl>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-medium text-gray-700">Rollover amount</span>
          <input type="number" min="0" step="0.01" value={rollover} placeholder={String(maxRollover)}
            onChange={(e) => setRollover(e.target.value)} className="w-full rounded-md border border-gray-300 p-2" />
          <span className="mt-1 block text-[11px] text-gray-500">Leave blank to roll over the full eligible balance.</span>
        </label>
        <label className="block">
          <span className="mb-1 block font-medium text-gray-700">Approved cash</span>
          <input type="number" min="0" step="500" value={cash} onChange={(e) => setCash(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-2" />
          <span className="mt-1 block text-[11px] text-gray-500">Can be lower than requested, never higher.</span>
        </label>
      </div>

      {reductionNeeded && (
        <label className="block">
          <span className="mb-1 block font-medium text-gray-700">Why is the rollover less than the eligible balance?</span>
          <textarea rows={2} value={reduction} onChange={(e) => setReduction(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-2" />
          <span className="mt-1 block text-[11px] text-gray-500">The rest stays outstanding on its own advance.</span>
        </label>
      )}

      {isExecutive && overdueAdvances.length > 0 && (
        <fieldset className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
          <legend className="px-1 text-[11px] font-semibold uppercase text-amber-800">Overdue exception (Finance executive)</legend>
          <select value={overdueId} onChange={(e) => setOverdueId(e.target.value)} className="w-full rounded-md border border-gray-300 p-2">
            <option value="">No overdue advance</option>
            {overdueAdvances.map((o) => (
              <option key={o.advanceId} value={o.advanceId}>
                {`${o.title || "Cash advance"} · ${String(o.advanceId).slice(0, 8)} · ${formatMoney(o.outstandingBalance, cur)} owed`}
              </option>
            ))}
          </select>
          {overdueId && (
            <>
              <input type="number" min="0" step="0.01" value={overdueAmount} placeholder="Amount to roll over from it"
                onChange={(e) => setOverdueAmount(e.target.value)} className="w-full rounded-md border border-gray-300 p-2" />
              <textarea rows={2} value={overdueReason} placeholder="Reason for rolling over an overdue advance"
                onChange={(e) => setOverdueReason(e.target.value)} className="w-full rounded-md border border-gray-300 p-2" />
            </>
          )}
        </fieldset>
      )}

      <div className="flex justify-end">
        <Button variant="success" disabled={busy} loading={busy} onClick={submit} className="text-xs">
          Approve allocation
        </Button>
      </div>
    </section>
  );
}
