/**
 * Helpers for AR screens built ahead of their backend APIs.
 *
 * The post-invoice flow (payments, credit/debit notes, customer ledger,
 * reminders, collections) is specified in docs/POST_INVOICE_API_CONTRACT.md
 * but not implemented by the AR backend yet. Those screens call the contract
 * endpoints for real; when an endpoint does not exist the backend answers
 * 404 ("No static resource ...") or 405, and the screen shows a
 * "waiting for backend" state instead of an error — never invented data.
 */

const MISSING_ENDPOINT_PATTERNS = [/no static resource/i, /no handler found/i, /request method .* not supported/i];

/** True when the request failed because the endpoint itself is not implemented. */
export const isEndpointUnavailable = (error) => {
  const status = error?.response?.status;
  if (status === 405 || status === 501) return true;

  const detail = String(
    error?.response?.data?.message ||
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      ""
  );
  // The AR backend's catch-all @ExceptionHandler(Exception.class) turns
  // Spring's NoResourceFoundException ("No static resource api/v1/...") into
  // a 500, so the message is the reliable signal at any status.
  if (MISSING_ENDPOINT_PATTERNS.some((re) => re.test(detail))) return true;

  // A bare 404 also means the route is missing. A 404 with a domain message
  // ("Payment could not be found.") is a real not-found and is reported as such.
  return status === 404 && (!detail || detail === "Not Found");
};

/** User-facing message for an AR API failure; masks database internals. */
export const getArApiErrorMessage = (error, fallback = "The request could not be completed. Please try again.") => {
  if (isEndpointUnavailable(error)) return "This action is not available yet — the backend API has not been released.";
  const status = error?.response?.status;
  const detail = String(
    error?.response?.data?.message || error?.response?.data?.detail || error?.message || ""
  );
  if (status === 401 || status === 403) return "You do not have permission to perform this action.";
  if (/sql|hibernate|constraint|jdbc|jpa/i.test(detail)) return fallback;
  return detail || fallback;
};

/**
 * Extracts `data` from the AR backend's ApiResponse envelope
 * ({ success, message, data, timestamp }).
 */
export const unwrapApiData = (response) => {
  const payload = response?.data;
  if (payload && typeof payload === "object" && "data" in payload) return payload.data;
  return payload ?? null;
};

export const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const AR_BASE_URL =
  window.__APP_CONFIG__?.AR_BASE_URL ||
  window.APP_CONFIG?.AR_BASE_URL ||
  import.meta.env?.VITE_AR_API_BASE_URL ||
  "http://localhost:8080";
