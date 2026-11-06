import { useCallback, useEffect, useState } from "react";
import { carryForwardApi } from "@/pages/expense-management/api/carryForwardApi";
import { recoveryApi } from "@/pages/expense-management/api/recoveryApi";

/** Once one of these is set for an advance, the settlement options are locked until it is cancelled. */
export const SETTLEMENT_LOCK = { CARRY_FORWARD: "CARRY_FORWARD", SALARY: "SALARY" };

// A salary request that failed (nothing deducted) does not lock the advance: Finance can try again.
const NON_LOCKING_SALARY_STATUSES = ["CANCELLED", "PAYROLL_FAILED"];

/** Reads what has already been done with this advance's balance. */
export const loadSettlementLock = async (advanceId) => {
  const [ready, requests] = await Promise.all([
    carryForwardApi.getReady(advanceId).catch(() => null),
    recoveryApi.listSalaryDeductions(advanceId).catch(() => []),
  ]);
  const readyAmount = Number(ready?.readyAmount) || 0;
  if (readyAmount > 0) {
    return { kind: SETTLEMENT_LOCK.CARRY_FORWARD, amount: readyAmount };
  }
  const list = Array.isArray(requests) ? requests : requests?.content ?? [];
  const active = list.find((r) => !NON_LOCKING_SALARY_STATUSES.includes(String(r.status || "").toUpperCase()));
  if (active) {
    return { kind: SETTLEMENT_LOCK.SALARY, amount: Number(active.requestedAmount) || 0, requestId: active.salaryDeductionRequestId };
  }
  return { kind: null, amount: 0 };
};

/** Hook for one advance: the current lock, and `reload` to re-read it after an action. */
export const useSettlementLock = (advanceId, enabled = true) => {
  const [state, setState] = useState({ loaded: false, kind: null, amount: 0 });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled || !advanceId) return undefined;
    let cancelled = false;
    loadSettlementLock(advanceId).then((lock) => {
      if (!cancelled) setState({ loaded: true, ...lock });
    });
    return () => {
      cancelled = true;
    };
  }, [advanceId, enabled, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
};
