import { formatCurrency } from "../../utils/formatters";

/**
 * Backend money values are {currency_code, currency_symbol, amount: "17700.00"} (string amount).
 * Wraps the existing formatCurrency — never invents its own number formatting, and never sums
 * across currencies (callers render one card/series per currency entry, not a combined total).
 * @param {{currency_symbol?: string, amount: string|number}} entry
 */
export function formatDashboardAmount(entry) {
  if (!entry) return "—";
  return formatCurrency(Number(entry.amount), entry.currency_symbol || "₹");
}

/** Short day label for a trend point's x-axis — "2026-10-01" -> "Oct 1". Falls back to the raw
 * string if it isn't a parseable date, rather than showing "Invalid Date". */
export function formatTrendPeriodLabel(period) {
  if (!period) return "";
  const date = new Date(period);
  if (Number.isNaN(date.getTime())) return period;
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

/** "invoice_status_distribution" -> "Invoice Status Distribution" — used as a fallback section
 * title wherever the backend gives a `key` but no explicit display title (status_summary/trends
 * entries, unlike kpis/action_required which already carry their own `title`). */
export function prettifyKey(key) {
  if (!key) return "";
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * "2026-10-05T14:52:00Z" -> "2 min ago" / "3 hours ago" / "Yesterday" — for Recent Activity rows.
 * Falls back to an absolute date once an item is more than 6 days old, where "N days ago" stops
 * being a useful read and the actual date is more informative.
 */
export function formatRelativeTime(occurredAt) {
  if (!occurredAt) return "";
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

/** "2026-09-06" + "2026-10-05" -> "Sep 6 – Oct 5, 2026", for the header subtitle. */
export function formatPeriodRange(fromDate, toDate) {
  if (!fromDate || !toDate) return "";
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "";
  const fromLabel = from.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  const toLabel = to.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  return `${fromLabel} – ${toLabel}`;
}
