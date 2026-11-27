import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, Layers, AlertCircle, X, Paperclip, ReceiptText, Wallet, BadgeCheck, Clock3, Inbox, ChevronDown, ArrowRight, ExternalLink } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { PageCard, PageCardContent } from "@/components/Cards/PageCard";
import GenericTable from "@/components/Table/table";
import Button from "@/components/Button/Button";
import Modal from "@/components/Modal/modal";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import { paymentStateOf } from "@/pages/expense-management/components/expense-reports/PaymentStatusBadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import FormSelect from "@/components/forms/FormSelect";
import { useAuth } from "@/contexts/AuthContext";
import { showStatusToast } from "@/components/toastfy/toast";
import {
  expenseReportService,
  lookupService,
  REPORT_EDITABLE_STATUSES,
  REPORT_DELETABLE_STATUSES,
} from "@/pages/expense-management/api/expenseReportsApi";
import ReportFormFields, { validateBusinessPurpose } from "@/pages/expense-management/components/expense-reports/ReportFormFields";
import { getSubmissionDeadlineInfo, validateTripDates } from "@/pages/expense-management/components/expense-reports/submissionDeadline";
import Pagination from "@/components/Pagination/pagination";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { useAdvanceFigures } from "@/pages/expense-management/pages/cash-advance/useAdvanceFigures";
import { advanceMoney, advanceMovementLines, myAdvancesLink } from "@/pages/expense-management/pages/cash-advance/advanceMovement";
import RequestTypeBadge, { REQUEST_TYPES, reportTypeOf } from "@/pages/expense-management/components/common/RequestTypeBadge";
import TableFilterBar, {
  KpiCards,
  applyTableFilters,
  distinctOptions,
  emptyFilterValues,
  inAmountRange,
} from "@/pages/expense-management/components/common/TableFilterBar";
 
const ITEMS_PER_PAGE = 10;
 
const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};
 
const formatAmount = (value) =>
  (Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
 
/**
 * One row action icon. Every row shows the same three icons in the same place; an action that
 * doesn't apply is greyed out and its tooltip says why. The tooltip sits on a wrapper because a
 * disabled button doesn't receive hover events.
 */
function RowIconAction({ icon: Icon, label, onClick, disabled = false, tone }) {
  return (
    <span title={label} className="inline-flex">
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onClick();
        }}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition ${
          disabled ? "cursor-not-allowed text-gray-300" : tone
        }`}
      >
        <Icon size={14} />
      </button>
    </span>
  );
}

// Report status as one consistent pill: same size, border and casing for every state. Once approved, the payment state
// (Awaiting payment / Paid / Settled) replaces "Approved" because it says more.
const REPORT_STATUS_PILLS = {
  DRAFT: { label: "Draft", tone: "border-slate-200 bg-slate-50 text-slate-600" },
  PENDING_APPROVAL: { label: "Pending approval", tone: "border-amber-200 bg-amber-50 text-amber-700" },
  PENDING_FINANCE_VERIFICATION: { label: "Finance check", tone: "border-amber-200 bg-amber-50 text-amber-700" },
  AWAITING_CORRECTION: { label: "Needs correction", tone: "border-orange-200 bg-orange-50 text-orange-700" },
  QUERY_RAISED: { label: "Query raised", tone: "border-orange-200 bg-orange-50 text-orange-700" },
  APPROVED: { label: "Approved", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Rejected", tone: "border-rose-200 bg-rose-50 text-rose-700" },
  POLICY_REJECTED: { label: "Policy rejected", tone: "border-rose-200 bg-rose-50 text-rose-700" },
  CANCELLED: { label: "Cancelled", tone: "border-slate-200 bg-slate-50 text-slate-500" },
  // Payment track
  AWAITING_PAYMENT: { label: "Awaiting payment", tone: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  PAID: { label: "Paid", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  NO_PAYMENT_DUE: { label: "Settled", tone: "border-sky-200 bg-sky-50 text-sky-700", title: "Settled - no payment due (covered by the cash advance)" },
};

function ReportStatusPill({ report }) {
  const payment = paymentStateOf(report);
  const key = payment ? payment.key : (report.reportStatus || "DRAFT").toUpperCase();
  const pill = REPORT_STATUS_PILLS[key] || {
    label: key.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()),
    tone: "border-slate-200 bg-slate-50 text-slate-600",
  };
  // "Settled" means nothing is left to pay; say why, since only some of these reports were covered by an advance.
  const title = key === "NO_PAYMENT_DUE"
    ? report.cashAdvanceId
      ? "Settled - no payment due (covered by the cash advance)"
      : "Settled - no payment due (nothing reimbursable on this report)"
    : pill.title || pill.label;
  return (
    <span
      title={title}
      className={`inline-flex min-w-[124px] items-center justify-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none ${pill.tone}`}
    >
      {pill.label}
    </span>
  );
}

// Where an approved report's money went, from the report's own figures:
//   against advance = total - reimbursable (only when linked to a cash advance: that part was set against it)
//   paid            = what AP confirmed paying
//   due             = reimbursable - paid (approved, not paid yet)
//   no payment due  = approved with nothing reimbursable and no advance involved
// A report that is not approved yet has no money movement, so it shows a dash.
const APPROVED_STATUSES = ["APPROVED", "REIMBURSED", "CLOSED"];
const money = (v) => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function settlementOf(report) {
  if (!APPROVED_STATUSES.includes(String(report?.reportStatus || "").toUpperCase())) return null;
  const total = Number(report.totalAmount) || 0;
  const reimbursable = report.reimbursableAmount == null ? total : Number(report.reimbursableAmount) || 0;
  const paid = Number(report.paymentConfirmation?.amountPaid ?? report.paidAmount ?? 0) || 0;
  const notPayable = Math.max(total - reimbursable, 0);
  const againstAdvance = report.cashAdvanceId ? notPayable : 0;
  const noPaymentDue = report.cashAdvanceId ? 0 : notPayable;
  const due = Math.max(reimbursable - paid, 0);
  return { againstAdvance, paid, due, noPaymentDue };
}

// ---------------------------------------------------------------- filters and KPI cards (all from the real reports)

const PERIOD_OPTIONS = [
  { label: "Any time", value: "" },
  { label: "This week", value: "WEEK" },
  { label: "This month", value: "MONTH" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 60 days", value: "60" },
  { label: "Last 90 days", value: "90" },
];

const SORT_OPTIONS = [
  { label: "Newest created", value: "" },
  { label: "Oldest created", value: "OLDEST" },
  { label: "Trip date, latest first", value: "TRIP_LATEST" },
  { label: "Trip date, earliest first", value: "TRIP_EARLIEST" },
  { label: "Amount, high to low", value: "AMOUNT_DESC" },
];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Created in the chosen period: this week (from Monday), this month, or the last N days including today. */
export function inPeriod(date, period, now = new Date()) {
  if (!period) return true;
  if (!date) return false;
  const day = startOfDay(new Date(date)).getTime();
  const today = startOfDay(now);
  let from;
  if (period === "WEEK") from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  else if (period === "MONTH") from = new Date(today.getFullYear(), today.getMonth(), 1);
  else from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (Number(period) - 1));
  return day >= from.getTime() && day <= today.getTime();
}

/** The report's trip overlaps the chosen dates. A report without trip dates does not match a trip-date filter. */
export function tripOverlaps(report, { from, to } = {}) {
  if (!from && !to) return true;
  const start = report.tripStartDate || report.tripEndDate;
  const end = report.tripEndDate || report.tripStartDate;
  if (!start) return false;
  const s = String(start).slice(0, 10);
  const e = String(end).slice(0, 10);
  return (!to || s <= to) && (!from || e >= from);
}

const ALL_REPORTS_LIMIT = 1000;
const RETURNED_STATUSES = ["AWAITING_CORRECTION", "QUERY_RAISED", "POLICY_REJECTED"];
const NOT_CLAIMED_STATUSES = ["DRAFT", "CANCELLED"];

/** The status the table shows: once approved, the payment state (Paid / Awaiting payment / Settled) replaces it. */
const displayStatusOf = (r) => paymentStateOf(r)?.key || String(r.reportStatus || "DRAFT").toUpperCase();
const statusLabel = (key) => REPORT_STATUS_PILLS[key]?.label || key.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

/** One filter per table column. Select options come from the values the employee's reports actually have. */
export function reportFilters(rows) {
  const statusKeys = [...new Set(rows.map(displayStatusOf))].sort();
  return [
    {
      key: "search", label: "Search", type: "search", placeholder: "Title or report number",
      match: (r, q) => `${r.title || ""} ${r.reportNumber || ""}`.toLowerCase().includes(q.trim().toLowerCase()),
    },
    {
      key: "type", label: "Type", type: "select",
      options: [{ label: "All types", value: "" }, { label: REQUEST_TYPES.EXPENSE.label, value: "EXPENSE" }, { label: "Cash advance", value: "SETTLEMENT" }],
      match: (r, v) => reportTypeOf(r) === v,
    },
    {
      key: "status", label: "Status", type: "select",
      options: [{ label: "All statuses", value: "" }, ...statusKeys.map((k) => ({ label: statusLabel(k), value: k }))],
      match: (r, v) => displayStatusOf(r) === v,
    },
    {
      key: "costCenter", label: "Cost center", type: "select",
      options: distinctOptions(rows, (r) => r.costCenterName, "All cost centers"),
      match: (r, v) => r.costCenterName === v,
    },
    {
      key: "currency", label: "Currency", type: "select",
      options: distinctOptions(rows, (r) => r.currencyCode, "All currencies"),
      match: (r, v) => r.currencyCode === v,
    },
    { key: "amount", label: "Total amount", type: "amountRange", match: (r, v) => inAmountRange(r.totalAmount, v) },
    // Quick access by when the report was created (it has one created date, so presets rather than a range).
    { key: "period", label: "Created", type: "select", options: PERIOD_OPTIONS, match: (r, v) => inPeriod(r.createdAt, v) },
    // The trip has a start and an end, so it gets the range: a report matches when its trip overlaps the dates chosen.
    { key: "trip", label: "Trip dates", type: "dateRange", match: (r, v) => tripOverlaps(r, v) },
    // Not a filter: the order of the list. Always "matches"; the page sorts with it.
    { key: "sort", label: "Sort by", type: "select", options: SORT_OPTIONS, match: () => true },
  ];
}

const REPORT_FILTERS_SHAPE = reportFilters([]);

/** Sorts the filtered reports by the "Sort by" choice. Default (""): newest created first. */
export function sortReports(rows, sort) {
  const time = (v) => (v ? new Date(v).getTime() || 0 : 0);
  const by = {
    "": (a, b) => time(b.createdAt) - time(a.createdAt),
    OLDEST: (a, b) => time(a.createdAt) - time(b.createdAt),
    TRIP_LATEST: (a, b) => time(b.tripStartDate) - time(a.tripStartDate),
    TRIP_EARLIEST: (a, b) => (time(a.tripStartDate) || Infinity) - (time(b.tripStartDate) || Infinity),
    AMOUNT_DESC: (a, b) => (Number(b.totalAmount) || 0) - (Number(a.totalAmount) || 0),
  }[sort || ""];
  return [...rows].sort(by || (() => 0));
}

/**
 * The cards a General employee needs on their own reports, from the filtered rows:
 * what they claimed, what reached their bank, what was set against an advance, what is still owed to them, and what
 * waits for them (drafts to submit, reports sent back).
 */
export function reportKpiCards(rows) {
  const currencies = [...new Set(rows.map((r) => r.currencyCode).filter(Boolean))];
  const cur = currencies.length === 1 ? `${currencies[0]} ` : "";
  const amt = (n) => `${cur}${formatAmount(n)}`;
  const sum = (list, f) => list.reduce((a, r) => a + f(r), 0);
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

  const submitted = rows.filter((r) => !NOT_CLAIMED_STATUSES.includes(String(r.reportStatus || "").toUpperCase()));
  const settled = rows.map(settlementOf).filter(Boolean);
  const paid = settled.filter((s) => s.paid > 0);
  const advance = settled.filter((s) => s.againstAdvance > 0);
  const due = settled.filter((s) => s.due > 0);
  const drafts = rows.filter((r) => String(r.reportStatus || "").toUpperCase() === "DRAFT").length;
  const returned = rows.filter((r) => RETURNED_STATUSES.includes(String(r.reportStatus || "").toUpperCase())).length;
  const mixed = currencies.length > 1 ? " · mixed currencies" : "";

  return [
    { key: "claimed", label: "Claimed", value: amt(sum(submitted, (r) => Number(r.totalAmount) || 0)), hint: `${plural(submitted.length, "submitted report")}${mixed}`, icon: ReceiptText, tone: "bg-indigo-50 text-indigo-600" },
    { key: "paid", label: "Paid to you", value: amt(sum(paid, (s) => s.paid)), hint: plural(paid.length, "report"), icon: BadgeCheck, tone: "bg-emerald-50 text-emerald-600" },
    { key: "advance", label: "From advance", value: amt(sum(advance, (s) => s.againstAdvance)), hint: `${plural(advance.length, "report")}, not paid to bank`, icon: Wallet, tone: "bg-sky-50 text-sky-600" },
    { key: "due", label: "Due to you", value: amt(sum(due, (s) => s.due)), hint: due.length ? "Approved, not paid yet" : "Nothing due", icon: Clock3, tone: "bg-amber-50 text-amber-600" },
    { key: "action", label: "Needs your action", value: String(drafts + returned), hint: `${plural(drafts, "draft")} · ${returned} returned`, icon: Inbox, tone: "bg-rose-50 text-rose-600" },
  ];
}

/**
 * Under the status, only when an approved report's money is split, e.g. part set against the advance and part paid to
 * the employee. A report whose money went one way needs no note: its status (Paid / Settled / Awaiting payment) and
 * Total Amount already say it.
 */
const SPLIT_LABEL = { againstAdvance: "from advance", paid: "paid", due: "due", noPaymentDue: "not payable" };

export function moneySplitNote(report) {
  const s = settlementOf(report);
  if (!s) return null;
  const parts = ["againstAdvance", "paid", "due", "noPaymentDue"].filter((k) => s[k] > 0);
  if (parts.length < 2) return null;
  return parts.map((k) => `${money(s[k])} ${SPLIT_LABEL[k]}`).join(" · ");
}

// One step of an advance's money flow, as a small card. Steps read left to right in the order the money moved.
const STEP_STYLE = {
  paid: "border-slate-200 bg-white text-slate-900",
  carriedIn: "border-violet-200 bg-violet-50 text-violet-800",
  used: "border-sky-200 bg-sky-50 text-sky-800",
  pending: "border-dashed border-slate-300 bg-white text-slate-500",
  salary: "border-rose-200 bg-rose-50 text-rose-800",
  refund: "border-teal-200 bg-teal-50 text-teal-800",
  carriedOut: "border-violet-200 bg-violet-50 text-violet-800",
  remaining: "border-amber-200 bg-amber-50 text-amber-800",
  settledZero: "border-emerald-200 bg-emerald-50 text-emerald-800",
  owedToYou: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

/**
 * The advance behind an advance-settlement report, under its row: every movement of the advance's money as steps
 * (paid out, carried in, used on reports, salary deduction, refund, carried forward, remaining), what to do with any
 * remaining balance, and a button to that advance on My Advances. These are the advance's own figures (one advance can
 * cover several reports); this report's part of it is named at the start.
 */
function AdvanceFlowPanel({ report, linked }) {
  const { advance, figures, loaded } = linked || {};
  const lines = advance && loaded ? advanceMovementLines(figures, advanceMoney(advance)?.outstanding) : null;
  const remaining = lines?.find((l) => l.key === "remaining");
  const mine = settlementOf(report)?.againstAdvance || 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3" data-advance-flow={report.cashAdvanceId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cash advance behind this report</p>
          <p className="truncate text-sm font-semibold text-[#0a174e]">{advance?.title || "Cash advance"}</p>
          {mine > 0 && (
            <p className="text-[11px] text-slate-500">
              This report used <span className="font-semibold text-sky-700">{money(mine)}</span> of the advance.
            </p>
          )}
        </div>
        <Link
          to={myAdvancesLink(report.cashAdvanceId)}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#0A0082]/20 px-3 py-1.5 text-xs font-semibold text-[#0A0082] hover:bg-[#0A0082]/5"
        >
          Open in My Advances <ExternalLink size={12} aria-hidden="true" />
        </Link>
      </div>

      {!advance || !loaded ? (
        <p className="mt-2 text-xs text-slate-400">Loading the advance…</p>
      ) : !lines ? (
        <p className="mt-2 text-xs text-slate-500">This advance has not been paid out yet, so no money has moved.</p>
      ) : (
        <>
          <ol className="mt-3 flex flex-wrap items-stretch gap-1.5" aria-label="Advance money flow">
            {lines.map((l, i) => {
              const styleKey = l.key === "remaining" && !(l.value > 0) ? "settledZero" : l.key;
              return (
                <li key={l.key} className="flex items-center gap-1.5">
                  {i > 0 && <ArrowRight size={13} className="shrink-0 text-slate-300" aria-hidden="true" />}
                  <div className={`rounded-lg border px-2.5 py-1.5 ${STEP_STYLE[styleKey] || STEP_STYLE.paid}`} title={l.note}>
                    <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide opacity-75">{l.label.replace(/^\+ /, "")}</p>
                    <p className="whitespace-nowrap text-sm font-bold tabular-nums">{money(l.value)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          {remaining && remaining.value > 0 ? (
            <p className="mt-2 text-[11px] text-amber-700">
              {money(remaining.value)} is still with you. Settle it by adding bills to a report, refunding it, or Finance can
              recover it from your salary or carry it forward to your next advance.
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-emerald-700">Nothing is left on this advance.</p>
          )}
        </>
      )}
    </div>
  );
}

/** Paid / Settled cell: the report's own money on one line, and a toggle for the advance flow on settlement reports. */
/** Type cell: the request type, and for an advance settlement the arrow that opens the advance's money flow. */
// On My Expenses a report settled against a cash advance is labelled "Cash advance" (advance requests are not listed here).
const MY_TYPE_LABEL = {
  SETTLEMENT: { label: "Cash advance", description: "Expense report settled against your cash advance. Open the arrow to see where the advance money went." },
};

function TypeCell({ report, expanded, onToggle }) {
  const type = reportTypeOf(report);
  if (!report.cashAdvanceId) return <RequestTypeBadge type={type} />;
  const custom = MY_TYPE_LABEL[type] || {};
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-expanded={expanded}
      title={expanded ? "Hide the advance flow" : "Show where the advance money went"}
      className="group inline-flex items-center gap-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
      data-advance-toggle
    >
      <RequestTypeBadge type={type} label={custom.label} description={custom.description} />
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
          expanded ? "border-sky-300 bg-sky-100 text-sky-800" : "border-sky-200 bg-white text-sky-700 group-hover:bg-sky-50"
        }`}
      >
        <ChevronDown size={13} className={`transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
      </span>
    </button>
  );
}

const breadcrumbs = [
  { label: "Expense Management", to: "/expense-management/dashboard" },
  { label: "Expenses", to: "/expense-management/expenses/my" },
  { label: "My Expenses" },
];
 
const emptyReportForm = {
  title: "",
  businessPurpose: "",
  costCenterId: "",
  currencyId: "",
  tripStartDate: "",
  tripEndDate: "",
  projectId: "",
  clientId: "",
};
 
export default function MyExpensesPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  // Manager is read-only on the backend for report writes (ExpenseReportController
  // allows only ADMIN/GENERAL to create/update/delete/submit) — don't show write actions.
  const canManage = hasRole(["General", "Manager"]);
 
  // All of the employee's own reports, loaded once; filters, KPI cards and paging all work on this list.
  const [reports, setReports] = useState([]);
  // The employee's cash advances, to show the advance behind each advance-settlement report.
  const [advances, setAdvances] = useState([]);
  // The report whose advance flow is open under its row (one at a time keeps the table easy to scan).
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
 
  const [currentPage, setCurrentPage] = useState(1);
  const [filterValues, setFilterValues] = useState(() => emptyFilterValues(REPORT_FILTERS_SHAPE));
 
  const [costCenters, setCostCenters] = useState([]);
  const [currencies, setCurrencies] = useState([]);
 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("create"); // "create" or "edit"
  const [currentReport, setCurrentReport] = useState(null);
  const [formData, setFormData] = useState(emptyReportForm);
  // Project and client for the report form: the client field is shown only when the user answers Yes.
  const [showClient, setShowClient] = useState(false);
  const [projectOptions, setProjectOptions] = useState([]);
  const [clientOptions, setClientOptions] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
 
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
 
  const fetchLookups = useCallback(async () => {
    try {
      const [costCenterList, currencyList] = await Promise.all([
        lookupService.getActiveCostCenters(),
        lookupService.getActiveCurrencies(),
      ]);
      setCostCenters(costCenterList);
      setCurrencies(currencyList);
    } catch (err) {
      console.error("Failed to load lookups:", err);
    }
    lookupService.getAssignedProjects()
      .then((list) => setProjectOptions((Array.isArray(list) ? list : []).filter((p) => String(p.status || "").toUpperCase() === "ACTIVE").map((p) => ({ value: p.projectId, label: `${p.projectCode} - ${p.projectName}` }))))
      .catch(() => setProjectOptions([]));
    lookupService.getActiveClients()
      .then((list) => setClientOptions((Array.isArray(list) ? list : []).map((c) => ({ value: c.clientId, label: c.clientName }))))
      .catch(() => setClientOptions([]));
  }, []);
 
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      // One request for every report the employee has (their own list is small), newest first.
      const res = await expenseReportService.getAll({ page: 1, limit: ALL_REPORTS_LIMIT, sortBy: "createdAt", sortDirection: "desc" });
      const payload = res.data?.data;
      const items = Array.isArray(payload)
        ? payload
        : payload?.reports || payload?.expenseReports || payload?.content || payload?.data || [];
      setReports([...items].sort((x, y) => new Date(y.createdAt || 0) - new Date(x.createdAt || 0)));
    } catch (err) {
      console.error("Failed to fetch expense reports:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to fetch expense reports.";
      showStatusToast(errMsg, "error");
      setReports([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);
 
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    cashAdvanceApi
      .getMyAdvances()
      .then((res) => {
        const data = res.data?.data ?? res.data ?? [];
        setAdvances(Array.isArray(data) ? data : data.content || data.items || []);
      })
      .catch(() => setAdvances([]));
  }, []);

  // Only the advances some report is linked to; their settlement figures are loaded once for all rows.
  const linkedAdvances = useMemo(() => {
    const ids = new Set(reports.map((r) => r.cashAdvanceId).filter(Boolean).map(String));
    return advances.filter((a) => ids.has(String(a.advanceId || a.id)));
  }, [reports, advances]);
  const { figuresOf, isLoaded } = useAdvanceFigures(linkedAdvances);
  const linkedOf = (report) => {
    const advance = linkedAdvances.find((a) => String(a.advanceId || a.id) === String(report.cashAdvanceId));
    return advance ? { advance, figures: figuresOf(advance), loaded: isLoaded(advance) } : null;
  };
 
  const filters = useMemo(() => reportFilters(reports), [reports]);
  const filteredReports = useMemo(
    () => sortReports(applyTableFilters(reports, filters, filterValues), filterValues.sort),
    [reports, filters, filterValues],
  );
  const totalCount = filteredReports.length;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 0;
  const displayedReports = filteredReports.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const kpiCards = useMemo(() => reportKpiCards(filteredReports), [filteredReports]);
  const filtersActive = filteredReports.length !== reports.length;

  const handleFiltersChange = (next) => {
    setFilterValues(next);
    setCurrentPage(1);
  };
  const handleFiltersReset = () => handleFiltersChange(emptyFilterValues(filters));
 
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };
 
  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };
 
  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = "Report title is required.";
    } else if (formData.title.trim().length < 3) {
      errors.title = "Title must be at least 3 characters.";
    }
    if (!formData.costCenterId) errors.costCenterId = "Cost center is required.";
    if (!formData.currencyId) errors.currencyId = "Report currency is required.";
    const businessPurposeError = validateBusinessPurpose(formData.businessPurpose);
    if (businessPurposeError) errors.businessPurpose = businessPurposeError;
    const tripDateError = validateTripDates(formData.tripStartDate, formData.tripEndDate);
    if (tripDateError) errors[formData.tripStartDate ? "tripEndDate" : "tripStartDate"] = tripDateError;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
 
  const handleCreateClick = () => {
    setDrawerMode("create");
    setCurrentReport(null);
    setFormData(emptyReportForm);
    setShowClient(false);
    setFormErrors({});
    setIsModalOpen(true);
  };
 
  const handleEditClick = (report) => {
    setDrawerMode("edit");
    setCurrentReport(report);
    setFormData({
      title: report.title || "",
      businessPurpose: report.businessPurpose || "",
      costCenterId: report.costCenterId || "",
      currencyId: report.currencyId || "",
      tripStartDate: (report.tripStartDate || "").slice(0, 10),
      tripEndDate: (report.tripEndDate || "").slice(0, 10),
      projectId: report.projectId || "",
      clientId: report.clientId || "",
    });
    setShowClient(!!report.clientId);
    setFormErrors({});
    setIsModalOpen(true);
  };
 
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
 
    const payload = {
      title: formData.title.trim(),
      businessPurpose: formData.businessPurpose ? formData.businessPurpose.trim() : "",
      costCenterId: formData.costCenterId,
      currencyId: formData.currencyId,
      tripStartDate: formData.tripStartDate,
      tripEndDate: formData.tripEndDate,
      projectId: formData.projectId || null,
      clientId: showClient && formData.clientId ? formData.clientId : null,
    };

    try {
      setSubmitting(true);
      if (drawerMode === "create") {
        const res = await expenseReportService.create(payload);
        showStatusToast("Expense report details saved successfully!", "success");
        setIsModalOpen(false);
        const newReportId = res.data?.data?.reportId || res.data?.reportId || res.data?.data?.id || res.data?.id;
        if (newReportId) {
          navigate(`/expense-management/expenses/reports/${newReportId}`);
        } else {
          showStatusToast("Failed to retrieve report ID.", "error");
        }
      } else {
        await expenseReportService.update(currentReport.reportId, payload);
        showStatusToast("Expense report updated successfully!", "success");
        setIsModalOpen(false);
        fetchReports();
      }
    } catch (err) {
      console.error(`Error ${drawerMode === "create" ? "creating" : "updating"} expense report:`, err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || `Failed to ${drawerMode === "create" ? "create" : "update"} expense report.`;
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };
 
  const handleDeleteClick = (report) => {
    setReportToDelete(report);
    setIsConfirmOpen(true);
  };
 
  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return;
    try {
      setDeleting(true);
      await expenseReportService.delete(reportToDelete.reportId);
      showStatusToast("Expense report deleted successfully!", "success");
      setIsConfirmOpen(false);
      setReportToDelete(null);
      if (displayedReports.length === 1 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else {
        fetchReports();
      }
    } catch (err) {
      console.error("Error deleting expense report:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to delete expense report.";
      showStatusToast(errMsg, "error");
    } finally {
      setDeleting(false);
    }
  };
 
  const costCenterOptions = costCenters.map((c) => ({
    value: c.costCenterId,
    label: `${c.costCenterCode} - ${c.costCenterName}`,
  }));
  const currencyOptions = currencies.map((c) => ({
    value: c.currencyId,
    label: `${c.currencyCode} - ${c.currencyName}`,
  }));
  const headers = ["S.No", "Type", "Title", "Cost Center", "Currency", "Total Amount", "Status", "Created", "Actions"];
  const columns = ["serial_no", "type", "title", "costCenter", "currency", "totalAmount", "status", "created", "actions"];
 
  // Every row action stays visible. An action that does not apply to this report is disabled, and its tooltip says why.
  const reportEditState = (r) => {
    if (!canManage) return { allowed: false, reason: "Only the report owner can edit this report." };
    if (!REPORT_EDITABLE_STATUSES.includes(r.reportStatus)) return { allowed: false, reason: "A report can be edited only while it is a draft or needs correction." };
    return { allowed: true, reason: "Edit Report" };
  };
  const reportDeleteState = (r) => {
    if (!canManage) return { allowed: false, reason: "Only the report owner can delete this report." };
    if (!REPORT_DELETABLE_STATUSES.includes(r.reportStatus)) return { allowed: false, reason: "A report can be deleted only while it is a draft or cancelled." };
    return { allowed: true, reason: "Delete Report" };
  };

  const tableRows = displayedReports.map((r, index) => ({
    serial_no: ((currentPage - 1) * ITEMS_PER_PAGE + index + 1).toString(),
    reportNumber: <span className="font-mono text-[11px] font-semibold text-gray-700">{r.reportNumber || "—"}</span>,
    // A report linked to a cash advance settles that advance; every other report is an ordinary expense claim.
    type: (
      <TypeCell
        report={r}
        expanded={expandedReportId === r.reportId}
        onToggle={() => setExpandedReportId((id) => (id === r.reportId ? null : r.reportId))}
      />
    ),
    title: <span className="font-medium text-xs text-gray-900">{r.title || "Untitled Report"}</span>,
    costCenter: <span className="text-xs">{r.costCenterName || "—"}</span>,
    currency: <span className="font-semibold text-xs text-gray-600">{r.currencyCode || "—"}</span>,
    totalAmount: <span className="font-mono font-semibold text-xs text-gray-900">{formatAmount(r.totalAmount)}</span>,
    expandedContent: expandedReportId === r.reportId && r.cashAdvanceId ? <AdvanceFlowPanel report={r} linked={linkedOf(r)} /> : null,
    status: (
      <div className="flex flex-col items-center gap-1">
        {/* One pill: once approved, the payment state (Awaiting payment / Paid) says more than "Approved". */}
        <ReportStatusPill report={r} />
        {moneySplitNote(r) && <span className="whitespace-nowrap text-[10.5px] leading-none text-gray-500" data-money-split>{moneySplitNote(r)}</span>}
        {getSubmissionDeadlineInfo(r)?.isOverdue && (
          <span className="text-[10.5px] font-medium leading-none text-red-600">Overdue submission</span>
        )}
      </div>
    ),
    created: <span className="whitespace-nowrap text-xs">{formatDate(r.createdAt)}</span>,
    actions: (() => {
      const edit = reportEditState(r);
      const del = reportDeleteState(r);
      return (
        <div className="flex items-center justify-center gap-1">
          <RowIconAction
            icon={Eye}
            label="View Report"
            tone="text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            onClick={() => navigate(`/expense-management/expenses/reports/${r.reportId}`)}
          />
          <RowIconAction
            icon={Pencil}
            label={edit.reason}
            disabled={!edit.allowed}
            tone="text-blue-600 hover:bg-blue-50 hover:text-blue-800"
            onClick={() => handleEditClick(r)}
          />
          <RowIconAction
            icon={Trash2}
            label={del.reason}
            disabled={!del.allowed}
            tone="text-red-600 hover:bg-red-50 hover:text-red-800"
            onClick={() => handleDeleteClick(r)}
          />
        </div>
      );
    })(),
  }));
 
  return (
    <div className="space-y-3">
      <Breadcrumb items={breadcrumbs} />
 
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-[#0a174e]">My Expense Reports</h1>
          <p className="text-xs text-gray-500 mt-0.5">Track and manage the expense reports you've created.</p>
        </div>
 
        {canManage && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              onClick={() => navigate("/expense-management/expenses/supplementary")}
              variant="outline"
              size="small"
              className="w-full whitespace-nowrap sm:w-auto shadow-sm !py-1.5 !text-xs"
            >
              Supplementary claim
            </Button>
            <Button
              onClick={handleCreateClick}
              variant="primary"
              size="small"
              className="w-full whitespace-nowrap sm:w-auto shadow-sm !py-1.5 !text-xs"
            >
              <Plus size={14} />
              Create Expense Report
            </Button>
          </div>
        )}
      </div>
 
      {/* KPI cards: the same filtered reports the table shows, so they always agree with it. */}
      <KpiCards cards={kpiCards} />
 
      <TableFilterBar
        filters={filters}
        values={filterValues}
        onChange={handleFiltersChange}
        onReset={handleFiltersReset}
        resultCount={totalCount}
        totalCount={reports.length}
        noun="reports"
      />
 
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Loading Expense Reports..." />
          </div>
        ) : loadError ? (
          <PageCard>
            <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
              <AlertCircle className="h-10 w-10 text-red-300 mb-3" />
              <h2 className="text-sm font-semibold text-gray-700">Failed to load Expense Reports</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">Something went wrong while fetching data. Please try again.</p>
              <Button variant="outline" size="small" className="mt-4" onClick={fetchReports}>
                Retry
              </Button>
            </PageCardContent>
          </PageCard>
        ) : displayedReports.length === 0 ? (
          <PageCard>
            <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
              <Layers className="h-10 w-10 text-gray-300 mb-3" />
              <h2 className="text-sm font-semibold text-gray-700">No Expense Reports Found</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                {filtersActive
                  ? "No expense reports match the selected search and filters."
                  : "Create your first expense report to get started."}
              </p>
            </PageCardContent>
          </PageCard>
        ) : (
          <>
            <div className="w-full overflow-x-auto rounded-lg [&_td]:!py-2.5 [&_td]:!px-3 [&_td]:!align-middle [&_td]:!text-xs [&_th]:!py-2 [&_th]:!px-3 [&_th]:!text-xs [&_table]:!text-xs">
              <GenericTable
                headers={headers}
                rows={tableRows.map((row, i) => ({ ...row, onRowClick: () => navigate(`/expense-management/expenses/reports/${displayedReports[i].reportId}`) }))}
                columns={columns}
              />
            </div>
            <div className="mt-4 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              />
            </div>
          </>
        )}
      </div>
 
      {isModalOpen && createPortal(
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] animate-in fade-in duration-200"
            onClick={() => setIsModalOpen(false)}
          />
          {/* Drawer Panel */}
          <div
            className="fixed inset-y-0 right-0 z-[10000] w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {drawerMode === "create" ? "Create Expense Report" : "Edit Expense Report"}
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {drawerMode === "create"
                    ? "Start a new expense report, then add individual line items with receipts."
                    : "Modify the selected expense report's properties."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition"
              >
                <X size={18} />
              </button>
            </div>
 
            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <form id="report-edit-form" onSubmit={handleFormSubmit} className="py-2">
                <ReportFormFields
                  formData={formData}
                  formErrors={formErrors}
                  onInputChange={handleInputChange}
                  onSelectChange={handleSelectChange}
                  costCenterOptions={costCenterOptions}
                  currencyOptions={currencyOptions}
                  projectOptions={projectOptions}
                  clientOptions={clientOptions}
                  showClient={showClient}
                  onShowClientChange={setShowClient}
                  disabled={submitting}
                />
              </form>
            </div>
 
            {/* Footer */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitting} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" form="report-edit-form" variant="primary" loading={submitting} loadingText="Saving..." disabled={submitting} className="w-full sm:w-auto">
                {drawerMode === "create" ? "Create Expense Report" : "Save Changes"}
              </Button>
            </div>
          </div>
        </>,
        document.body
      )}
 
      <ConfirmationModal
        isOpen={isConfirmOpen}
        title="Delete Expense Report"
        message={`Are you sure you want to delete the expense report "${reportToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Report"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setIsConfirmOpen(false);
          setReportToDelete(null);
        }}
        isLoading={deleting}
        variant="danger"
      />
    </div>
  );
}
 