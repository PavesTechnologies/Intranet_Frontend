const n = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v) || 0);

export const CARRY_FORWARD_TYPE = "ADVANCE_PLUS_CARRY_FORWARD";

/**
 * Statuses in which a Carry Forward request is not final yet, so its carry-forward stays claimed and is not offered to
 * another request. Same list as the server (CashAdvanceServiceImpl.CARRY_FORWARD_CLAIM_STATUSES).
 */
export const CARRY_FORWARD_CLAIM_STATUSES = [
  "DRAFT", "SUBMITTED", "PENDING", "PENDING_APPROVAL", "PENDING_MANAGER_APPROVAL",
  "PENDING_COST_CENTER_APPROVAL", "PENDING_COST_CENTER", "PENDING_FINANCE_APPROVAL", "PENDING_FINANCE",
  "DEFERRED", "QUERY_RAISED",
];

/** The carry-forward a request claims while it is open: its stored total less the new cash. */
export function claimedCarryForward(advance) {
  if (advance?.totalAdvanceAllocation == null || advance?.additionalAmountRequested == null) return 0;
  return Math.max(0, n(advance.totalAdvanceAllocation) - n(advance.additionalAmountRequested));
}

/**
 * The carry-forward a "Cash Advance + Carry Forward" request brings in, from the server's stored figures.
 *   newCash  the cash the employee asked for (the only part paid out)
 *   carry    before final approval: total − new cash (shown, not moved yet); after: the carried-in amount that moved
 *   total    newCash + carry: what the employee accounts for
 *   moved    true once the carry-forward has moved into the request (on Finance's final approval)
 * Null for any other request type.
 */
export function carryForwardRequest(advance) {
  if (advance?.requestType !== CARRY_FORWARD_TYPE) return null;
  const moved = n(advance.carriedInAmount) > 0;
  const newCash = n(advance.additionalAmountRequested) || Math.max(0, n(advance.amount) - n(advance.carriedInAmount));
  const carry = moved ? n(advance.carriedInAmount) : Math.max(0, n(advance.totalAdvanceAllocation) - newCash);
  return { newCash, carry, total: newCash + carry, moved };
}
