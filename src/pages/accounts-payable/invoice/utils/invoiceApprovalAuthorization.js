/**
 * Resolves the signed-in user's own id from the decoded JWT (see AuthContext -> jwtDecode).
 * Mirrors procurement/utils/prAuthorization.js's currentUserId exactly (duplicated rather than
 * shared, same as that file's own precedent, to avoid coupling the invoice module to
 * procurement's) — every AP backend route reads `state.user.get("user_id") or
 * state.user.get("sub")`, so this keeps the frontend's own eligibility check from ever
 * diverging from what the backend would accept.
 */
function currentUserId(user) {
  const id = user?.user_id ?? user?.sub;
  return id == null ? null : id;
}

/**
 * True when the signed-in user is one of the given step-approvers — i.e. actually eligible to
 * act on the currently active approval step, not just a holder of INVOICE_APPROVE/REJECT/
 * SEND_BACK in general. Comparison is done as trimmed strings for the same reason
 * isPrRequester does: `approver.user_uuid` comes off the JSON API response as a string, while
 * the JWT claim may decode as a number or a string depending on how it was encoded.
 *
 * @param {Array<{user_uuid?: string|number|null}>} approvers - the active step's approvers
 * @param {object|null|undefined} user - decoded JWT from useAuth()
 */
export function isEligibleApproverForStep(approvers, user) {
  const userId = currentUserId(user);
  if (userId == null || !Array.isArray(approvers)) return false;
  return approvers.some((a) => a?.user_uuid != null && String(a.user_uuid).trim() === String(userId).trim());
}
