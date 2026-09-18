/**
 * Resolves the signed-in user's own CDC-synced UUID identity from the decoded JWT (see
 * AuthContext -> jwtDecode). NOT the same value as procurement/utils/prAuthorization.js's
 * currentUserId (`user.user_id ?? user.sub`) — that's the JWT's numeric employee id, a totally
 * different identifier space from `user_uuid` (e.g. "019e68eb-06b3-ae1c-03d8-27e8949646eb"),
 * which is what invoice_approval_step_approver.user_uuid actually is. The backend resolves this
 * same numeric-id -> uuid mapping server-side via ApproverResolverService.resolve_user_uuid
 * before comparing; the frontend doesn't need to, since every JWT already carries the uuid
 * directly as its own claim.
 *
 * A previous version of this function compared user_id against user_uuid directly, which could
 * never match — every real approver saw Approve/Reject/Send Back hidden, permission notwithstanding.
 */
function currentUserUuid(user) {
  const uuid = user?.obs_user_uuid ?? user?.user_uuid;
  return uuid == null ? null : uuid;
}

/**
 * True when the signed-in user is one of the given step-approvers — i.e. actually eligible to
 * act on the currently active approval step, not just a holder of INVOICE_APPROVE/REJECT/
 * SEND_BACK in general. Comparison is done as trimmed, lowercased strings: `approver.user_uuid`
 * comes off the JSON API response as a string, and UUIDs are conventionally lowercase but this
 * doesn't assume the JWT claim is.
 *
 * @param {Array<{user_uuid?: string|null}>} approvers - the active step's approvers
 * @param {object|null|undefined} user - decoded JWT from useAuth()
 */
export function isEligibleApproverForStep(approvers, user) {
  const userUuid = currentUserUuid(user);
  if (userUuid == null || !Array.isArray(approvers)) return false;
  const normalized = String(userUuid).trim().toLowerCase();
  return approvers.some((a) => a?.user_uuid != null && String(a.user_uuid).trim().toLowerCase() === normalized);
}
