// Pure helpers for the employee dashboard's activity list and "Needs your action" reminders.
// They only reshape records the employee can already open: advances from the cash advance list and reports from
// the employee's own report list. No amounts are created here, and no audit or approver details are shown.

export const ACTIVITY_FILTERS = [
  { key: "all", label: "All" },
  { key: "advance", label: "Cash advance" },
  { key: "report", label: "Expense reports" },
];

export const ACTIVITY_LIMIT = 8;
const REMINDER_WINDOW_DAYS = 7;

// Advances that no longer owe anything, or never went anywhere, are not settlement reminders.
const NO_SETTLEMENT_STATUSES = ["DRAFT", "SETTLED", "CLOSED", "CANCELLED", "REJECTED"];

const DAY_MS = 86400000;

const humanize = (status) => {
  const text = String(status || "").replace(/_/g, " ").trim().toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Unknown";
};

// Tone is used only to colour the badge; the label always carries the meaning.
const ADVANCE_TONE = {
  DRAFT: "gray",
  PENDING_APPROVAL: "amber",
  SUBMITTED: "amber",
  PENDING_MANAGER_APPROVAL: "amber",
  PENDING_FINANCE_APPROVAL: "amber",
  APPROVED: "blue",
  DISBURSED: "indigo",
  IN_PROGRESS: "indigo",
  SETTLEMENT_PENDING: "amber",
  RECONCILIATION_PENDING: "amber",
  SETTLED: "emerald",
  CLOSED: "emerald",
  REJECTED: "rose",
  CANCELLED: "gray",
};

const REPORT_TONE = {
  DRAFT: "gray",
  PENDING_APPROVAL: "amber",
  PENDING_FINANCE_VERIFICATION: "amber",
  AWAITING_CORRECTION: "rose",
  POLICY_REJECTED: "rose",
  QUERY_RAISED: "rose",
  APPROVED: "blue",
  REIMBURSED: "emerald",
  CLOSED: "emerald",
  REJECTED: "rose",
  CANCELLED: "gray",
};

const REPORT_LABEL_OVERRIDE = {
  AWAITING_CORRECTION: "Returned",
  POLICY_REJECTED: "Returned",
  QUERY_RAISED: "Query raised",
};

/** Status text and tone for one activity row. A report that AP has routed or paid reads as such, not just "Approved". */
export function reportStatusInfo(status, paymentRoutingStatus) {
  const key = String(status || "").toUpperCase();
  if (key === "APPROVED" && paymentRoutingStatus === "PAYMENT_COMPLETED") return { label: "Paid", tone: "emerald" };
  if (key === "APPROVED" && paymentRoutingStatus === "APPROVED_FOR_PAYMENT") return { label: "Awaiting payment", tone: "blue" };
  return {
    label: REPORT_LABEL_OVERRIDE[key] || humanize(key),
    tone: REPORT_TONE[key] || "slate",
  };
}

export function advanceStatusInfo(status) {
  const key = String(status || "").toUpperCase();
  return { label: humanize(key), tone: ADVANCE_TONE[key] || "slate" };
}

// Short reference, the same convention the advance pages already use ("#" + first 8 characters of the id).
export const shortRef = (id) => (id ? `#${String(id).slice(0, 8).toUpperCase()}` : "");

const toTime = (value) => {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/**
 * Cash advances and expense reports as one list, newest first.
 * @param {object[]} advances  CashAdvanceResponse records
 * @param {object[]} reports   ExpenseReportResponse records
 */
export function buildActivityRows(advances = [], reports = []) {
  const advanceRows = advances.map((a) => {
    const id = a.advanceId || a.id;
    const status = advanceStatusInfo(a.status);
    return {
      id: `advance-${id}`,
      kind: "advance",
      date: a.updatedAt || a.createdAt || null,
      reference: shortRef(id),
      description: a.purpose || a.title || "Cash advance request",
      amount: a.baseAmount ?? a.amount ?? 0,
      statusLabel: status.label,
      statusTone: status.tone,
      to: `/expense-management/cash-advance/${id}`,
    };
  });
  const reportRows = reports.map((r) => {
    const id = r.reportId || r.id;
    const status = reportStatusInfo(r.reportStatus || r.status, r.paymentRoutingStatus);
    return {
      id: `report-${id}`,
      kind: "report",
      date: r.updatedAt || r.createdAt || null,
      reference: r.reportNumber || shortRef(id),
      description: r.title || r.businessPurpose || "Expense report",
      amount: r.totalAmount ?? 0,
      statusLabel: status.label,
      statusTone: status.tone,
      to: `/expense-management/expenses/reports/${id}`,
    };
  });
  return [...advanceRows, ...reportRows].sort((a, b) => toTime(b.date) - toTime(a.date) || a.id.localeCompare(b.id));
}

export function filterActivityRows(rows, filter) {
  if (filter === "advance" || filter === "report") return rows.filter((r) => r.kind === filter);
  return rows;
}

// "YYYY-MM-DD" (a date with no time) is read as local midnight, so it does not shift a day in western time zones.
const localDay = (value) => {
  if (!value) return null;
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const startOfToday = (now) => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Advances that need settling soon: overdue, or due within the next week, with money still outstanding.
 * Overdue sorts first, then by how soon it is due.
 */
export function settlementReminders(advances = [], now = new Date()) {
  const today = startOfToday(now);
  return advances
    .filter((a) => !NO_SETTLEMENT_STATUSES.includes(String(a.status || "").toUpperCase()))
    .map((a) => {
      const outstanding = Number(a.outstandingBalance ?? a.outstanding_balance ?? 0) || 0;
      const due = localDay(a.settlementDueDate || a.settlement_due_date);
      if (outstanding <= 0 || !due) return null;
      const daysUntilDue = Math.round((due - today) / DAY_MS);
      if (daysUntilDue > REMINDER_WINDOW_DAYS) return null;
      return {
        id: `reminder-${a.advanceId || a.id}`,
        advanceId: a.advanceId || a.id,
        reference: shortRef(a.advanceId || a.id),
        outstanding,
        currencyCode: a.currencyCode,
        dueDate: a.settlementDueDate || a.settlement_due_date,
        overdue: daysUntilDue < 0,
        daysOverdue: daysUntilDue < 0 ? -daysUntilDue : 0,
        daysUntilDue,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

export const formatShortDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/**
 * Settlement reminders in the shape the attention list already renders (reportNumber, status, amount, note),
 * with `to` pointing at the advance. `at` is left empty so the list does not show a misleading "ago" for a due date.
 */
export function reminderItems(advances = [], now = new Date()) {
  return settlementReminders(advances, now).map((r) => ({
    reportId: r.advanceId,
    reportNumber: r.reference,
    title: "Cash advance settlement",
    status: r.overdue ? "Overdue" : "Due soon",
    amount: r.outstanding,
    at: null,
    note: dueNote(r),
    to: `/expense-management/cash-advance/${r.advanceId}`,
  }));
}

function dueNote(r) {
  if (r.overdue) return `Overdue by ${r.daysOverdue} day${r.daysOverdue === 1 ? "" : "s"}`;
  if (r.daysUntilDue === 0) return "Due today";
  return `Due in ${r.daysUntilDue} day${r.daysUntilDue === 1 ? "" : "s"}`;
}
