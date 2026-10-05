/**
 * Shared display formatters for the AP module. Kept currency-symbol-aware (not hardcoded to ₹)
 * since Invoice/Vendor records carry their own currency, but defaults to INR when absent.
 */

/**
 * Formats a numeric amount as currency, e.g. formatCurrency(125000) -> "₹1,25,000.00".
 * Treats null/undefined/NaN as 0 rather than throwing or rendering "NaN"/"undefined".
 * @param {number|null|undefined} amount
 * @param {string} [currencySymbol="₹"]
 * @returns {string}
 */
export function formatCurrency(amount, currencySymbol = "₹") {
  const safeAmount = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(safeAmount));
  const sign = safeAmount < 0 ? "-" : "";
  return `${sign}${currencySymbol}${formatted}`;
}

/**
 * Several AP backend timestamp columns (e.g. ap.audit_log.changed_at) are Postgres "timestamp
 * without time zone", populated from datetime.now(timezone.utc)/now() and returned by the API as
 * an ISO string with no "Z"/offset suffix (e.g. "2026-09-17T13:48:00"). New Date() on a
 * timezone-less ISO string is interpreted as local time per the JS spec, not converted from
 * UTC — so a naive-but-actually-UTC value renders several hours off from the real local time,
 * with no error to signal it. The value genuinely is UTC (every write site in this backend uses
 * datetime.now(timezone.utc)), so treat any datetime string lacking a timezone designator as UTC
 * by appending "Z" before parsing, rather than letting the browser silently mis-time it as local.
 * A bare date ("2026-08-07", no "T") is left untouched — that's a real Date column, not a
 * timestamp, and has no time-of-day to get wrong.
 * @param {string} isoString
 * @returns {Date}
 */
function parseBackendDateTime(isoString) {
  const hasTimeComponent = isoString.includes("T");
  const hasTimezoneDesignator = /Z$|[+-]\d{2}:?\d{2}$/.test(isoString);
  const normalized = hasTimeComponent && !hasTimezoneDesignator ? `${isoString}Z` : isoString;
  return new Date(normalized);
}

/**
 * Formats an ISO date string for display, e.g. "2026-08-07" -> "07 Aug 2026".
 * Returns a placeholder rather than "Invalid Date" for empty/unparsable input.
 * @param {string|null|undefined} isoDate
 * @param {string} [placeholder="—"]
 * @returns {string}
 */
export function formatDate(isoDate, placeholder = "—") {
  if (!isoDate) return placeholder;
  const date = parseBackendDateTime(isoDate);
  if (Number.isNaN(date.getTime())) return placeholder;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Formats an ISO datetime string for display, e.g. "2026-08-07T14:05:00Z" -> "07 Aug 2026, 2:05 pm".
 * Returns a placeholder rather than "Invalid Date" for empty/unparsable input.
 * @param {string|null|undefined} isoDateTime
 * @param {string} [placeholder="—"]
 * @returns {string}
 */
export function formatDateTime(isoDateTime, placeholder = "—") {
  if (!isoDateTime) return placeholder;
  const date = parseBackendDateTime(isoDateTime);
  if (Number.isNaN(date.getTime())) return placeholder;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Formats an ISO datetime string as just the time-of-day, e.g. "2026-08-07T14:05:00" -> "2:05 pm".
 * Same UTC-normalization as formatDateTime — use this instead of `new
 * Date(x).toLocaleTimeString()` directly wherever only the time portion is needed.
 * @param {string|null|undefined} isoDateTime
 * @param {string} [placeholder="—"]
 * @returns {string}
 */
export function formatTime(isoDateTime, placeholder = "—") {
  if (!isoDateTime) return placeholder;
  const date = parseBackendDateTime(isoDateTime);
  if (Number.isNaN(date.getTime())) return placeholder;
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Balance = net amount - amount paid, clamped so floating-point noise never displays as e.g.
 * "-0.00" for a fully paid invoice.
 * @param {number|null|undefined} netAmount
 * @param {number|null|undefined} amountPaid
 * @returns {number}
 */
export function calculateBalance(netAmount, amountPaid) {
  const net = typeof netAmount === "number" && Number.isFinite(netAmount) ? netAmount : 0;
  const paid = typeof amountPaid === "number" && Number.isFinite(amountPaid) ? amountPaid : 0;
  const balance = net - paid;
  return Math.abs(balance) < 0.005 ? 0 : balance;
}

/** True once a due date has passed and the invoice still carries an outstanding balance. */
export function isOverdue(dueDate, netAmount, amountPaid) {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < Date.now() && calculateBalance(netAmount, amountPaid) > 0;
}
