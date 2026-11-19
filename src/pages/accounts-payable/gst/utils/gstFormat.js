import { formatMoney } from "../../dashboard/components/insights";
import { formatMonth } from "../../utils/formatters";

/** INR with the AP module's formatting; null / undefined show as ₹0. */
export const inr = (value) => formatMoney(Number(value ?? 0), "INR");

/** INR, but a missing amount (null / undefined / "") shows as "—" - never as a valid ₹0. */
export const inrOrDash = (value) => (value === null || value === undefined || value === "" ? "—" : inr(value));

/**
 * The filed invoice value of a set of GSTR-2B documents (backend document_totals). The portal Excel / JSON carry
 * it; the CSV and demo templates do not, so it may be missing for some or all documents. Returns
 * { text, note } - the value is never filled in or estimated here.
 */
export function invoiceValueText(totals) {
  if (!totals) return { text: "—", note: null };
  const docs = Number(totals.documents ?? 0);
  const missing = Number(totals.documents_without_invoice_value ?? 0);
  if (docs > 0 && missing >= docs) return { text: "Not in file", note: "The file does not report invoice values" };
  return {
    text: inrOrDash(totals.invoice_value),
    note: missing > 0 ? `Excludes ${missing} document(s) filed without an invoice value` : null,
  };
}

/** "2026-11" or "2026-11-01" -> "Nov 2026". */
export const periodLabel = (period) => formatMonth(period ? `${String(period).slice(0, 7)}-01` : "");

/** "2026-11" -> "2026-11-01" (the ITC API takes any day of the month). */
export const monthDate = (period) => (period ? `${String(period).slice(0, 7)}-01` : null);

/** "2026-11-01" / "2026-11" -> "2026-11". */
export const toPeriod = (value) => (value ? String(value).slice(0, 7) : null);

/** The month before today's, as "YYYY-MM" - the latest month whose GSTR-2B can exist. */
export function previousPeriod(today = new Date()) {
  const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const currentPeriod = (today = new Date()) =>
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

/** Indian financial year label of a "YYYY-MM" period: 2026-11 -> "2026-27" (display only). */
export function financialYearOf(period) {
  const [y, m] = String(period || "").split("-").map(Number);
  if (!y || !m) return null;
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/**
 * The period to open on: the latest month with a GSTR-2B import, else the latest month whose
 * GSTR-2B the portal has generated (from the backend's `gstr2b_available_from`), else the newest.
 * `periods` is GET /gstr2b/periods (newest first).
 */
export function pickDefaultPeriod(periods, today = new Date()) {
  if (!periods?.length) return previousPeriod(today);
  const iso = today.toISOString().slice(0, 10);
  return (
    periods.find((p) => p.gstr2b_imported)?.period
    || periods.find((p) => p.gstr2b_available_from && p.gstr2b_available_from <= iso)?.period
    || periods[0].period
  );
}

/** [{financialYear, periods: [...]}] in the backend's order (newest first). */
export function groupByFinancialYear(periods = []) {
  const groups = [];
  for (const p of periods) {
    const fy = p.financial_year || financialYearOf(p.period);
    let group = groups.find((g) => g.financialYear === fy);
    if (!group) {
      group = { financialYear: fy, periods: [] };
      groups.push(group);
    }
    group.periods.push(p);
  }
  return groups;
}

/** Validates a component amount typed by the user against a cap (both may be strings / numbers). */
export function amountError(value, cap, label) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return `${label} must be zero or more`;
  if (cap !== undefined && cap !== null && n > Number(cap) + 0.005) return `${label} cannot exceed ${inr(cap)}`;
  return null;
}

/** The JWT user id the backend compares against (`user_id`, else `sub`). */
export const currentUserId = (user) => (user ? String(user.user_id ?? user.sub ?? "") : "");
