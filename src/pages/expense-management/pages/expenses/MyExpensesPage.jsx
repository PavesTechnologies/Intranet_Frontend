import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  FileStack,
  FilePen,
  Hourglass,
  AlertTriangle,
  Wallet,
  BadgeCheck,
  Layers,
  AlertCircle,
  X,
  Paperclip,
  Receipt,
  CalendarDays,
  ShieldAlert,
  HandCoins,
  ArrowRight,
  Clock,
  RefreshCw,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { showStatusToast } from "@/components/toastfy/toast";
import {
  expenseReportService,
  lookupService,
  REPORT_EDITABLE_STATUSES,
  REPORT_DELETABLE_STATUSES,
} from "@/pages/expense-management/api/expenseReportsApi";
import ReportFormFields, { validateBusinessPurpose } from "@/pages/expense-management/components/expense-reports/ReportFormFields";
import { getSubmissionDeadlineInfo, validateTripDates, formatDeadlineDate } from "@/pages/expense-management/components/expense-reports/submissionDeadline";
import {
  reportJourney,
  JOURNEY_STEPS,
  TONE_CLASSES,
  STATUS_LABELS,
  NEEDS_EMPLOYEE_ACTION,
  IN_REVIEW,
} from "@/pages/expense-management/components/expense-reports/reportJourney";
import SavedFiltersControl from "@/pages/expense-management/components/common/SavedFiltersControl";
import Pagination from "@/components/Pagination/pagination";

const ITEMS_PER_PAGE = 10;
// The summary cards and filter counts cover the employee's latest reports up to this many.
const OVERVIEW_LIMIT = 200;

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const formatShortDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { month: "short", day: "2-digit" });
};

/** Report totals are stored in the organization base currency (baseCurrencyCode), not the report currency. */
const formatMoney = (value, currencyCode = "INR") => {
  const amount = Number(value) || 0;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currencyCode || "INR", minimumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currencyCode || ""} ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
  }
};

const statusOf = (r) => String(r?.reportStatus || "DRAFT").toUpperCase();
const amountPaidOf = (r) => Number(r?.paymentConfirmation?.amountPaid ?? r?.reimbursableAmount) || 0;

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

// Order of the status filter chips; only statuses the employee actually has are shown (plus the active one).
const STATUS_FILTER_ORDER = [
  "DRAFT",
  "AWAITING_CORRECTION",
  "QUERY_RAISED",
  "POLICY_REJECTED",
  "PENDING_APPROVAL",
  "PENDING_FINANCE_VERIFICATION",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

function JourneyBadge({ report }) {
  const journey = reportJourney(report);
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASSES[journey.tone]}`}>
      {journey.label}
    </span>
  );
}

/** Five dots: Draft → Approval → Finance check → Payment → Done, filled up to where the report is. */
function JourneyProgress({ report }) {
  const journey = reportJourney(report);
  const backWithEmployee = NEEDS_EMPLOYEE_ACTION.includes(statusOf(report));
  return (
    <div className="flex items-center gap-1" title={JOURNEY_STEPS.map((s, i) => `${i <= journey.step ? "✓" : "○"} ${s}`).join("  ")}>
      {JOURNEY_STEPS.map((step, i) => {
        const reached = i <= journey.step;
        let color = "bg-slate-200";
        if (journey.stopped) color = i === 0 ? "bg-rose-400" : "bg-slate-200";
        else if (backWithEmployee) color = i === 0 ? "bg-orange-400" : "bg-slate-200";
        else if (reached) color = journey.step === 4 ? "bg-emerald-500" : "bg-[#0A0082]";
        return <span key={step} className={`h-1.5 w-5 rounded-full ${color}`} />;
      })}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, caption, tone, active, onClick }) {
  const clickable = typeof onClick === "function";
  const Tag = clickable ? "button" : "div";
  return (
    <Tag
      type={clickable ? "button" : undefined}
      onClick={onClick}
      aria-pressed={clickable ? !!active : undefined}
      className={`group relative flex min-w-0 items-start gap-3 overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
        clickable ? "hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40" : ""
      } ${active ? `border-transparent ring-2 ${tone.ring}` : "border-slate-100"}`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.tile}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <span className={`mt-0.5 block truncate text-xl font-bold tabular-nums ${tone.text}`}>{value}</span>
        {caption && <span className="mt-0.5 block truncate text-[11px] text-slate-400">{caption}</span>}
      </span>
    </Tag>
  );
}

const TONES = {
  navy: { tile: "bg-[#0A0082]/10 text-[#0A0082]", text: "text-[#0a174e]", ring: "ring-[#0A0082]/40" },
  slate: { tile: "bg-slate-100 text-slate-600", text: "text-slate-800", ring: "ring-slate-300" },
  blue: { tile: "bg-blue-50 text-blue-600", text: "text-blue-700", ring: "ring-blue-300" },
  orange: { tile: "bg-orange-50 text-orange-600", text: "text-orange-700", ring: "ring-orange-300" },
  indigo: { tile: "bg-indigo-50 text-indigo-600", text: "text-indigo-700", ring: "ring-indigo-300" },
  emerald: { tile: "bg-emerald-50 text-emerald-600", text: "text-emerald-700", ring: "ring-emerald-300" },
};

export default function MyExpensesPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  // Manager is read-only on the backend for report writes (ExpenseReportController
  // allows only ADMIN/GENERAL to create/update/delete/submit) — don't show write actions.
  const canManage = hasRole(["General", "Manager"]);
 
  const [reports, setReports] = useState([]);
  const [isServerPaginated, setIsServerPaginated] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Unfiltered list of the employee's latest reports, for the summary cards, chip counts and
  // "needs attention" panel. The table itself is server-paginated, so it can't provide these.
  const [overview, setOverview] = useState([]);
  const [overviewTotal, setOverviewTotal] = useState(0);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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
      const params = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        sort: "createdAt,desc",
        sortBy: "createdAt",
        sortDirection: "desc",
      };
      const res = await expenseReportService.getAll(params);

      const payload = res.data?.data;

      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        const items = payload.reports || payload.expenseReports || payload.content || payload.data || [];
        const total = payload.total !== undefined ? payload.total : payload.totalElements ?? items.length ?? 0;
        const sortedItems = [...items].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setReports(sortedItems);
        setTotalItems(total);
        setIsServerPaginated(true);
      } else if (Array.isArray(payload)) {
        const sortedItems = [...payload].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setReports(sortedItems);
        setIsServerPaginated(false);
      } else {
        setReports([]);
        setTotalItems(0);
      }
    } catch (err) {
      console.error("Failed to fetch expense reports:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to fetch expense reports.";
      showStatusToast(errMsg, "error");
      setReports([]);
      setTotalItems(0);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter]);

  const fetchOverview = useCallback(async () => {
    try {
      setOverviewLoading(true);
      const res = await expenseReportService.getAll({ page: 1, limit: OVERVIEW_LIMIT, sortBy: "createdAt", sortDirection: "desc" });
      const payload = res.data?.data;
      const items = Array.isArray(payload)
        ? payload
        : payload?.reports || payload?.expenseReports || payload?.content || payload?.data || [];
      const total = Array.isArray(payload) ? payload.length : payload?.total ?? payload?.totalElements ?? items.length;
      setOverview(items);
      setOverviewTotal(total);
    } catch (err) {
      // The table has its own error state; the summary just stays empty.
      console.error("Failed to load expense summary:", err);
      setOverview([]);
      setOverviewTotal(0);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLookups();
    fetchOverview();
  }, [fetchLookups, fetchOverview]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const refreshAll = () => {
    fetchReports();
    fetchOverview();
  };

  const matchesFilters = useCallback(
    (r) => {
      const title = (r.title || "").toLowerCase();
      const number = (r.reportNumber || "").toLowerCase();
      const q = searchTerm.toLowerCase();
      const matchesSearch = !q || title.includes(q) || number.includes(q);
      const matchesStatus = !statusFilter || (r.reportStatus || "").toUpperCase() === statusFilter;
      return matchesSearch && matchesStatus;
    },
    [searchTerm, statusFilter]
  );

  const displayedReports = isServerPaginated
    ? reports
    : (() => {
        const filtered = reports.filter(matchesFilters);
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
      })();

  const totalCount = isServerPaginated ? totalItems : reports.filter(matchesFilters).length;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 0;

  // ---- Summary over all the employee's reports (not just the current page) ----
  const summary = useMemo(() => {
    const currency = overview.find((r) => r.baseCurrencyCode)?.baseCurrencyCode || "INR";
    const countBy = {};
    overview.forEach((r) => {
      const s = statusOf(r);
      countBy[s] = (countBy[s] || 0) + 1;
    });
    const drafts = overview.filter((r) => statusOf(r) === "DRAFT");
    const needsAction = overview.filter((r) => NEEDS_EMPLOYEE_ACTION.includes(statusOf(r)));
    const inReview = overview.filter((r) => IN_REVIEW.includes(statusOf(r)));
    const awaitingPayment = overview.filter((r) => r.paymentRoutingStatus === "APPROVED_FOR_PAYMENT");
    const paid = overview.filter((r) => r.paymentRoutingStatus === "PAYMENT_COMPLETED" || statusOf(r) === "REIMBURSED");
    const sum = (list, pick) => list.reduce((acc, r) => acc + pick(r), 0);
    const claimable = overview.filter((r) => !["DRAFT", "CANCELLED", "REJECTED"].includes(statusOf(r)));

    // Drafts whose submission deadline is overdue or within a week.
    const deadlineSoon = drafts
      .map((r) => ({ report: r, info: getSubmissionDeadlineInfo(r) }))
      .filter(({ info }) => info && info.daysRemaining <= 7);

    return {
      currency,
      countBy,
      drafts,
      needsAction,
      inReview,
      awaitingPayment,
      paid,
      deadlineSoon,
      overdueDrafts: deadlineSoon.filter(({ info }) => info.isOverdue).length,
      claimedTotal: sum(claimable, (r) => Number(r.totalAmount) || 0),
      inReviewTotal: sum(inReview, (r) => Number(r.totalAmount) || 0),
      awaitingPaymentTotal: sum(awaitingPayment, (r) => Number(r.reimbursableAmount) || 0),
      paidTotal: sum(paid, amountPaidOf),
    };
  }, [overview]);

  // Things the employee has to do, most urgent first.
  const attentionItems = useMemo(() => {
    const items = [
      ...summary.needsAction.map((r) => ({ report: r, reason: reportJourney(r).hint, urgent: true })),
      ...summary.deadlineSoon.map(({ report, info }) => ({
        report,
        reason: info.isOverdue
          ? `Submission deadline passed on ${formatDeadlineDate(info.deadline)}`
          : info.daysRemaining === 0
          ? "Submit today - deadline ends today"
          : `Submit within ${info.daysRemaining} day${info.daysRemaining === 1 ? "" : "s"} (by ${formatDeadlineDate(info.deadline)})`,
        urgent: info.isOverdue,
      })),
    ];
    return items;
  }, [summary]);

  const handleSearch = useCallback((value) => {
    setSearchTerm(value || "");
    setCurrentPage(1);
  }, []);

  const applyStatusFilter = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleApplySavedFilter = (filters) => {
    setSearchTerm(filters.search || "");
    setStatusFilter(filters.status || "");
    setCurrentPage(1);
  };

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
    const messages = Object.values(errors).filter(Boolean);
    // Some fields sit below the fold of the drawer, so surface the errors in a toast too —
    // otherwise a failed validation looks like the button did nothing.
    if (messages.length > 0) showStatusToast(messages.join(" "), "error", 6000);
    return messages.length === 0;
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
        refreshAll();
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
      fetchOverview();
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

  const openReport = (r) => navigate(`/expense-management/expenses/reports/${r.reportId}`);

  const renderActions = (r) => (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        title="Open report"
        aria-label={`Open ${r.title || "report"}`}
        onClick={() => openReport(r)}
        className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <Eye size={15} />
      </button>
      {canManage && REPORT_EDITABLE_STATUSES.includes(r.reportStatus) && (
        <button
          type="button"
          title="Edit report details"
          aria-label={`Edit ${r.title || "report"}`}
          onClick={() => handleEditClick(r)}
          className="rounded-md p-1.5 text-blue-600 transition hover:bg-blue-50 hover:text-blue-800"
        >
          <Pencil size={15} />
        </button>
      )}
      {canManage && REPORT_DELETABLE_STATUSES.includes(r.reportStatus) && (
        <button
          type="button"
          title="Delete draft"
          aria-label={`Delete ${r.title || "report"}`}
          onClick={() => handleDeleteClick(r)}
          className="rounded-md p-1.5 text-rose-600 transition hover:bg-rose-50 hover:text-rose-800"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );

  const tripText = (r) => {
    const start = formatShortDate(r.tripStartDate);
    const end = formatShortDate(r.tripEndDate);
    if (start && end) return start === end ? start : `${start} – ${end}`;
    return start || end || null;
  };

  const deadlineNote = (r) => {
    const info = getSubmissionDeadlineInfo(r);
    if (!info) return null;
    if (info.isOverdue) return <span className="text-[11px] font-semibold text-rose-600">Submission deadline passed</span>;
    if (info.daysRemaining <= 7)
      return (
        <span className="text-[11px] font-medium text-amber-700">
          {info.daysRemaining === 0 ? "Submit today" : `Submit within ${info.daysRemaining} day${info.daysRemaining === 1 ? "" : "s"}`}
        </span>
      );
    return <span className="text-[11px] text-slate-400">Submit by {formatDeadlineDate(info.deadline)}</span>;
  };

  const amountCell = (r) => {
    const currency = r.baseCurrencyCode || summary.currency;
    const total = Number(r.totalAmount) || 0;
    const reimbursable = Number(r.reimbursableAmount) || 0;
    const status = statusOf(r);
    let sub = null;
    if (r.paymentRoutingStatus === "PAYMENT_COMPLETED") sub = `Paid ${formatMoney(amountPaidOf(r), currency)}`;
    else if (r.noPaymentDue) sub = "Nothing to pay";
    else if (status !== "DRAFT" && reimbursable > 0 && Math.abs(reimbursable - total) > 0.005) sub = `${formatMoney(reimbursable, currency)} to you`;
    return (
      <div className="text-right">
        <p className="font-mono text-[13px] font-semibold text-slate-900">{formatMoney(total, currency)}</p>
        {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
        {r.currencyCode && r.currencyCode !== currency && <p className="text-[10px] text-slate-400">Spent in {r.currencyCode}</p>}
      </div>
    );
  };

  const filterChips = useMemo(() => {
    const present = STATUS_FILTER_ORDER.filter((s) => summary.countBy[s] || s === statusFilter);
    return [{ value: "", label: "All", count: overviewTotal }, ...present.map((s) => ({ value: s, label: STATUS_LABELS[s], count: summary.countBy[s] || 0 }))];
  }, [summary, statusFilter, overviewTotal]);

  const hasFilters = !!(searchTerm || statusFilter);
  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const showingTo = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);
  const cardValue = (value) => (overviewLoading ? "—" : value);

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbs} />

      {/* Banner: what's going on with my money */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0082] via-[#18208f] to-[#2f3f9e] px-5 py-5 text-white shadow-[0_18px_40px_-24px_rgba(10,0,130,0.7)] sm:px-6">
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/[0.06]" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-48 h-56 w-56 rounded-full bg-[#ff3d72]/[0.12] blur-2xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <Receipt size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">My Expense Reports</h1>
              <p className="mt-0.5 text-sm text-white/70">Create reports, follow each one through approval and Finance, and see when you get paid.</p>
              <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
                {overviewLoading ? (
                  "Checking your reports..."
                ) : attentionItems.length > 0 ? (
                  <>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" aria-hidden="true" />
                    {attentionItems.length} report{attentionItems.length === 1 ? " needs" : "s need"} your attention
                  </>
                ) : summary.awaitingPayment.length > 0 ? (
                  <>
                    <HandCoins size={14} className="text-indigo-200" aria-hidden="true" />
                    {formatMoney(summary.awaitingPaymentTotal, summary.currency)} on its way to you
                  </>
                ) : (
                  <>
                    <BadgeCheck size={14} className="text-emerald-300" aria-hidden="true" />
                    Nothing waiting on you
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={refreshAll}
              title="Reload your reports"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15"
            >
              <RefreshCw size={15} className={loading || overviewLoading ? "animate-spin" : ""} aria-hidden="true" />
              Refresh
            </button>
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/expense-management/expenses/supplementary")}
                  title="Claim an expense you missed on a report that has already been submitted"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15"
                >
                  <Paperclip size={15} aria-hidden="true" />
                  Supplementary claim
                </button>
                <button
                  type="button"
                  onClick={handleCreateClick}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0A0082] shadow-sm transition hover:bg-white/90"
                >
                  <Plus size={16} aria-hidden="true" />
                  New expense report
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Summary: counts are over all your reports, not just the page below */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          icon={FileStack}
          label="All reports"
          value={cardValue(overviewTotal)}
          caption={overviewLoading ? "" : `${formatMoney(summary.claimedTotal, summary.currency)} claimed`}
          tone={TONES.navy}
          active={!statusFilter}
          onClick={() => applyStatusFilter("")}
        />
        <StatCard
          icon={FilePen}
          label="Drafts"
          value={cardValue(summary.drafts.length)}
          caption={summary.overdueDrafts > 0 ? `${summary.overdueDrafts} past the deadline` : "Not submitted yet"}
          tone={TONES.slate}
          active={statusFilter === "DRAFT"}
          onClick={() => applyStatusFilter("DRAFT")}
        />
        <StatCard
          icon={AlertTriangle}
          label="Needs your fix"
          value={cardValue(summary.needsAction.length)}
          caption="Sent back to you"
          tone={summary.needsAction.length > 0 ? TONES.orange : TONES.slate}
        />
        <StatCard
          icon={Hourglass}
          label="Being reviewed"
          value={cardValue(summary.inReview.length)}
          caption={overviewLoading ? "" : `${formatMoney(summary.inReviewTotal, summary.currency)} with approvers / Finance`}
          tone={TONES.blue}
        />
        <StatCard
          icon={Wallet}
          label="Payment on the way"
          value={cardValue(formatMoney(summary.awaitingPaymentTotal, summary.currency))}
          caption={`${summary.awaitingPayment.length} approved, not paid yet`}
          tone={TONES.indigo}
        />
        <StatCard
          icon={BadgeCheck}
          label="Paid to you"
          value={cardValue(formatMoney(summary.paidTotal, summary.currency))}
          caption={`${summary.paid.length} report${summary.paid.length === 1 ? "" : "s"} reimbursed`}
          tone={TONES.emerald}
        />
      </div>
      {overviewTotal > OVERVIEW_LIMIT && (
        <p className="-mt-2 text-[11px] text-slate-400">Summary covers your latest {OVERVIEW_LIMIT} reports.</p>
      )}

      {/* What you need to do */}
      {!overviewLoading && attentionItems.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-600" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-[#0a174e]">Needs your attention</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">{attentionItems.length}</span>
          </div>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {attentionItems.slice(0, 4).map(({ report, reason, urgent }) => (
              <li key={report.reportId}>
                <button
                  type="button"
                  onClick={() => openReport(report)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-amber-200 hover:shadow"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${urgent ? "bg-rose-500" : "bg-amber-400"}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{report.title || "Untitled report"}</span>
                    <span className="block truncate text-xs text-slate-500">{reason}</span>
                  </span>
                  <span className="hidden shrink-0 sm:block"><JourneyBadge report={report} /></span>
                  <ArrowRight size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {attentionItems.length > 4 && (
            <p className="mt-2 text-xs text-amber-800">+{attentionItems.length - 4} more - use the status filter below to see them all.</p>
          )}
        </section>
      )}

      {/* Reports list */}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="space-y-3 border-b border-slate-100 p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="w-full lg:flex-1">
              <SearchInput
                value={searchTerm}
                onSearch={handleSearch}
                placeholder="Search by report title or number..."
                className="!px-3 !py-2 !text-sm"
              />
            </div>
            <div className="w-full lg:w-72">
              <SavedFiltersControl
                scope="my-expenses"
                filters={{ search: searchTerm, status: statusFilter }}
                onApply={handleApplySavedFilter}
              />
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Filter by status">
            {filterChips.map((chip) => {
              const active = statusFilter === chip.value;
              return (
                <button
                  key={chip.value || "all"}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => applyStatusFilter(chip.value)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active ? "border-[#0A0082] bg-[#0A0082] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-[#0a174e]"
                  }`}
                >
                  {chip.label}
                  {!overviewLoading && (
                    <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${active ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{chip.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Loading your expense reports..." />
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-rose-300" />
            <h2 className="text-sm font-semibold text-slate-700">Couldn't load your expense reports</h2>
            <p className="mt-1 max-w-sm text-xs text-slate-400">Something went wrong while fetching them. Please try again.</p>
            <Button variant="outline" size="small" className="mt-4" onClick={fetchReports}>
              Retry
            </Button>
          </div>
        ) : displayedReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Layers size={26} />
            </span>
            <h2 className="text-sm font-semibold text-slate-700">{hasFilters ? "No reports match" : "No expense reports yet"}</h2>
            <p className="mt-1 max-w-sm text-xs text-slate-400">
              {hasFilters
                ? "Try a different search or status."
                : "Create a report for a trip or client visit, add each expense with its receipt, then submit it for approval."}
            </p>
            {hasFilters ? (
              <Button variant="outline" size="small" className="mt-4" onClick={() => { setSearchTerm(""); applyStatusFilter(""); }}>
                Clear filters
              </Button>
            ) : (
              canManage && (
                <Button variant="primary" size="small" className="mt-4" onClick={handleCreateClick}>
                  <Plus size={14} /> New expense report
                </Button>
              )
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Report</th>
                    <th className="px-3 py-2.5">Trip dates</th>
                    <th className="px-3 py-2.5">Expenses</th>
                    <th className="px-3 py-2.5">Where it is</th>
                    <th className="px-3 py-2.5 text-right">Amount</th>
                    <th className="px-3 py-2.5">Dates</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedReports.map((r) => {
                    const journey = reportJourney(r);
                    const trip = tripText(r);
                    return (
                      <tr key={r.reportId} onClick={() => openReport(r)} className="cursor-pointer align-top transition hover:bg-blue-50/40">
                        <td className="px-4 py-3">
                          <p className="max-w-[240px] truncate text-sm font-semibold text-slate-900" title={r.title}>{r.title || "Untitled report"}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[11px] text-slate-500">{r.reportNumber || "Not numbered yet"}</span>
                            {r.cashAdvanceId && (
                              <span className="rounded-full bg-emerald-50 px-1.5 py-px text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">Settles advance</span>
                            )}
                          </div>
                          {r.costCenterName && <p className="mt-0.5 text-[11px] text-slate-400">{r.costCenterName}</p>}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600">
                          {trip ? (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap"><CalendarDays size={13} className="text-slate-400" />{trip}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          <p className="whitespace-nowrap font-medium text-slate-700">
                            {r.lineItemCount ?? 0} expense{(r.lineItemCount ?? 0) === 1 ? "" : "s"}
                          </p>
                          {r.policyWarningCount > 0 && (
                            <p className={`mt-0.5 inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-medium ${r.policyUnjustifiedCount > 0 ? "text-rose-600" : "text-amber-700"}`}>
                              <ShieldAlert size={12} />
                              {r.policyUnjustifiedCount > 0
                                ? `${r.policyUnjustifiedCount} policy issue${r.policyUnjustifiedCount === 1 ? "" : "s"} to explain`
                                : `${r.policyWarningCount} policy note${r.policyWarningCount === 1 ? "" : "s"}`}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col items-start gap-1.5">
                            <JourneyBadge report={r} />
                            <JourneyProgress report={r} />
                            {deadlineNote(r) || (journey.hint && <span className="text-[11px] text-slate-400">{journey.hint}</span>)}
                          </div>
                        </td>
                        <td className="px-3 py-3">{amountCell(r)}</td>
                        <td className="px-3 py-3 text-[11px] text-slate-500">
                          <p className="whitespace-nowrap">Created {formatDate(r.createdAt)}</p>
                          {r.submittedAt && <p className="whitespace-nowrap">Submitted {formatDate(r.submittedAt)}</p>}
                          {r.paymentConfirmation?.paymentDate && (
                            <p className="whitespace-nowrap text-emerald-700">Paid {formatDate(r.paymentConfirmation.paymentDate)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">{renderActions(r)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {displayedReports.map((r) => {
                const trip = tripText(r);
                return (
                  <li key={r.reportId} className="p-4" onClick={() => openReport(r)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{r.title || "Untitled report"}</p>
                        <p className="font-mono text-[11px] text-slate-500">{r.reportNumber || "Not numbered yet"}</p>
                      </div>
                      {amountCell(r)}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <JourneyBadge report={r} />
                      <JourneyProgress report={r} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span>{r.lineItemCount ?? 0} expense{(r.lineItemCount ?? 0) === 1 ? "" : "s"}</span>
                      {trip && <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{trip}</span>}
                      <span className="inline-flex items-center gap-1"><Clock size={12} />{formatDate(r.createdAt)}</span>
                      {deadlineNote(r)}
                    </div>
                    <div className="mt-2">{renderActions(r)}</div>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-col items-center gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:justify-between">
              <p className="text-xs text-slate-500">
                Showing {showingFrom}–{showingTo} of {totalCount} report{totalCount === 1 ? "" : "s"}
              </p>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                />
              )}
            </div>
          </>
        )}
      </section>

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
                  {drawerMode === "create" ? "New expense report" : "Edit report details"}
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {drawerMode === "create"
                    ? "Start a new expense report, then add individual expenses with receipts."
                    : "Change this report's details. Its expenses stay as they are."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
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
                {drawerMode === "create" ? "Create and add expenses" : "Save changes"}
              </Button>
            </div>
          </div>
        </>,
        document.body
      )}

      <ConfirmationModal
        isOpen={isConfirmOpen}
        title="Delete draft report"
        message={`Delete the draft "${reportToDelete?.title}" and all its expenses? This can't be undone.`}
        confirmText="Delete draft"
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
