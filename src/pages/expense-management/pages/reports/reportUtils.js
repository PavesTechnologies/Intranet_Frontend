export const MAX_RANGE_MONTHS = 36;

const pad = (n) => String(n).padStart(2, "0");

/** Local-calendar ISO date (toISOString would shift across midnight in IST). */
export const toIsoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseIsoDate = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};

const monthStart = (today, monthsBack) => new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);

/** Fiscal year runs Apr 1 - Mar 31. */
const fiscalYearStart = (today) => new Date(today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1, 3, 1);

export const DATE_PRESETS = [
  { key: "thisMonth", label: "This month", range: (t) => [monthStart(t, 0), t] },
  { key: "last3", label: "Last 3 months", range: (t) => [monthStart(t, 2), t] },
  { key: "last12", label: "Last 12 months", range: (t) => [monthStart(t, 11), t] },
  { key: "fiscalYear", label: "This fiscal year", range: (t) => [fiscalYearStart(t), t] },
  { key: "ytd", label: "Year to date", range: (t) => [new Date(t.getFullYear(), 0, 1), t] },
];

export const presetRange = (key, today = new Date()) => {
  const preset = DATE_PRESETS.find((p) => p.key === key);
  const [from, to] = preset.range(today);
  return { from: toIsoDate(from), to: toIsoDate(to) };
};

/** Returns an error message, or null when the range can be requested. */
export const validateRange = (from, to) => {
  const f = parseIsoDate(from);
  const t = parseIsoDate(to);
  if (!f || !t) return "Choose both a From and a To date.";
  if (f > t) return "From date must be on or before the To date.";
  const limit = new Date(f.getFullYear(), f.getMonth() + MAX_RANGE_MONTHS, f.getDate());
  if (t > limit) return `The range can span at most ${MAX_RANGE_MONTHS} months.`;
  return null;
};

export const formatDisplayDate = (iso) => {
  const d = parseIsoDate(iso);
  return d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : iso || "";
};

/** PENDING_APPROVAL -> "Pending approval". */
export const humanizeEnum = (value) => {
  if (!value) return "—";
  const s = String(value).replace(/_/g, " ").toLowerCase().trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const SCOPE_LABELS = {
  TEAM: "Your team's expenses",
  ORGANIZATION: "Organization-wide",
};

// ---------------------------------------------------------------- CSV

const csvCell = (value) => {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const csvRow = (cells) => cells.map(csvCell).join(",");

/**
 * One CSV with a header block (scope, range, currency, totals) and every breakdown as
 * Section,Key,Label,Count,Amount rows. `sections` = [{ name, rows }] with labels already resolved.
 */
export const buildSummaryCsv = (report, sections) => {
  const t = report.totals || {};
  const r = report.reimbursements || {};
  const ca = report.cashAdvances || {};
  const lines = [
    csvRow(["Expense summary report"]),
    csvRow(["Scope", SCOPE_LABELS[report.scope] || report.scope]),
    csvRow(["From", report.from]),
    csvRow(["To", report.to]),
    csvRow(["Currency", report.baseCurrencyCode]),
    csvRow(["Generated at", new Date().toLocaleString("en-IN")]),
    "",
    csvRow(["Metric", "Value"]),
    csvRow(["Total spend", t.spend]),
    csvRow(["Line items", t.lineItemCount]),
    csvRow(["Reports", t.reportCount]),
    csvRow(["Employees", t.employeeCount]),
    csvRow(["Average per report", t.averagePerReport]),
    csvRow(["Reimbursed amount", r.paidAmount]),
    csvRow(["Reimbursed reports", r.paidCount]),
    csvRow(["Awaiting payment amount", r.awaitingPaymentAmount]),
    csvRow(["Awaiting payment reports", r.awaitingPaymentCount]),
    csvRow(["Cash advances requested (count)", ca.count]),
    csvRow(["Cash advances requested (amount)", ca.requestedAmount]),
    csvRow(["Cash advances outstanding", ca.outstandingAmount]),
    "",
    csvRow(["Section", "Key", "Label", "Count", "Amount"]),
  ];
  sections.forEach(({ name, rows }) => {
    (rows || []).forEach((row) => lines.push(csvRow([name, row.key, row.label, row.count, row.amount])));
  });
  return lines.join("\r\n");
};

export const downloadCsv = (filename, csv) => {
  // BOM so Excel opens UTF-8 (currency symbols, names) correctly.
  const blob = new window.Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
};
