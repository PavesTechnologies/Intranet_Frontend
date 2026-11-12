import React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";

// A compact view of what the employee owes, from the advance list. The eligible amount for "Cash Advance + Outstanding"
// is not shown here: the server calculates it, and it appears in the calculation preview.
export default function OutstandingBalanceSummary({ loading, totalOutstanding, openCount, hasOverdue, overdueMessage, currency = "INR" }) {
  if (loading) {
    return <div className="h-12 animate-pulse rounded-lg bg-gray-100" aria-label="Checking your outstanding balance" />;
  }

  if (hasOverdue) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800" role="alert">
        <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>{overdueMessage}</p>
      </div>
    );
  }

  if (totalOutstanding <= 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        <CheckCircle2 size={14} aria-hidden="true" />
        You have no outstanding cash advance.
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
      <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>
        You still owe <span className="font-semibold">{formatMoney(totalOutstanding, currency)}</span> across {openCount} open{" "}
        {openCount === 1 ? "advance" : "advances"}.
      </p>
    </div>
  );
}
