import React, { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import { splitService } from "@/pages/expense-management/api/expenseReportsApi";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";

/**
 * How one reimbursed line is charged across cost centers, for Finance and AP reviewers: each split
 * share (amounts in the organization base currency) and, when the line is charged outside the
 * employee's department, their reason. Renders nothing for an ordinary single-cost-center line.
 */
export default function LineAllocationDetails({ lineItemId, allocationReason, baseCurrencyCode }) {
  const [splits, setSplits] = useState([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!lineItemId) return undefined;
    let cancelled = false;
    setFailed(false);
    splitService
      .getForReview(lineItemId)
      .then((res) => {
        if (cancelled) return;
        const payload = res.data?.data;
        setSplits(Array.isArray(payload) ? payload : []);
      })
      .catch(() => {
        if (!cancelled) {
          setSplits([]);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lineItemId]);

  if (splits.length === 0 && !allocationReason && !failed) return null;

  return (
    <div className="mt-1.5 space-y-1 text-xs">
      {splits.length > 0 && (
        <div className="rounded-md border border-indigo-100 bg-indigo-50/60 px-2 py-1.5">
          <p className="mb-0.5 flex items-center gap-1 font-semibold text-indigo-800">
            <Layers className="h-3 w-3" /> Split across {splits.length} cost centers
          </p>
          {splits.map((s) => (
            <p key={s.splitId} className="text-indigo-700">
              {s.costCenterName} — {formatMoney(s.allocatedAmount, baseCurrencyCode)}
              {s.splitType === "PERCENTAGE" && s.percentage != null ? ` (${Number(s.percentage)}%)` : ""}
            </p>
          ))}
        </div>
      )}
      {failed && <p className="text-gray-400">Split allocation unavailable.</p>}
      {allocationReason && (
        <p className="text-amber-800">
          <span className="font-semibold">Cross-department reason:</span> {allocationReason}
        </p>
      )}
    </div>
  );
}
