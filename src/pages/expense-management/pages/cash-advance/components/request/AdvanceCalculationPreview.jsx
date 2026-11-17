import React from "react";
import { AlertTriangle } from "lucide-react";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";
import { ADVANCE_TYPE } from "./AdvanceTypeSelector";

// Shows the server's calculation. Nothing here is recalculated in the browser.
export default function AdvanceCalculationPreview({ preview }) {
  if (!preview) return null;
  const cur = preview.currencyCode || "INR";
  const isPlus = preview.requestType === ADVANCE_TYPE.ADVANCE_PLUS_OUTSTANDING;

  return (
    <section className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/40 p-4" aria-label="Calculation preview">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Calculation preview</p>
      <dl className="space-y-1.5 text-xs">
        {isPlus && <Row label="Eligible outstanding balance" value={formatMoney(preview.eligibleOutstanding, cur)} />}
        <Row label={isPlus ? "Additional cash needed now" : "Amount required"} value={formatMoney(preview.cashRequested, cur)} />
        <Row label="Total advance amount" value={formatMoney(preview.totalAdvanceAllocation, cur)} strong />
      </dl>

      {isPlus && (
        <p className="text-[11px] leading-relaxed text-gray-600">
          The eligible balance moves onto this advance when Finance approves it. Only the additional cash is paid out.
        </p>
      )}

      {!isPlus && preview.existingOutstanding > 0 && (
        <p className="text-[11px] leading-relaxed text-gray-600">
          Your existing {formatMoney(preview.existingOutstanding, cur)} stays on its own advance.
        </p>
      )}

      {preview.exceedsLimit && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            Your total exposure would be {formatMoney(preview.potentialExposure, cur)}, above the company limit of{" "}
            {formatMoney(preview.exposureLimit, cur)}. Your manager and Finance will need to approve an exception.
          </p>
        </div>
      )}
    </section>
  );
}

function Row({ label, value, strong = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? "font-semibold text-gray-900" : "text-gray-600"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "text-sm font-bold text-gray-900" : "text-gray-800"}`}>{value}</dd>
    </div>
  );
}
