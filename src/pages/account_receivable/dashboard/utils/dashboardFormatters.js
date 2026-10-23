// Display currencies for the dashboard's sample (USD) figures. Rates are
// fixed demo rates, not live FX — the page says so next to the toggle.
export const DISPLAY_CURRENCIES = {
  USD: { code: "USD", symbol: "$", rate: 1, locale: "en-US" },
  INR: { code: "INR", symbol: "₹", rate: 86.5, locale: "en-IN" },
  EUR: { code: "EUR", symbol: "€", rate: 0.92, locale: "de-DE" },
};

export const PERIODS = ["MTD", "QTD", "YTD"];

export const PERIOD_LABELS = {
  MTD: "Month to date",
  QTD: "Quarter to date",
  YTD: "Year to date",
};

/** Money formatters bound to one display currency. Input is USD. */
export function createMoneyFormatter(currencyCode = "USD") {
  const info = DISPLAY_CURRENCIES[currencyCode] || DISPLAY_CURRENCIES.USD;
  const full = new Intl.NumberFormat(info.locale, {
    style: "currency",
    currency: info.code,
    maximumFractionDigits: 0,
  });
  const compact = new Intl.NumberFormat(info.locale, {
    style: "currency",
    currency: info.code,
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const convert = (usd) => (Number(usd) || 0) * info.rate;

  return {
    currency: info,
    format: (usd) => full.format(convert(usd)),
    compact: (usd) => compact.format(convert(usd)),
  };
}

const percentFormat = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

/** 15.2 -> "15.2%" */
export const formatPercent = (value) => percentFormat.format((Number(value) || 0) / 100);

/** 8.4 -> "+8.4%" */
export const formatSignedPercent = (value) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatPercent(Math.abs(value))}`;

export const INVOICE_STATUS = {
  ISSUED: { label: "Issued", tone: "info" },
  OVERDUE: { label: "Overdue", tone: "danger" },
  PARTIALLY_PAID: { label: "Partially Paid", tone: "teal" },
  PENDING_APPROVAL: { label: "Pending Approval", tone: "warning" },
  PAID: { label: "Paid", tone: "success" },
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
