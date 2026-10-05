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
