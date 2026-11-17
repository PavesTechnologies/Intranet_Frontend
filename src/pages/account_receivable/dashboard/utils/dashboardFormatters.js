import { formatCurrency } from "../../utils/format";

// The dashboard API (GET /api/v1/dashboard/*) returns every money figure as a
// list of { currencyCode, amount }. Amounts are never converted between
// currencies, so the UI shows each currency on its own.

export const PERIODS = ["MTD", "QTD", "YTD"];

export const PERIOD_LABELS = {
  MTD: "Month to date",
  QTD: "Quarter to date",
  YTD: "Year to date",
};

export const PRIOR_PERIOD_NOUN = { MTD: "month", QTD: "quarter", YTD: "year" };

/** Full amount, 2 decimals, in the currency's own locale (e.g. "$2,308.50", "₹1,45,000.00"). */
export const formatMoney = (amount, currencyCode) => formatCurrency(amount, currencyCode || "USD");

/** Short amount for tight spaces and chart axes (e.g. "$2.3K"). */
export function formatMoneyCompact(amount, currencyCode = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(Number(amount) || 0);
  } catch {
    return `${currencyCode} ${new Intl.NumberFormat("en-US", { notation: "compact" }).format(Number(amount) || 0)}`;
  }
}

/** Largest amount first, so the "headline" currency is the one with the most money. */
export const sortAmounts = (amounts = []) =>
  [...amounts].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));

/** Currency codes present across several amount lists, largest total first. */
export function currenciesIn(lists = []) {
  const totals = new Map();
  lists.flat().forEach(({ currencyCode, amount }) => {
    totals.set(currencyCode, (totals.get(currencyCode) || 0) + (Number(amount) || 0));
  });
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([code]) => code);
}

/** Amount for one currency in a list (0 when absent). */
export const amountIn = (amounts = [], currencyCode) =>
  Number(amounts.find((a) => a.currencyCode === currencyCode)?.amount) || 0;

/** "$2,308.50 · ₹1,000.00", or the fallback when there is nothing. */
export const formatAmounts = (amounts = [], fallback = "—") =>
  amounts.length ? sortAmounts(amounts).map((a) => formatMoney(a.amount, a.currencyCode)).join(" · ") : fallback;

const percentFormat = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

/** 15.2 -> "15.2%" */
export const formatPercent = (value) => percentFormat.format((Number(value) || 0) / 100);

/** % change between two amounts in the same currency; null when there is no base to compare against. */
export const percentChange = (current, prior) => {
  const c = Number(current) || 0;
  const p = Number(prior) || 0;
  return p === 0 ? null : ((c - p) / p) * 100;
};

/** 8.4 -> "+8.4%" */
export const formatSignedPercent = (value) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatPercent(Math.abs(value))}`;

/**
 * The API serialises dates as Java LocalDate arrays ([2026, 10, 27]) or ISO
 * strings. Returns "2026-10-27" (sortable) or "" when absent.
 */
export function toIsoDate(value) {
  if (!value) return "";
  if (Array.isArray(value)) {
    const [y, m, d] = value;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return String(value).slice(0, 10);
}

/** Ledger display statuses returned by the API. */
export const INVOICE_STATUS = {
  OVERDUE: { label: "Overdue", tone: "danger" },
  ISSUED: { label: "Issued", tone: "info" },
  AWAITING_SEND: { label: "Awaiting Send", tone: "teal" },
  PENDING_APPROVAL: { label: "Pending Approval", tone: "warning" },
  GENERATED: { label: "Draft", tone: "neutral" },
  REJECTED: { label: "Rejected", tone: "danger" },
};

export const getInvoiceStatus = (status) =>
  INVOICE_STATUS[status] || {
    label: String(status || "Unknown")
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    tone: "neutral",
  };

/** Aging tone thresholds used by the ledger and aging schedule. */
export const getAgingTone = (days) => (days > 60 ? "danger" : days > 30 ? "warning" : "neutral");

export const pluralize = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// Badge/tone classes shared across the dashboard. Text colours are the
// -700/-800 steps so labels clear 4.5:1 on their tinted backgrounds.
export const TONE_BADGE = {
  danger: "bg-rose-50 text-rose-700 ring-rose-600/20",
  warning: "bg-amber-50 text-amber-800 ring-amber-600/20",
  info: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  teal: "bg-teal-50 text-teal-700 ring-teal-600/20",
  neutral: "bg-slate-100 text-slate-700 ring-slate-500/20",
};

export const TONE_DOT = {
  danger: "bg-rose-500",
  warning: "bg-amber-500",
  info: "bg-indigo-500",
  success: "bg-emerald-500",
  teal: "bg-teal-500",
  neutral: "bg-slate-400",
};
