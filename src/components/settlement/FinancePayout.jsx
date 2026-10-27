import React, { useEffect, useState } from "react";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import {
  DISBURSEMENT_MODE,
  DISBURSEMENT_MODE_OPTIONS,
} from "@/pages/expense-management/components/disbursement/disbursementConfirmation";

const MODE_LABEL = Object.fromEntries(DISBURSEMENT_MODE_OPTIONS.map((opt) => [opt.value, opt.label]));

/** Reference for a payout: the bank transaction reference or the UPI transaction ID. */
const referenceLabel = (mode) => (mode === DISBURSEMENT_MODE.UPI ? "UPI transaction ID" : "Transaction reference");

export const modeLabel = (mode) => MODE_LABEL[mode] || mode;

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * How Finance paid out an advance, from the settlement endpoint. Null until loaded, or when
 * Finance has not recorded a payout yet.
 */
export function useFinancePayout(advanceId, enabled = true) {
  const [payout, setPayout] = useState(null);

  useEffect(() => {
    if (!enabled || !advanceId) return undefined;
    let active = true;
    cashAdvanceApi
      .getSettlement(advanceId)
      .then((res) => {
        if (active) setPayout(res?.data?.data?.disbursement ?? res?.data?.disbursement ?? null);
      })
      .catch(() => {
        if (active) setPayout(null);
      });
    return () => {
      active = false;
    };
  }, [advanceId, enabled]);

  return payout;
}

/**
 * Shows how Finance paid the advance and, when there is a payout, the "same mode" checkbox.
 * While the checkbox is ticked the repayment can only use the payout's mode.
 */
export default function FinancePayout({ payout, sameMode, onSameModeChange }) {
  if (!payout?.mode) {
    return (
      <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
        Finance has not recorded how this advance was paid, so choose the mode for this repayment.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-md bg-blue-50 p-3 text-xs text-blue-900">
      <p className="font-semibold">Finance paid this advance by {modeLabel(payout.mode)}</p>
      <dl className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {payout.paymentDate && (
          <div>
            <dt className="inline text-blue-700">Paid on: </dt>
            <dd className="inline">{payout.paymentDate}</dd>
          </div>
        )}
        {payout.reference && (
          <div>
            <dt className="inline text-blue-700">{referenceLabel(payout.mode)}: </dt>
            <dd className="inline font-mono">{payout.reference}</dd>
          </div>
        )}
        {payout.receivedByName && (
          <div>
            <dt className="inline text-blue-700">Received by: </dt>
            <dd className="inline">{payout.receivedByName}</dd>
          </div>
        )}
        {payout.payeeUpiId && (
          <div>
            <dt className="inline text-blue-700">Payee UPI ID: </dt>
            <dd className="inline">{payout.payeeUpiId}</dd>
          </div>
        )}
        <div>
          <dt className="inline text-blue-700">Proof: </dt>
          <dd className="inline">{payout.proofOnFile ? "On file" : "Not uploaded"}</dd>
        </div>
      </dl>
      <label className="flex cursor-pointer items-center gap-2 font-medium">
        <input type="checkbox" checked={sameMode} onChange={(e) => onSameModeChange(e.target.checked)} />
        Employee returns the balance by the same mode ({modeLabel(payout.mode)})
      </label>
    </div>
  );
}
