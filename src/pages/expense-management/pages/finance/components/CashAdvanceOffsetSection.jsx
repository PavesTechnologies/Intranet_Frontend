import React, { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";

const amountOf = (value) => Number(value) || 0;

/**
 * Read-only view of the cash advance this report settles.
 *
 * A report is linked to exactly one advance when it is created, and approval reconciles the report against THAT advance
 * automatically (ApprovalWorkflowServiceImpl.autoOffsetCashAdvance). Finance therefore never picks an advance here:
 * offering the employee's other open advances let a reviewer net the report against the wrong one - and because the
 * automatic step skips a report that already has an offset, the linked advance would then never be settled.
 * This section only shows which advance it is and how the report will be split.
 */
export default function CashAdvanceOffsetSection({ cashAdvanceId, reportTotal, currencyCode }) {
  const [advance, setAdvance] = useState(undefined); // undefined = loading, null = could not load

  useEffect(() => {
    if (!cashAdvanceId) {
      setAdvance(null);
      return undefined;
    }
    let cancelled = false;
    setAdvance(undefined);
    cashAdvanceApi
      .getById(cashAdvanceId)
      .then((res) => !cancelled && setAdvance(res?.data?.data ?? res?.data ?? null))
      .catch(() => !cancelled && setAdvance(null));
    return () => {
      cancelled = true;
    };
  }, [cashAdvanceId]);

  if (advance === undefined) {
    return <p className="text-xs text-gray-500">Loading the linked cash advance…</p>;
  }
  if (!advance) {
    return <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">The linked cash advance could not be loaded.</p>;
  }

  const cur = advance.currencyCode || currencyCode;
  const total = amountOf(reportTotal);
  const outstanding = amountOf(advance.outstandingBalance);
  const covered = Math.min(total, outstanding);
  const paid = total - covered;

  return (
    <div className="space-y-3 text-xs text-gray-700">
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Settles this advance</p>
        <p className="mt-0.5 truncate text-sm font-medium text-gray-900">{advance.purpose || advance.title || "Cash advance"}</p>
        <p className="mt-0.5 text-gray-500">
          Received {formatMoney(advance.disbursedAmount ?? advance.amount, cur)} · Still owed{" "}
          <span className="font-semibold text-amber-700">{formatMoney(outstanding, cur)}</span>
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="mb-2 font-medium text-gray-800">How this report will be split</p>
        <dl className="space-y-1.5">
          <Row label="Report total" value={formatMoney(total, cur)} />
          <Row label="Covered by this advance" value={`− ${formatMoney(covered, cur)}`} tone="text-gray-900" />
          <Row label="Paid to the employee" value={formatMoney(paid, cur)} strong />
        </dl>
        <p className="mt-2 border-t border-gray-200 pt-2 text-gray-500">
          The advance will still owe {formatMoney(outstanding - covered, cur)} after this.
        </p>
      </div>

      <p className="flex items-start gap-1.5 rounded-md bg-blue-50 px-3 py-2 text-blue-900">
        <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        This is recorded automatically against this advance when the report is approved. No action is needed here.
      </p>
    </div>
  );
}

function Row({ label, value, strong = false, tone = "text-gray-700" }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? "font-semibold text-gray-900" : "text-gray-600"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold text-gray-900" : tone}`}>{value}</dd>
    </div>
  );
}
