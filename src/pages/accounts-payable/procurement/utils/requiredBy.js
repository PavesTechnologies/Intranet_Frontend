/**
 * Required By date rule for purchase requisitions. Mirrors
 * ProcurementService._validate_required_by (procurement_service.py): today or later is
 * allowed, a past date is rejected with HTTP 422. The backend stays the real boundary — this
 * only blocks the obvious case before the request is sent.
 */

/** Exact backend message (REQUIRED_BY_IN_PAST_MESSAGE) — also used as the client-side error. */
export const REQUIRED_BY_IN_PAST_MESSAGE = "Required By Date cannot be earlier than today.";

/**
 * Today as the YYYY-MM-DD string a date input expects, in the user's LOCAL calendar day.
 * `toISOString()` would give the UTC day, which lags behind "today" for users east of UTC
 * in the early hours (e.g. IST before 05:30) and would wrongly block their real today.
 */
export const todayIsoDate = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

/** True for a YYYY-MM-DD value earlier than today. Empty means "not supplied" and is allowed. */
export const isRequiredByInPast = (value) => Boolean(value) && value < todayIsoDate();

/**
 * Pulls the Required By validation message out of an API error so it can be shown on the
 * field instead of only as a toast. Returns null for any other error.
 */
export const getRequiredByApiError = (error) => {
  if (error?.response?.status !== 422) return null;
  const detail = error.response.data?.detail;
  if (typeof detail === "string" && detail === REQUIRED_BY_IN_PAST_MESSAGE) return detail;
  if (Array.isArray(detail)) {
    const match = detail.find(
      (d) => d?.msg?.includes(REQUIRED_BY_IN_PAST_MESSAGE) || (d?.loc || []).includes("required_by"),
    );
    if (match) return match.msg || REQUIRED_BY_IN_PAST_MESSAGE;
  }
  return null;
};
