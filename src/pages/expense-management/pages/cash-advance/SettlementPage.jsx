import React, { useState, useEffect, useMemo } from "react";
import Pagination from "@/components/Pagination/pagination";
import { loadSettlementLock, SETTLEMENT_LOCK } from "@/pages/expense-management/pages/cash-advance/components/settlementLock";
import { CheckCircle2, RefreshCw, Eye, Receipt, XCircle, Loader2 } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import FormInput from "@/components/forms/FormInput";
import FormTextArea from "@/components/forms/FormTextArea";
import LoadingSpinner from "@/components/LoadingSpinner";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import SettlementModal, { toSettlementAdvance } from "@/components/settlement/SettlementModal";
import { getSettlementBlockReason } from "@/pages/expense-management/api/adjustmentRequest";
import { expenseReportService } from "@/pages/expense-management/api/expenseReportsApi";
import { formatTripDates, activeLinkedReport, linkedExpensesPath } from "@/pages/expense-management/pages/cash-advance/cashAdvanceDisplay";
import AdvanceMoneyOverview from "@/pages/expense-management/pages/cash-advance/components/AdvanceMoneyOverview";
import { employeeKeyOf } from "@/pages/expense-management/pages/cash-advance/components/EmployeeAdvanceBreakdown";
import TableFilterBar, { applyTableFilters, inAmountRange } from "@/pages/expense-management/components/common/TableFilterBar";
import { inPeriod, tripOverlaps } from "@/pages/expense-management/pages/expenses/MyExpensesPage";
import CashAdvanceWorkflowStepper from "@/pages/expense-management/pages/cash-advance/components/CashAdvanceWorkflowStepper";
import CashAdvanceAdjustmentCard from "@/pages/expense-management/pages/cash-advance/components/CashAdvanceAdjustmentCard";
import RecordDisbursementModal from "@/pages/expense-management/components/disbursement/RecordDisbursementModal";
import DisbursementConfirmationFields from "@/pages/expense-management/components/disbursement/DisbursementConfirmationFields";
import {
  buildDisbursementFormData,
  EMPTY_DISBURSEMENT_CONFIRMATION,
} from "@/pages/expense-management/components/disbursement/disbursementConfirmation";
import {
  buildSettlementFormData,
  EMPTY_PAYROLL_DEDUCTION,
  getSettlementDifference,
  SETTLEMENT_ACTION,
  SETTLEMENT_MODES,
  SETTLEMENT_SUCCESS_MESSAGE,
  validateSettlement,
} from "@/pages/expense-management/components/disbursement/settlementRecord";
import { DEFAULT_REVIEW_CYCLE } from "@/pages/expense-management/components/disbursement/settlementRecord";
import { getNextReviewDate, REVIEW_CYCLE_OPTIONS } from "@/pages/expense-management/pages/cash-advance/settlementCycles";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployeeDirectory } from "@/pages/expense-management/approval-engine/hooks/useEmployeeDirectory";
import { settlementTotals, usageShares } from "@/pages/expense-management/pages/cash-advance/settlementFigures";
import { useAdvanceFigures } from "@/pages/expense-management/pages/cash-advance/useAdvanceFigures";
import { ExpenseReportLink, UsageBar, UsageLegend } from "@/pages/expense-management/pages/cash-advance/components/AdvanceRowDetails";

const formatMoney = (amount, currencyCode = "INR") => {
  const num = Number(amount) || 0;
  return `${currencyCode} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const getEmployeeName = (adv, directory) => {
  if (!adv) return "—";
  if (typeof adv.employeeName === "string" && adv.employeeName.trim()) {
    return adv.employeeName;
  }
  if (typeof adv.employee_name === "string" && adv.employee_name.trim()) {
    return adv.employee_name;
  }
  if (typeof adv.employee === "string" && adv.employee.trim()) {
    return adv.employee;
  }
  if (typeof adv.employee === "object" && adv.employee !== null) {
    const name =
      adv.employee.name ||
      adv.employee.employeeName ||
      adv.employee.fullName ||
      [adv.employee.firstName || adv.employee.first_name, adv.employee.lastName || adv.employee.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
    if (name) return name;
  }
  const empId = adv.employeeId || adv.employee_id || adv.userId || adv.createdById || adv.user_id;
  if (empId) {
    const fromDir = directory?.get(empId)?.name || directory?.get(String(empId))?.name || directory?.get(Number(empId))?.name;
    if (fromDir) return fromDir;
    return String(empId);
  }
  return "—";
};

// Statuses in which the employee may attach expenses to settle the advance (matches the backend's
// linkable-advance rule in ExpenseReportServiceImpl).
const LINKABLE_EXPENSE_STATUSES = [
  "DISBURSED", "IN_PROGRESS", "EXPENSE_SUBMITTED", "EXPENSE_VERIFIED",
  "SETTLEMENT_PENDING", "PARTIALLY_ADJUSTED", "PARTIALLY_SETTLED",
];

// The button is for the advance's own employee only. The backend checks this again when the report is created.
// The login token carries the employee id as employee_id; accept the camelCase form too.
const signedInEmployeeId = (user) => user?.employeeId ?? user?.employee_id ?? "";

const canOpenExpenseFor = (adv, user) =>
  Boolean(signedInEmployeeId(user)) &&
  String(adv.employeeId ?? "").trim().toLowerCase() === String(signedInEmployeeId(user)).trim().toLowerCase() &&
  LINKABLE_EXPENSE_STATUSES.includes((adv.status || "").toUpperCase()) &&
  Number(adv.outstandingBalance ?? 0) > 0;

// Status key with spaces and underscores normalised, e.g. "In Progress" and "IN_PROGRESS" are the same status.
const statusKeyOf = (adv) => String(adv.status || "").trim().toUpperCase().replace(/\s+/g, "_");
const statusLabel = (key) =>
  key.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
// Workflow order for the filter list; anything unknown goes last.
const STATUS_ORDER = [
  "APPROVED", "DISBURSED", "IN_PROGRESS", "EXPENSE_SUBMITTED", "SUBMITTED_FOR_REVIEW", "UNDER_REVIEW",
  "RECONCILIATION_PENDING", "EXPENSE_VERIFIED", "PARTIALLY_ADJUSTED", "PARTIALLY_SETTLED", "SETTLEMENT_PENDING",
  "ADJUSTED", "OVERDUE",
];
const statusRank = (key) => {
  const i = STATUS_ORDER.indexOf(key);
  return i === -1 ? STATUS_ORDER.length : i;
};
const isClosedAdvance = (adv) => ["SETTLED", "CLOSED"].includes(statusKeyOf(adv));
const isOpenAdvance = (adv) => !isClosedAdvance(adv);
// Disbursed and still open: the employee holds the money and the advance is not settled yet.
const isDisbursedOpen = (adv) => statusKeyOf(adv) !== "APPROVED" && isOpenAdvance(adv);

/** Advances per page in the Settlement table. */
const SETTLEMENT_PAGE_SIZE = 10;

const advanceCreatedAt = (adv) => adv.createdAt || adv.createdDate || adv.created_at || adv.submittedAt;
const advanceTrip = (adv) => ({ tripStartDate: adv.expectedTripStartDate, tripEndDate: adv.expectedTripEndDate });

/** Matches the Owed / Consumed / Balance columns: where the advance's money stands now. */
const MONEY_OPTIONS = [
  { label: "Any", value: "" },
  { label: "Not paid yet", value: "NOT_PAID" },
  { label: "Balance with employee", value: "BALANCE" },
  { label: "Fully used", value: "USED" },
  { label: "Company owes employee", value: "OWED_TO_EMPLOYEE" },
  { label: "Cut at approval", value: "CUT" },
];

const PERIOD_OPTIONS = [
  { label: "Any time", value: "" },
  { label: "This week", value: "WEEK" },
  { label: "This month", value: "MONTH" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 60 days", value: "60" },
  { label: "Last 90 days", value: "90" },
];

const SORT_OPTIONS = [
  { label: "Newest first", value: "" },
  { label: "Oldest first", value: "OLDEST" },
  { label: "Trip date, latest first", value: "TRIP_LATEST" },
  { label: "Trip date, earliest first", value: "TRIP_EARLIEST" },
  { label: "Balance, high to low", value: "BALANCE_DESC" },
  { label: "Amount, high to low", value: "AMOUNT_DESC" },
];

/** The amount a row shows: owed once paid out, else what was approved (or asked for). */
const rowAmount = (f) => (f.paidOut ? f.owed : f.approved || f.requested);

export const moneyStateMatches = (f, value) => {
  switch (value) {
    case "NOT_PAID": return !f.paidOut;
    case "BALANCE": return f.paidOut && f.remaining > 0;
    case "USED": return f.paidOut && f.remaining === 0 && f.owedToEmployee === 0;
    case "OWED_TO_EMPLOYEE": return f.owedToEmployee > 0;
    case "CUT": return f.cut > 0;
    default: return true;
  }
};

/** The column filters the Settlement table applies on top of search, employee and status. */
const SETTLEMENT_COLUMN_FILTERS = (figuresOf) => [
  { key: "money", type: "select", match: (adv, v) => moneyStateMatches(figuresOf(adv), v) },
  { key: "amount", type: "amountRange", match: (adv, v) => inAmountRange(rowAmount(figuresOf(adv)), v) },
  { key: "trip", type: "dateRange", match: (adv, v) => tripOverlaps(advanceTrip(adv), v) },
  { key: "period", type: "select", match: (adv, v) => inPeriod(advanceCreatedAt(adv), v) },
];

export function sortAdvances(rows, sort, figuresOf) {
  const time = (d) => (d ? new Date(d).getTime() || 0 : 0);
  const trip = (adv) => String(adv.expectedTripStartDate || adv.expectedTripEndDate || "");
  const by = {
    OLDEST: (a, b) => time(advanceCreatedAt(a)) - time(advanceCreatedAt(b)),
    TRIP_LATEST: (a, b) => trip(b).localeCompare(trip(a)),
    TRIP_EARLIEST: (a, b) => (trip(a) || "9999").localeCompare(trip(b) || "9999"),
    BALANCE_DESC: (a, b) => figuresOf(b).remaining - figuresOf(a).remaining,
    AMOUNT_DESC: (a, b) => rowAmount(figuresOf(b)) - rowAmount(figuresOf(a)),
  }[sort] || ((a, b) => time(advanceCreatedAt(b)) - time(advanceCreatedAt(a)));
  return [...rows].sort(by);
}

export default function SettlementPage() {
  const { user, hasRole } = useAuth();
  const { data: directory } = useEmployeeDirectory();
  const navigate = useNavigate();
  const [advances, setAdvances] = useState([]);
  // Per advance: what has already been done with the balance (carry-forward or salary request), if anything.
  const [settlementLocks, setSettlementLocks] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  // Open items (not yet settled or closed) are the working queue; closed records are shown only when asked for.
  const [statusFilter, setStatusFilter] = useState("OPEN");
  // Finance only: narrows the overview card and the list to one employee ("" = everyone).
  const [employeeFilter, setEmployeeFilter] = useState("");
  // Column filters and sort, the same bar as My Expenses and Approvals.
  const EMPTY_EXTRA = { money: "", amount: { min: "", max: "" }, trip: { from: "", to: "" }, period: "", sort: "" };
  const [extra, setExtra] = useState(EMPTY_EXTRA);

  const isFinanceExecutive = useMemo(() => {
    if (typeof hasRole === "function") {
      return hasRole([
        "Finance Executive",
        "FINANCE_EXECUTIVE",
        "Finance",
        "FINANCE",
        "Admin",
        "ADMIN",
        "Super_Admin"
      ]);
    }
    const roles = Array.isArray(user?.roles)
      ? user.roles.map((r) => String(r).toUpperCase())
      : typeof user?.role === "string"
      ? [user.role.toUpperCase()]
      : [];
    return roles.some((r) =>
      ["FINANCE EXECUTIVE", "FINANCE_EXECUTIVE", "FINANCE", "ADMIN", "SUPER_ADMIN"].includes(r)
    );
  }, [user, hasRole]);

  const [disbursing, setDisbursing] = useState(null);
  const [settlingAdvance, setSettlingAdvance] = useState(null);
  const [settlementAction, setSettlementAction] = useState(SETTLEMENT_ACTION.SETTLE);
  const [settlementConfirmation, setSettlementConfirmation] = useState(EMPTY_DISBURSEMENT_CONFIRMATION);
  const [settlementPayroll, setSettlementPayroll] = useState(EMPTY_PAYROLL_DEDUCTION);
  const [settlementErrors, setSettlementErrors] = useState({});
  const [settlementReviewCycle, setSettlementReviewCycle] = useState(DEFAULT_REVIEW_CYCLE);
  const [settlementNotes, setSettlementNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Cash Advance", to: "/expense-management/cash-advance/my" },
    { label: "Settlement" },
  ];

  const fetchSettlementAdvances = async () => {
    setLoading(true);
    try {
      let res, reportsRes;
      if (isFinanceExecutive) {
        try {
          [res, reportsRes] = await Promise.all([
            cashAdvanceApi.getAll(),
            expenseReportService.getAll({ limit: 1000, page: 1 }).catch(() => ({ data: [] }))
          ]);
        } catch {
          [res, reportsRes] = await Promise.all([
            cashAdvanceApi.getMyAdvances(),
            expenseReportService.getAll({ limit: 1000, page: 1 }).catch(() => ({ data: [] }))
          ]);
        }
      } else {
        try {
          [res, reportsRes] = await Promise.all([
            cashAdvanceApi.getMyAdvances(),
            expenseReportService.getAll({ limit: 1000, page: 1 }).catch(() => ({ data: [] }))
          ]);
        } catch {
          [res, reportsRes] = await Promise.all([
            cashAdvanceApi.getAll(),
            expenseReportService.getAll({ limit: 1000, page: 1 }).catch(() => ({ data: [] }))
          ]);
        }
      }
      const data = res.data?.data || res.data || [];
      const list = Array.isArray(data) ? data : data.content || data.items || [];

      const rawReports = reportsRes?.data?.data || reportsRes?.data || [];
      const reportsList = Array.isArray(rawReports)
        ? rawReports
        : rawReports.reports || rawReports.expenseReports || rawReports.content || rawReports.items || [];

      const enrichedAdvances = list.map((adv) => {
        const advIdStr = String(adv.advanceId || adv.id || adv.cashAdvanceId || "");
        const linkedReports = reportsList.filter((r) => {
          const reportAdvId = String(r.cashAdvanceId || r.advanceId || "");
          return reportAdvId && reportAdvId === advIdStr;
        });

        const verifiedExpSum = linkedReports
          .filter((r) => {
            const statusUpper = (r.status || "").toUpperCase();
            return !["REJECTED", "DRAFT", "CANCELLED"].includes(statusUpper);
          })
          .reduce((sum, r) => {
            const amt = Number(r.totalAmount ?? r.amount ?? r.totalApprovedAmount ?? r.approvedAmount ?? r.verifiedAmount ?? 0);
            return sum + amt;
          }, 0);

        const verifiedExpenseAmount =
          adv.verifiedExpenseAmount != null && Number(adv.verifiedExpenseAmount) > 0
            ? Number(adv.verifiedExpenseAmount)
            : adv.expenseAmount != null && Number(adv.expenseAmount) > 0
            ? Number(adv.expenseAmount)
            : adv.totalExpenses != null && Number(adv.totalExpenses) > 0
            ? Number(adv.totalExpenses)
            : verifiedExpSum;

        const advAmt = Number(adv.amount) || 0;
        const outstandingBalance =
          adv.outstandingBalance != null
            ? Number(adv.outstandingBalance)
            : Math.max(0, advAmt - verifiedExpenseAmount);

        return {
          ...adv,
          verifiedExpenseAmount,
          outstandingBalance,
          linkedExpenseReport: linkedReports[0] || adv.linkedExpenseReport || null,
          linkedExpenseReports: linkedReports,
        };
      });

      // Filter for advances that are active post-disbursement or closed
      const relevant = enrichedAdvances.filter((a) =>
        [
          "DISBURSED", "IN_PROGRESS", "IN PROGRESS",
          "RECONCILIATION_PENDING", "RECONCILIATION PENDING",
          "SUBMITTED_FOR_REVIEW", "SUBMITTED FOR REVIEW", "EXPENSE_SUBMITTED",
          "UNDER_REVIEW", "UNDER REVIEW",
          "APPROVED", "EXPENSE_VERIFIED",
          "SETTLEMENT_PENDING", "SETTLEMENT PENDING", "PARTIALLY_SETTLED", "PARTIALLY_ADJUSTED",
          "CLOSED", "SETTLED", "ADJUSTED"
        ].includes((a.status || "").toUpperCase())
      );
      setAdvances(relevant.length > 0 ? relevant : enrichedAdvances);
    } catch (err) {
      console.error("Failed to load settlement advances:", err);
      showStatusToast("Failed to load settlement advances", "error");
    } finally {
      setLoading(false);
    }
  };

  // Lock state for every advance on the list, so a settled-by-action advance cannot be settled again.
  useEffect(() => {
    let cancelled = false;
    const ids = advances.map((a) => a.advanceId || a.id).filter(Boolean);
    Promise.all(ids.map((id) => loadSettlementLock(id).then((lock) => [id, lock]).catch(() => [id, { kind: null }])))
      .then((pairs) => {
        if (!cancelled) setSettlementLocks(Object.fromEntries(pairs));
      });
    return () => {
      cancelled = true;
    };
  }, [advances]);

  // Per-advance money figures from the server: expenses added (utilization) and what Payroll has deducted.
  const { figuresOf, isLoaded, usageById } = useAdvanceFigures(advances);

  useEffect(() => {
    fetchSettlementAdvances();
  }, [isFinanceExecutive]);

  const employeeKey = (adv) => employeeKeyOf(adv, getEmployeeName(adv, directory));

  // Advances matching the status filter and search, for every employee.
  const listAdvances = useMemo(() => {
    return advances.filter((adv) => {
      // OPEN / ALL / DISBURSED / CLOSED are groups; any other value is one exact status (e.g. "IN_PROGRESS").
      let matchStatus = true;
      if (statusFilter === "OPEN") {
        matchStatus = isOpenAdvance(adv);
      } else if (statusFilter === "DISBURSED") {
        matchStatus = isDisbursedOpen(adv);
      } else if (statusFilter === "CLOSED") {
        matchStatus = isClosedAdvance(adv);
      } else if (statusFilter !== "ALL") {
        matchStatus = statusKeyOf(adv) === statusFilter;
      }

      const empName = getEmployeeName(adv, directory);

      const matchSearch =
        !searchTerm ||
        (adv.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (adv.purpose || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (adv.advanceId || adv.id || "").toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        empName.toLowerCase().includes(searchTerm.toLowerCase());

      return matchStatus && matchSearch;
    });
  }, [advances, statusFilter, searchTerm, directory]);

  // ...narrowed to the selected employee and the column filters, then sorted. The overview card and the table read this.
  const filteredAdvances = useMemo(() => {
    const byEmployee = employeeFilter ? listAdvances.filter((adv) => employeeKey(adv) === employeeFilter) : listAdvances;
    const rows = applyTableFilters(byEmployee, SETTLEMENT_COLUMN_FILTERS(figuresOf), extra);
    return sortAdvances(rows, extra.sort, figuresOf);
    // figuresOf reads usageById
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listAdvances, employeeFilter, directory, extra, usageById]);

  // Every employee with an advance on the page, whatever the other filters, so a selection never disappears.
  const employeeOptions = useMemo(() => {
    const seen = new Map();
    advances.forEach((adv) => {
      const key = employeeKey(adv);
      if (key && !seen.has(key)) seen.set(key, getEmployeeName(adv, directory));
    });
    return [
      { label: "All employees", value: "" },
      ...[...seen.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ label, value })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advances, directory]);

  const selectedEmployeeName = employeeOptions.find((o) => o.value === employeeFilter && o.value)?.label || "";

  // The table shows one page at a time; the totals above still cover every advance on the list.
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredAdvances.length / SETTLEMENT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedAdvances = filteredAdvances.slice((safePage - 1) * SETTLEMENT_PAGE_SIZE, safePage * SETTLEMENT_PAGE_SIZE);
  // A new search, filter or sort starts again on page 1.
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, employeeFilter, extra]);

  // Totals for every advance of the employee (or everyone, for Finance), whatever its status, so they match the
  // dashboard and My Advances. The Status and column filters narrow only the table below.
  const scopeAdvances = useMemo(
    () => (employeeFilter ? advances.filter((adv) => employeeKey(adv) === employeeFilter) : advances),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [advances, employeeFilter, directory]
  );
  const totals = useMemo(
    () => settlementTotals(scopeAdvances.map((a) => figuresOf(a))),
    // figuresOf reads usageById
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scopeAdvances, usageById]
  );
  const figuresLoading = advances.some((a) => !isLoaded(a));

  const handleDisburse = (adv) => {
    if (!isFinanceExecutive) return;
    setDisbursing(adv);
  };

  const handleConfirmDisburse = async (values) => {
    if (!disbursing) return;
    const advanceId = disbursing.advanceId || disbursing.id;

    setSubmitting(true);
    try {
      // Fully covered by carried-in balance: there is no payment to describe, so nothing is sent with the request.
      const noPaymentDue = Number(disbursing.amount) - Number(disbursing.carriedInAmount || 0) <= 0;
      await cashAdvanceApi.disburse(advanceId, noPaymentDue ? null : buildDisbursementFormData(values));
      showStatusToast(`Cash advance #${String(advanceId).slice(0, 8)} disbursed successfully!`, "success");
      setDisbursing(null);
      fetchSettlementAdvances();
    } catch (err) {
      console.error("Disbursement error:", err);
      showStatusToast(
        err?.response?.data?.message || "Failed to disburse cash advance",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenSettle = (adv) => {
    if (!isFinanceExecutive) return;
    // Prevent a second settlement of an advance that is already closed or has nothing outstanding.
    const nothingOutstanding = isLoaded(adv) ? figuresOf(adv).outstanding <= 0 : Number(adv.outstandingBalance) === 0;
    if (["SETTLED", "CLOSED"].includes(String(adv.status || "").toUpperCase()) || nothingOutstanding) {
      showStatusToast("This advance is already settled.", "error");
      return;
    }
    setSettlingAdvance(adv);
    setSettlementAction(SETTLEMENT_ACTION.SETTLE);
    setSettlementConfirmation(EMPTY_DISBURSEMENT_CONFIRMATION);
    setSettlementPayroll(EMPTY_PAYROLL_DEDUCTION);
    setSettlementErrors({});

    const advAmt = Number(adv.amount) || 0;
    const expAmt = Number(adv.verifiedExpenseAmount || adv.expenseAmount || adv.totalExpenses || 0);
    const diff = advAmt - expAmt;
    const currency = adv.currencyCode || "INR";

    if (diff > 0) {
      setSettlementNotes("Expenses verified. Balance to be refunded.");
    } else if (diff < 0) {
      setSettlementNotes("Expenses verified. Balance to be reimbursed.");
    } else {
      setSettlementNotes("Expenses verified. Fully settled.");
    }
  };

  // Records the settlement as an adjustment entry. The advance is never closed from here: the server
  // closes it only once the balance is actually zero, so a settlement cannot be marked done early.
  const handleConfirmSettlement = async (e) => {
    e.preventDefault();
    if (!settlingAdvance) return;
    const advanceId = settlingAdvance.advanceId || settlingAdvance.id;

    const advanceAmount = Number(settlingAdvance.amount) || 0;
    const verifiedExpenseAmount = Number(
      settlingAdvance.verifiedExpenseAmount ||
      settlingAdvance.expenseAmount ||
      settlingAdvance.totalExpenses ||
      0
    );
    const diff = getSettlementDifference(advanceAmount, verifiedExpenseAmount);

    const errors = validateSettlement({
      action: settlementAction,
      diff,
      confirmation: settlementConfirmation,
      payroll: settlementPayroll,
      reviewCycle: settlementReviewCycle,
    });
    setSettlementErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // The adjustment endpoint cannot record this settlement yet (see getSettlementBlockReason). Stop before sending.
    const blockReason = getSettlementBlockReason(settlementAction);
    if (blockReason) {
      showStatusToast(blockReason, "error", 8000);
      return;
    }

    setSubmitting(true);
    try {
      await cashAdvanceApi.createReimbursementAdjustment(
        buildSettlementFormData({
          advanceId,
          expenseReportId: settlingAdvance.linkedExpenseReport?.reportId || settlingAdvance.linkedExpenseReport?.id,
          action: settlementAction,
          advanceAmount,
          verifiedExpenseAmount,
          currencyCode: settlingAdvance.currencyCode,
          confirmation: settlementConfirmation,
          payroll: settlementPayroll,
          reviewCycle: settlementReviewCycle,
          notes: settlementNotes,
        })
      );

      showStatusToast(
        `Cash advance #${String(advanceId).slice(0, 8)}: ${SETTLEMENT_SUCCESS_MESSAGE[settlementAction]}`,
        "success"
      );
      setSettlingAdvance(null);
      fetchSettlementAdvances();
    } catch (err) {
      console.error("Settlement error:", err);
      showStatusToast(err.response?.data?.message || "Failed to record cash advance settlement", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const paymentMethodOptions = [
    { label: "Bank Transfer (NEFT/RTGS/IMPS)", value: "BANK_TRANSFER" },
    { label: "Payroll Adjustment / Deduction", value: "PAYROLL" },
    { label: "Cash Payment", value: "CASH" },
    { label: "Cheque", value: "CHEQUE" },
  ];

  const settlementTypeOptions = [
    { label: "Employee Repayment (Employee pays company remaining balance)", value: "REPAYMENT" },
    { label: "Additional Reimbursement Payout (Company pays employee excess expenses)", value: "REIMBURSEMENT" },
  ];

  // Options come from the statuses actually on this page, so every choice matches real rows. The groups Finance works
  // from keep fixed names; below them, one option per status present (In Progress, Settlement Pending, ...).
  const statusOptions = useMemo(() => {
    const present = [...new Set(advances.filter(isOpenAdvance).map(statusKeyOf))]
      .filter((key) => key !== "APPROVED")
      .sort((a, b) => statusRank(a) - statusRank(b) || a.localeCompare(b));
    const has = (pred) => advances.some(pred);
    return [
      { label: "Open (needs action)", value: "OPEN" },
      { label: "All Advances (incl. closed)", value: "ALL" },
      ...(has((a) => statusKeyOf(a) === "APPROVED") ? [{ label: "Approved (Awaiting Disbursement)", value: "APPROVED" }] : []),
      ...(has(isDisbursedOpen) ? [{ label: "Disbursed / Outstanding", value: "DISBURSED" }] : []),
      ...present.map((key) => ({ label: statusLabel(key), value: key })),
      ...(has(isClosedAdvance) ? [{ label: "Closed (Fully Settled)", value: "CLOSED" }] : []),
    ];
  }, [advances]);

  // Shown in the header so the user can see which role this session is working under.
  const roleLabel = useMemo(() => {
    const roles = Array.isArray(user?.roles)
      ? user.roles.map((r) => String(r).toUpperCase())
      : typeof user?.role === "string"
      ? [user.role.toUpperCase()]
      : [];
    if (roles.some((r) => ["FINANCE EXECUTIVE", "FINANCE_EXECUTIVE", "FINANCE"].includes(r))) return "Finance Executive";
    if (roles.some((r) => ["ADMIN", "SUPER_ADMIN"].includes(r))) return "Administrator";
    if (roles.some((r) => r.includes("MANAGER"))) return "Manager";
    return "Employee";
  }, [user]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbs} />

      {/* Header Card */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0a174e]">Cash Advance Settlement & Closure</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Signed in as <span className="font-semibold text-gray-700">{roleLabel}</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Settle outstanding cash advance balances against submitted expenses, record repayments/reimbursements, and achieve zero-balance closure.
          </p>
        </div>

        <button
          onClick={fetchSettlementAdvances}
          title="Refresh list"
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md transition self-start sm:self-auto"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Money summary: where the disbursed cash went, for the advances on the list */}
      {/* Until the advances and their figures are loaded, the global spinner instead of a summary full of zeros. */}
      {loading || figuresLoading ? (
        <section aria-label="Money summary" aria-busy="true" className="flex min-h-[14rem] items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm" data-overview-loading>
          <LoadingSpinner size="lg" text={loading ? "Loading cash advances..." : "Working out where the advance money went..."} />
        </section>
      ) : (
      <AdvanceMoneyOverview
        totals={totals}
        loading={figuresLoading}
        scopeLabel={selectedEmployeeName}
        scopeNote="All advances, whatever their status, as on the dashboard. The Status filter below narrows only the table."
      />
      )}

      {/* Filters: one per table column, plus the period and the sort */}
      <TableFilterBar
        filters={[
          { key: "search", label: "Search", type: "search", placeholder: "Title, purpose, advance ID or employee" },
          ...(isFinanceExecutive ? [{ key: "employee", label: "Employee", type: "select", options: employeeOptions }] : []),
          { key: "status", label: "Status", type: "select", options: statusOptions },
          { key: "money", label: "Money", type: "select", options: MONEY_OPTIONS },
          { key: "amount", label: "Owed amount", type: "amountRange" },
          { key: "trip", label: "Trip dates", type: "dateRange" },
          { key: "period", label: "Requested", type: "select", options: PERIOD_OPTIONS },
          { key: "sort", label: "Sort by", type: "select", options: SORT_OPTIONS },
        ]}
        values={{ search: searchTerm, employee: employeeFilter, status: statusFilter, ...extra }}
        onChange={(v) => {
          setSearchTerm(v.search ?? "");
          setEmployeeFilter(v.employee ?? "");
          setStatusFilter(v.status || "OPEN");
          setExtra({ money: v.money ?? "", amount: v.amount, trip: v.trip, period: v.period ?? "", sort: v.sort ?? "" });
        }}
        onReset={() => {
          setSearchTerm("");
          setEmployeeFilter("");
          setStatusFilter("OPEN");
          setExtra(EMPTY_EXTRA);
        }}
        resultCount={filteredAdvances.length}
        totalCount={advances.length}
        noun="advances"
      />

      {/* Data Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-500">
            <LoadingSpinner size="lg" text="Loading cash advance settlement records..." />
          </div>
        ) : filteredAdvances.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CheckCircle2 className="mx-auto h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-700">No settlement records found</p>
            <p className="text-xs text-gray-400 mt-1">There are no cash advance settlements matching your filter criteria.</p>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  {isFinanceExecutive && <th className="py-3 px-4">Employee Name</th>}
                  <th className="py-3 px-4">Title & Money Usage</th>
                  <th className="py-3 px-4">Trip Dates</th>
                  <th className="py-3 px-4 text-right" title="Disbursed plus any outstanding brought into this advance">Owed</th>
                  <th className="py-3 px-4 text-right" title="Expenses on approved reports, set against this advance">Used</th>
                  <th className="py-3 px-4 text-right" title="Owed minus consumed on this advance">Balance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedAdvances.map((adv) => {
                  const advId = adv.advanceId || adv.id;
                  const statusUpper = (adv.status || "").toUpperCase();
                  const isSettled = ["SETTLED", "CLOSED"].includes(statusUpper);
                  const f = figuresOf(adv);
                  const cur = adv.currencyCode || "INR";
                  const pending = !isLoaded(adv);
                  // Not paid out yet (e.g. approved, waiting to disburse): later figures do not exist yet.
                  const cell = (value) =>
                    pending ? <span className="text-gray-300">…</span> : !f.paidOut ? <span className="text-[11px] font-normal text-gray-400">Not paid yet</span> : formatMoney(value, cur);


                  return (
                    <tr key={advId} className="hover:bg-gray-50/80 transition">
                      {isFinanceExecutive && (
                        <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">
                          {getEmployeeName(adv, directory)}
                        </td>
                      )}
                      <td className="py-3 px-4 min-w-[12rem] max-w-xs">
                        <p className="font-semibold text-gray-900 truncate" title={adv.purpose || undefined}>{adv.title || "Cash Advance"}</p>
                        {/* Reduced at approval: what was asked, what was approved, and the cut */}
                        {f.cut > 0 && (
                          <p className="mt-0.5 text-[11px] text-gray-500" data-approval-cut>
                            Asked {formatMoney(f.requested, cur)} · approved {formatMoney(f.approved, cur)}{" "}
                            <span className="font-semibold text-rose-600">(cut {formatMoney(f.cut, cur)})</span>
                          </p>
                        )}
                        {!pending && f.owed > 0 && (
                          <div className="mt-1.5">
                            <UsageBar figures={f} />
                            <p className="mt-1 text-[10px] text-gray-500">{Math.round(usageShares(f).spent)}% spent on expenses</p>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-gray-600">{formatTripDates(adv)}</td>
                      <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                        {!pending && !f.paidOut && f.awaitingDisbursement > 0 ? (
                          <>
                            <span className="font-semibold text-gray-500">{formatMoney(f.awaitingDisbursement, cur)}</span>
                            <p className="mt-0.5 text-[10px] text-amber-700">Approved, to disburse</p>
                          </>
                        ) : (
                          <span className="font-semibold text-gray-900">{cell(f.owed)}</span>
                        )}
                        {!pending && f.paidOut && f.carriedIn > 0 && (
                          <p className="mt-0.5 text-[10px] text-violet-700">incl. {formatMoney(f.carriedIn, cur)} brought in</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                        <span className="font-semibold text-sky-700">{cell(f.approvedConsumed ?? f.consumed)}</span>
                        {!pending && f.paidOut && f.approvedConsumed != null && f.consumed > f.approvedConsumed && (
                          <p className="mt-0.5 text-[10px] text-gray-500">+ {formatMoney(f.consumed - f.approvedConsumed, cur)} not approved yet</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold whitespace-nowrap tabular-nums">
                        <span className={pending ? "" : f.remaining > 0 ? "text-amber-600" : "text-emerald-600"}>
                          {cell(f.remaining)}
                        </span>
                        {/* Outstanding differs from the balance once part of it is recovered or carried forward */}
                        {!pending && f.paidOut && f.outstanding !== f.remaining && (
                          <p className="mt-0.5 text-[10px] font-medium text-gray-500">Outstanding {formatMoney(f.outstanding, cur)}</p>
                        )}
                        {!pending && f.held > 0 && (
                          <p className="mt-0.5 text-[10px] font-medium text-violet-700">+ {formatMoney(f.held, cur)} carried forward</p>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${
                            isSettled
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : statusUpper === "SETTLEMENT_PENDING" || statusUpper === "PARTIALLY_SETTLED"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : statusUpper === "APPROVED" || statusUpper === "EXPENSE_VERIFIED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : statusUpper === "UNDER_REVIEW" || statusUpper === "UNDER REVIEW"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : statusUpper === "SUBMITTED_FOR_REVIEW" || statusUpper === "SUBMITTED FOR REVIEW" || statusUpper === "EXPENSE_SUBMITTED"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : statusUpper === "RECONCILIATION_PENDING" || statusUpper === "RECONCILIATION PENDING"
                              ? "bg-orange-50 text-orange-700 border-orange-200"
                              : "bg-indigo-50 text-indigo-700 border-indigo-200"
                          }`}
                        >
                          {isSettled
                            ? "Closed"
                            : statusUpper === "SETTLEMENT_PENDING" || statusUpper === "PARTIALLY_SETTLED"
                            ? "Settlement Pending"
                            : statusUpper === "APPROVED" || statusUpper === "EXPENSE_VERIFIED"
                            ? "Approved"
                            : statusUpper === "UNDER_REVIEW" || statusUpper === "UNDER REVIEW"
                            ? "Under Review"
                            : statusUpper === "SUBMITTED_FOR_REVIEW" || statusUpper === "SUBMITTED FOR REVIEW" || statusUpper === "EXPENSE_SUBMITTED"
                            ? "Submitted for Review"
                            : statusUpper === "RECONCILIATION_PENDING" || statusUpper === "RECONCILIATION PENDING"
                            ? "Reconciliation Pending"
                            : "In Progress"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Expense-report shortcut is for the employee who owns the advance; finance users don't get it. */}
                          {!isFinanceExecutive && <ExpenseReportLink figures={f} />}
                          <button
                            onClick={() => navigate(`/expense-management/cash-advance/settlement/${adv.advanceId || adv.id}`)}
                            title="View Details & Lifecycle"
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition flex items-center gap-1"
                          >
                            <Eye size={15} />
                          </button>

                          {canOpenExpenseFor(adv, user) && (
                            <button
                              onClick={() => navigate(linkedExpensesPath(adv, f.reports))}
                              title={activeLinkedReport(adv, f.reports) ? "Add expenses to the linked expense report" : "Create an expense report for this cash advance"}
                              aria-label="Cash Advance Expense"
                              className="inline-flex items-center rounded-md border p-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                            >
                              <Receipt size={15} />
                            </button>
                          )}

                          {isFinanceExecutive && (
                            <>
                              {statusUpper === "APPROVED" && (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleDisburse(adv)}
                                  disabled={submitting}
                                  className="!py-1 !px-2.5 !text-[11px] bg-blue-600 hover:bg-blue-700 text-white"
                                  title="Initiate payment disbursement"
                                >
                                  {submitting ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                                  Disburse
                                </Button>
                              )}
                              {!isSettled && statusUpper !== "APPROVED" && (() => {
                                const lockKind = settlementLocks[adv.advanceId || adv.id]?.kind;
                                const locked = Boolean(lockKind);
                                return (
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => handleOpenSettle(adv)}
                                    disabled={locked}
                                    title={
                                      lockKind === SETTLEMENT_LOCK.CARRY_FORWARD
                                        ? "Carry-forward is already set for this advance"
                                        : lockKind === SETTLEMENT_LOCK.SALARY
                                          ? "A salary deduction is already requested for this advance"
                                          : undefined
                                    }
                                    className={`!py-1 !px-2.5 !text-[11px] text-white ${locked ? "bg-gray-300 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`}
                                  >
                                    Settle Advance
                                  </Button>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-2" data-settlement-pagination>
              <p className="text-xs text-gray-500">
                Showing {(safePage - 1) * SETTLEMENT_PAGE_SIZE + 1}–{Math.min(safePage * SETTLEMENT_PAGE_SIZE, filteredAdvances.length)} of{" "}
                {filteredAdvances.length} advances
              </p>
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPrevious={() => setPage(Math.max(1, safePage - 1))}
                onNext={() => setPage(Math.min(totalPages, safePage + 1))}
              />
            </div>
          )}
          </>
        )}
      </div>


      {/* Settle Advance Details Modal / Panel */}
      {/* Disbursement Confirmation Modal */}
      {isFinanceExecutive && disbursing && (
        <RecordDisbursementModal
          title="Disburse Cash Advance"
          submitLabel="Confirm Disburse"
          paymentRequired={Number(disbursing.amount) - Number(disbursing.carriedInAmount || 0) > 0}
          isSubmitting={submitting}
          onCancel={() => setDisbursing(null)}
          onSubmit={handleConfirmDisburse}
          summary={(() => {
            // The advance's amount includes any carried-forward balance, which the employee already holds. Only the
            // new cash is paid now; the total is what the employee will account for with expenses or a refund.
            const cur = disbursing.currencyCode || "INR";
            const total = Number(disbursing.amount) || 0;
            const carried = Math.max(0, Number(disbursing.carriedInAmount) || 0);
            const cash = Math.max(0, total - carried);
            const advanceRef = `#${String(disbursing.advanceId || disbursing.id).slice(0, 8)}`;
            return (
            <>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-700" data-testid="disburse-intro">
                  You are about to <strong>pay {formatMoney(cash, cur)}</strong> for cash advance request{" "}
                  <strong className="text-blue-900">{advanceRef}</strong>.
                  {carried > 0 && (
                    <> The rest of the {formatMoney(total, cur)} advance is a carried-forward balance the employee already holds, so it is not paid again.</>
                  )}
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2" data-testid="disburse-breakdown">
                {carried > 0 ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-xs font-medium text-gray-600">New cash approved</span>
                      <span className="text-xs font-bold text-gray-900">{formatMoney(cash, cur)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs font-medium text-gray-600">+ Carried forward (already with the employee)</span>
                      <span className="text-xs font-bold text-violet-700">{formatMoney(carried, cur)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs font-medium text-gray-600">= Total advance (the employee accounts for this)</span>
                      <span className="text-xs font-bold text-gray-900">{formatMoney(total, cur)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-xs font-medium text-gray-600">Approved amount</span>
                    <span className="text-xs font-bold text-gray-900">{formatMoney(total, cur)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-xs font-semibold text-gray-800">Pay to employee now</span>
                  <span className="text-sm font-bold text-emerald-700">{formatMoney(cash, cur)}</span>
                </div>
              </div>

              {Number(disbursing.amount) - Number(disbursing.carriedInAmount || 0) > 0 && (
                <div className="text-xs text-gray-600 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="font-medium text-amber-900 mb-1">Payment will be initiated to:</p>
                  <p className="text-amber-800">{disbursing.employeeName || `Employee ID: ${disbursing.employeeId || disbursing.employee_id}`}</p>
                </div>
              )}
            </>
            );
          })()}
        />
      )}

      <SettlementModal
        isOpen={isFinanceExecutive && !!settlingAdvance}
        /* Same figures as the list row, so owed / consumed / outstanding match what Finance clicked on. */
        advance={
          settlingAdvance
            ? toSettlementAdvance(
                { ...settlingAdvance, employeeName: getEmployeeName(settlingAdvance, directory) },
                isLoaded(settlingAdvance) ? figuresOf(settlingAdvance) : null
              )
            : null
        }
        loading={Boolean(settlingAdvance) && !isLoaded(settlingAdvance)}
        onClose={() => setSettlingAdvance(null)}
        onSettled={() => {
          setSettlingAdvance(null);
          fetchSettlementAdvances();
        }}
      />
    </div>
  );
}
