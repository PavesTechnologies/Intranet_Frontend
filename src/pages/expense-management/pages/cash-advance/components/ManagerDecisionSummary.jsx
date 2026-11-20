import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { carryForwardApi } from "@/pages/expense-management/api/carryForwardApi";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";
import EmployeeLabel from "@/pages/expense-management/approval-engine/components/EmployeeLabel";

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

  const pay = payoutOf(advance, balance);
  const reducedNow = decision?.treatment === "REDUCED" && pay.reduction > 0;

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-700">
      <p className="text-sm font-semibold text-gray-900">Before you approve</p>

      {/* 0. The money: what was asked for, what changed, and the cash that leaves the company on approval */}
      <section
        aria-label="Amount on approval"
        className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Amount on approval</p>
        <dl className="mt-2 space-y-1.5">
          <Line label="Employee requested" value={formatMoney(pay.requested, cur)} />
          {pay.reduction > 0 && (
            <Line
              label="Reduced by the manager"
              value={`− ${formatMoney(pay.reduction, cur)}`}
              tone="text-amber-700"
            />
          )}
          {pay.carriedIn > 0 && (
            <>
              <Line label="Approved advance amount" value={formatMoney(pay.approved, cur)} />
              <Line
                label="Covered by balance carried in from an earlier advance"
                value={`− ${formatMoney(pay.carriedIn, cur)}`}
                tone="text-amber-700"
              />
            </>
          )}
        </dl>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2 border-t border-indigo-100 pt-2">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {pay.plusOutstanding ? "Cash requested now" : "Cash to send to the employee"}
            </p>
            <p className="text-[11px] text-gray-500">
              {pay.plusOutstanding
                ? "Set the rollover and the cash in the allocation below before approving."
                : "Approving fixes this amount. Disbursement pays exactly this."}
            </p>
          </div>
          <p data-testid="cash-on-approval" className="text-xl font-bold tabular-nums text-indigo-900">
            {formatMoney(pay.cash, cur)}
          </p>
        </div>
      </section>

      {/* 1. Manager's recommendation */}
      <section className="space-y-1">
        <p className="font-medium text-gray-800">Manager's recommendation</p>
        {decision ? (
          <>
            <p>{TREATMENT_LABEL[decision.treatment] || decision.treatment}</p>
            {reducedNow && (
              <p>
                From <span className="font-semibold tabular-nums">{formatMoney(pay.requested, cur)}</span> to{" "}
                <span className="font-semibold tabular-nums">{formatMoney(pay.approved, cur)}</span>.
              </p>
            )}
            {decision.justification && <p className="text-gray-600">“{decision.justification}”</p>}
            <p className="text-gray-400">
              {decision.decidedBy && (
                <>
                  By <EmployeeLabel employeeId={decision.decidedBy} />
                </>
              )}
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
        <p className="text-[11px] text-gray-500">
          Everything this employee would hold from the company if you approve.
        </p>
        <dl className="space-y-1">
          <Line
            label="Still owed on other advances"
            hint="Paid out earlier and not yet settled"
            value={formatMoney(balance.pendingBalanceTotal, cur)}
          />
          <Line
            label="Approved or pending, not paid"
            hint="Other advances not yet disbursed"
            value={formatMoney(balance.committedAmount, cur)}
          />
          <Line label="This request" hint="If you approve" value={formatMoney(balance.requestedAmount, cur)} />
          <div className="border-t border-gray-100 pt-1">
            <Line label="Total exposure" value={formatMoney(balance.potentialExposure, cur)} strong />
          </div>
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
            Carrying forward moves the balance off the earlier advance at once and holds it in the employee's outstanding.
            Approving this request then takes it in here, so Finance disburses only the difference.
          </p>
        </section>
      )}
    </div>
  );
}

const num = (value) => (value === null || value === undefined || value === "" ? null : Number(value));

/**
 * The figures Finance approves. {@code amount} is what approval freezes; a carried-in balance is part of it, so the cash
 * paid is amount minus that balance. {@code requestedAmount} is what the employee asked for before any reduction.
 */
export function payoutOf(advance, balance) {
  const approved = num(advance?.amount) ?? num(balance?.requestedAmount) ?? 0;
  const requested = Math.max(num(advance?.requestedAmount) ?? approved, approved);
  const carriedIn = Math.max(0, num(advance?.carriedInAmount) ?? 0);
  return {
    requested,
    approved,
    reduction: requested - approved,
    carriedIn,
    cash: Math.max(0, approved - carriedIn),
    plusOutstanding: advance?.requestType === "ADVANCE_PLUS_OUTSTANDING",
  };
}

function Line({ label, value, hint, strong = false, tone }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? "font-semibold text-gray-900" : "text-gray-600"}>
        {label}
        {hint && <span className="ml-1.5 text-[11px] text-gray-400">· {hint}</span>}
      </dt>
      <dd className={`tabular-nums ${strong ? "font-semibold text-gray-900" : tone || "text-gray-700"}`}>{value}</dd>
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
