/**
 * Extracts a human-readable message from a caught error, without leaking raw backend detail
 * to the UI (per PART T: "Do not expose raw backend errors"). Written against FastAPI's error
 * shape ({ detail: string | [{msg, loc}] }) since that's what the real backend will eventually
 * return — safe to call on mock-service errors too, since it falls through to a generic message.
 * @param {unknown} error
 * @param {string} [fallback="Something went wrong. Please try again."]
 * @returns {string}
 */
export function getApiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d) => d.msg).filter(Boolean).join(", ") || fallback;
  }

  if (typeof error?.message === "string" && error.message && !error.message.startsWith("Request failed")) {
    return error.message;
  }

  return fallback;
}
