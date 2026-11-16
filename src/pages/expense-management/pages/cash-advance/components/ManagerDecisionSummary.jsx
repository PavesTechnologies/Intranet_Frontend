import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { carryForwardApi } from "@/pages/expense-management/api/carryForwardApi";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";

const TREATMENT_LABEL = {
  FULL_ADVANCE: "Full amount. Both advances stay separate.",
  REDUCED: "Reduced amount.",
  SET_OFF: "Set off an earlier balance against this advance.",
  DEFERRED: "Defer until the earlier balance is settled.",
};

const shortId = (id) => (id ? String(id).slice(0, 8) : "");
const dateOf = (value) => (value ? new Date(value).toLocaleDateString("en-IN") : "");

/**
 * What Finance reads before approving: the manager's recommendation, the live exposure (checked now, not when the
 * request was made), any exposure exception waiting for Finance's authorisation, and any set-off, which Finance must
 * put in place as a carry-forward before disbursement can happen.
 */
export default function ManagerDecisionSummary({ advance, canAct, onChanged }) {
  const cur = advance.currencyCode || "INR";
  const [balance, setBalance] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [sourceReady, setSourceReady] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    cashAdvanceApi
      .approvalBalance(advance.advanceId)
      .then((b) => {
        if (!cancelled) setBalance(b);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [advance.advanceId]);

  const decision = balance?.managerDecision ?? null;
  const setOff = decision?.treatment === "SET_OFF" ? decision : null;
  const sourceId = setOff?.setOffSourceAdvanceId ?? null;
  const setOffAmount = Number(setOff?.setOffAmount) || 0;
  const source = sourceId ? (balance?.otherOpenAdvances || []).find((o) => o.advanceId === sourceId) : null;
  const sourceReadyOk = sourceReady !== null && sourceReady >= setOffAmount && setOffAmount > 0;

  useEffect(() => {
    if (!sourceId) return undefined;
    let cancelled = false;
    carryForwardApi
      .getReady(sourceId)
      .then((r) => {
        if (!cancelled) setSourceReady(Number(r?.readyAmount) || 0);
      })
      .catch(() => {
        if (!cancelled) setSourceReady(0);
      });
    return () => {
      cancelled = true;
    };
  }, [sourceId]);

  const proposeCarryForward = async () => {
    setBusy(true);
    try {
      await carryForwardApi.markReady({
        advanceId: sourceId,
        amount: setOffAmount,
        reason: `Set off against advance ${shortId(advance.advanceId)} as recommended by the manager`,
      });
      setSourceReady(setOffAmount);
      showStatusToast("Carry-forward proposed. Disbursement can proceed once it is in place.", "success", 6000);
      onChanged?.();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Could not propose the carry-forward", "error", 8000);
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <Notice tone="amber" icon={AlertTriangle}>
        Could not load the manager's recommendation or the live balance. Check them before approving.
      </Notice>
    );
  }

  if (!balance) {
    return <p className="text-xs text-gray-500">Checking the manager's recommendation and the live balance…</p>;
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-700">
      <p className="text-sm font-semibold text-gray-900">Before you approve</p>

      {/* 1. Manager's recommendation */}
      <section className="space-y-1">
        <p className="font-medium text-gray-800">Manager's recommendation</p>
        {decision ? (
          <>
            <p>{TREATMENT_LABEL[decision.treatment] || decision.treatment}</p>
            {decision.justification && <p className="text-gray-600">“{decision.justification}”</p>}
            <p className="text-gray-400">
              {decision.decidedBy ? `By ${decision.decidedBy}` : ""}
              {decision.decidedAt ? ` on ${dateOf(decision.decidedAt)}` : ""}
            </p>
          </>
        ) : (
          <p className="text-gray-500">No recommendation recorded. Approving pays the requested amount in full.</p>
        )}
      </section>

      {/* 2. Live balance */}
      <section className="space-y-1 border-t border-gray-100 pt-3">
        <p className="font-medium text-gray-800">Employee balance, checked now</p>
        <dl className="space-y-1">
          <Line label="Still owed on other advances" value={formatMoney(balance.pendingBalanceTotal, cur)} />
          <Line label="Approved or pending, not paid" value={formatMoney(balance.committedAmount, cur)} />
          <Line label="This request" value={formatMoney(balance.requestedAmount, cur)} />
          <Line label="Total exposure" value={formatMoney(balance.potentialExposure, cur)} strong />
        </dl>
        {balance.exposureLimit != null ? (
          <p className="text-gray-500">Company limit: {formatMoney(balance.exposureLimit, cur)}</p>
        ) : (
          <p className="text-gray-500">No exposure limit is configured.</p>
        )}

        {balance.exceedsLimit && (
          <Notice tone="rose" icon={AlertTriangle}>
            Above the limit by {formatMoney(balance.excessOverLimit, cur)}.
            {decision?.exposureExceptionJustification ? (
              <>
                {" "}The manager's reason: “{decision.exposureExceptionJustification}”.
                {decision.exposureExceptionAuthorized
                  ? " Finance has already authorised this exception."
                  : " Approving authorises this exception."}
              </>
            ) : (
              " No exception reason was given, so the manager cannot approve this request as it stands."
            )}
          </Notice>
        )}
      </section>

      {/* 3. Set-off */}
      {setOff && (
        <section className="space-y-2 border-t border-gray-100 pt-3">
          <p className="font-medium text-gray-800">Set-off to put in place</p>
          <p>
            Carry <span className="font-semibold">{formatMoney(setOffAmount, cur)}</span> from{" "}
            <span className="font-medium">{source?.title || "the earlier advance"}</span>{" "}
            <span className="font-mono text-[10px] text-gray-400">{shortId(sourceId)}</span> to this employee's next approved INR advance.
          </p>
          {sourceReady === null ? (
            <p className="text-gray-500">Checking the carry-forward…</p>
          ) : sourceReadyOk ? (
            <Notice tone="emerald" icon={CheckCircle2}>
              Carry-forward is in place. Finance can approve and disburse the difference.
            </Notice>
          ) : (
            <>
              <Notice tone="amber" icon={AlertTriangle}>
                Not in place yet. Disbursement waits until the carry-forward is proposed.
              </Notice>
              {canAct && (
                <div className="flex justify-end">
                  <Button variant="outline" size="small" disabled={busy} loading={busy} onClick={proposeCarryForward}>
                    Propose carry-forward of {formatMoney(setOffAmount, cur)}
                  </Button>
                </div>
              )}
            </>
          )}
          <p className="flex gap-1.5 text-[11px] text-gray-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            The carry-forward is added to the next INR advance approved for this employee. If another advance is approved first, it lands there.
          </p>
        </section>
      )}
    </div>
  );
}

function Line({ label, value, strong = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? "font-semibold text-gray-900" : "text-gray-600"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold text-gray-900" : "text-gray-700"}`}>{value}</dd>
    </div>
  );
}

const TONE = {
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  rose: "border-rose-200 bg-rose-50 text-rose-900",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

function Notice({ tone, icon: Icon, children }) {
  return (
    <div className={`flex gap-2 rounded-lg border px-3 py-2 ${TONE[tone]}`}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p className="min-w-0 flex-1">{children}</p>
    </div>
  );
}
