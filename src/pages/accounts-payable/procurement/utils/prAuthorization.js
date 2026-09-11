/**
 * Resolves the signed-in user's own id from the decoded JWT (see AuthContext -> jwtDecode).
 * Every AP backend route reads `state.user.get("user_id") or state.user.get("sub")` (e.g.
 * Backend/API_Layer/routes/procurement_route.py's _get_user_id) — this mirrors that exact
 * precedence so the frontend's own "am I the requester" check can never diverge from what the
 * backend would accept, regardless of which claim a given token actually carries.
 */
export function currentUserId(user) {
  const id = user?.user_id ?? user?.sub;
  return id == null ? null : id;
}

/**
 * True when the signed-in user is the PR's original requester. Comparison is done as trimmed
 * strings — pr.created_by comes off the JSON API response (already a string), while the JWT
 * claim may decode as a number or a string depending on how it was encoded, so a strict `===`
 * would silently and incorrectly evaluate false for two IDs that represent the same person.
 * @param {{ created_by?: string|number|null, requester_id?: string|number|null }|null|undefined} pr
 * @param {object|null|undefined} user decoded JWT from useAuth()
 */
export function isPrRequester(pr, user) {
  const requesterId = pr?.created_by ?? pr?.requester_id;
  const userId = currentUserId(user);
  if (requesterId == null || userId == null) return false;
  return String(requesterId).trim() === String(userId).trim();
}
