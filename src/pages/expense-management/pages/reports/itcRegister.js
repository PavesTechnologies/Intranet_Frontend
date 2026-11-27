/**
 * Pure helpers for the ITC Register page: the period presets, each line's claim readiness, the figures for the
 * cards, and the CSV export. Kept apart from the page so they can be tested without rendering.
 */

const num = (v) => Number(v) || 0;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** GST returns are filed per month, so the presets follow months, quarters and the April-March fiscal year. */
export const ITC_PERIODS = [
  { key: "THIS_MONTH", label: "This month" },
  { key: "LAST_MONTH", label: "Last month" },
  { key: "QUARTER", label: "This quarter" },
  { key: "FY", label: "This fiscal year" },
  { key: "CUSTOM", label: "Custom" },
];

/** from/to (yyyy-mm-dd) for a preset, relative to `today`. Quarters are fiscal: Apr-Jun, Jul-Sep, Oct-Dec, Jan-Mar. */
export function itcPeriodRange(key, today = new Date()) {
  const y = today.getFullYear();
  const m = today.getMonth();
  const end = new Date(y, m, today.getDate());
  switch (key) {
    case "LAST_MONTH":
      return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case "QUARTER": {
      const startMonth = m - (((m - 3) % 3) + 3) % 3; // Apr=3, Jul=6, Oct=9, Jan=0
      return { from: iso(new Date(y, startMonth, 1)), to: iso(end) };
    }
    case "FY": {
      const fyStartYear = m >= 3 ? y : y - 1;
      return { from: iso(new Date(fyStartYear, 3, 1)), to: iso(end) };
    }
    case "THIS_MONTH":
    default:
      return { from: iso(new Date(y, m, 1)), to: iso(end) };
  }
}

/**
 * Where a line stands for the GST return:
 *  CLAIMED         Finance recorded that it was claimed on the GST portal (itcClaimPeriod = the GSTR-3B month)
 *  READY           verified by Finance and has a supplier GSTIN - can go into GSTR-3B (after the GSTR-2B check)
 *  NO_GSTIN        verified, but no supplier GSTIN on record - cannot be claimed until one is captured
 *  AWAITING        recoverable, but Finance has not verified it yet
 *  NOT_RECOVERABLE the tax code's ITC % is 0 (or no tax): a cost, nothing to claim
 */
export const READINESS = {
  CLAIMED: { label: "Claimed", tone: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  READY: { label: "Ready to claim", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  NO_GSTIN: { label: "GSTIN missing", tone: "bg-rose-50 text-rose-700 ring-rose-200" },
  AWAITING: { label: "Awaiting Finance", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  NOT_RECOVERABLE: { label: "Not recoverable", tone: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export const readinessOf = (line) => {
  if (line?.itcClaimPeriod) return "CLAIMED";
  if (line?.itcStatus === "VERIFIED") return line.supplierGstin ? "READY" : "NO_GSTIN";
  if (line?.itcStatus === "UNVERIFIED") return "AWAITING";
  return "NOT_RECOVERABLE";
};

/** Figures for the cards, from the lines shown (so the cards always agree with the table and the export). */
export function summarizeItc(lines = []) {
  const sum = (pick, keep = () => true) => lines.filter(keep).reduce((s, l) => s + num(pick(l)), 0);
  const count = (keep) => lines.filter(keep).length;
  const is = (r) => (l) => readinessOf(l) === r;
  return {
    lines: lines.length,
    tax: sum((l) => l.taxAmount),
    recoverable: sum((l) => l.recoverableTaxAmount),
    claimed: sum((l) => l.recoverableTaxAmount, is("CLAIMED")),
    claimedCount: count(is("CLAIMED")),
    ready: sum((l) => l.recoverableTaxAmount, is("READY")),
    readyCount: count(is("READY")),
    noGstin: sum((l) => l.recoverableTaxAmount, is("NO_GSTIN")),
    noGstinCount: count(is("NO_GSTIN")),
    awaiting: sum((l) => l.recoverableTaxAmount, is("AWAITING")),
    awaitingCount: count(is("AWAITING")),
    lost: sum((l) => l.nonRecoverableTaxAmount),
  };
}

const CSV_COLUMNS = [
  ["Expense date", (l) => l.expenseDate],
  ["Report", (l) => l.reportNumber],
  ["Employee ID", (l) => l.employeeId],
  ["Employee", (l, nameOf) => nameOf(l.employeeId)],
  ["Merchant", (l) => l.merchantName],
  ["Category", (l) => l.categoryName],
  ["Tax code", (l) => l.taxCode],
  ["Supplier GSTIN", (l) => l.supplierGstin],
  ["GST", (l) => num(l.taxAmount).toFixed(2)],
  ["ITC %", (l) => num(l.itcRecoverablePercent)],
  ["Recoverable ITC", (l) => num(l.recoverableTaxAmount).toFixed(2)],
  ["Not recoverable", (l) => num(l.nonRecoverableTaxAmount).toFixed(2)],
  ["ITC status", (l) => l.itcStatus],
  ["Claim readiness", (l) => READINESS[readinessOf(l)].label],
  ["Claimed in return", (l) => l.itcClaimPeriod],
  ["Report status", (l) => l.reportStatus],
];

const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The lines as CSV (opens in Excel), one row per line, in the order shown. */
export function itcCsv(lines = [], nameOf = () => "") {
  const head = CSV_COLUMNS.map(([h]) => h).join(",");
  const rows = lines.map((l) => CSV_COLUMNS.map(([, get]) => csvCell(get(l, nameOf))).join(","));
  return [head, ...rows].join("\r\n");
}
