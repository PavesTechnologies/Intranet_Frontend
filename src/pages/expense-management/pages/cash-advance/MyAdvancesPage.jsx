import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Send,
  Receipt,
  XCircle,
  Clock,
  CheckCircle2,
  DollarSign,
  Calendar,
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  RotateCcw,
  Check,
  X,
} from "lucide-react";
import { formatMoney, formatDate, formatTripDates, getCostCenterValue, getStatusBadge, activeLinkedReport, linkedExpensesPath } from "@/pages/expense-management/pages/cash-advance/cashAdvanceDisplay";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import FormInput from "@/components/forms/FormInput";
import FormTextArea from "@/components/forms/FormTextArea";
import LoadingSpinner from "@/components/LoadingSpinner";
import Pagination from "@/components/Pagination/pagination";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { useAdvanceFigures } from "@/pages/expense-management/pages/cash-advance/useAdvanceFigures";
import { carryForwardRequest } from "@/pages/expense-management/pages/cash-advance/carryForwardRequest";
import { expenseReportService } from "@/pages/expense-management/api/expenseReportsApi";

// Statuses in which an expense report can be linked to the advance (same list as the detail page).
const LINKABLE_EXPENSE_STATUSES = [
  "DISBURSED",
  "IN_PROGRESS",
  "EXPENSE_SUBMITTED",
  "EXPENSE_VERIFIED",
  "SETTLEMENT_PENDING",
  "PARTIALLY_ADJUSTED",
  "PARTIALLY_SETTLED",
];

const PAGE_SIZE = 10;

const canSubmitLinkedExpenses = (adv) =>
  LINKABLE_EXPENSE_STATUSES.includes((adv.status || "").toUpperCase()) &&
  Number(adv.outstandingBalance ?? 0) > 0;

const getNeededByDateValue = (adv) => {
  if (!adv) return null;
  return (
    adv.neededByDate ||
    adv.neededBy ||
    adv.needed_by_date ||
    adv.needed_by ||
    adv.requiredDate ||
    adv.targetDate ||
    adv.expectedDate ||
    adv.settlementDueDate ||
    adv.createdDate ||
    adv.createdAt ||
    adv.created_at
  );
};

const getSettlementDueDate = (adv) =>
  adv?.settlementDueDate || adv?.settlement_due_date || null;

const isOverdue = (adv) => {
  const status = String(adv?.status || "").toUpperCase();
  if (["SETTLED", "CLOSED", "CANCELLED", "REJECTED"].includes(status)) return false;
  const balance = Number(adv?.outstandingBalance ?? adv?.outstanding_balance ?? 0) || 0;
  const dueValue = getSettlementDueDate(adv);
  if (balance <= 0 || !dueValue) return false;
  const due = new Date(String(dueValue).slice(0, 10) + "T00:00:00");
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
};

const getAgingDays = (adv) => {
  if (!isOverdue(adv)) return 0;
  const due = new Date(String(getSettlementDueDate(adv)).slice(0, 10) + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today - due) / 86400000));
};

// Any date shape the API sends (ISO string, "yyyy-mm-dd", or [y, m, d]) as a day timestamp; null when absent/invalid.
const toDayTime = (value) => {
  if (!value) return null;
  let d;
  if (Array.isArray(value)) {
    const [y, m, day] = value;
    if (!y || !m) return null;
    d = new Date(y, m - 1, day || 1);
  } else {
    d = new Date(String(value).slice(0, 10) + "T00:00:00");
  }
  return Number.isNaN(d.getTime()) ? null : d.getTime();
};

const tripStartTime = (adv) => toDayTime(adv?.expectedTripStartDate) ?? toDayTime(adv?.expectedTripEndDate);
const tripEndTime = (adv) => toDayTime(adv?.expectedTripEndDate) ?? toDayTime(adv?.expectedTripStartDate);
const createdTime = (adv) => {
  const time = new Date(adv.createdAt || adv.createdDate || adv.created_at).getTime();
  return Number.isNaN(time) ? 0 : time;
};

// Sort options. Advances without a trip date always go to the end for the trip-date sorts.
const SORTERS = {
  CREATED_DESC: (a, b) => createdTime(b) - createdTime(a),
  CREATED_ASC: (a, b) => createdTime(a) - createdTime(b),
  TRIP_ASC: (a, b) => (tripStartTime(a) ?? Infinity) - (tripStartTime(b) ?? Infinity),
  TRIP_DESC: (a, b) => (tripStartTime(b) ?? -Infinity) - (tripStartTime(a) ?? -Infinity),
  AMOUNT_DESC: (a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0),
  AMOUNT_ASC: (a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0),
  OUTSTANDING_DESC: (a, b) => (Number(b.outstandingBalance) || 0) - (Number(a.outstandingBalance) || 0),
};

const SORT_OPTIONS = [
  { label: "Newest first", value: "CREATED_DESC" },
  { label: "Oldest first", value: "CREATED_ASC" },
  { label: "Trip date: soonest", value: "TRIP_ASC" },
  { label: "Trip date: latest", value: "TRIP_DESC" },
  { label: "Amount: high to low", value: "AMOUNT_DESC" },
  { label: "Amount: low to high", value: "AMOUNT_ASC" },
  { label: "Outstanding: high to low", value: "OUTSTANDING_DESC" },
];

const EMPTY_FILTERS = { tripFrom: "", tripTo: "", currency: "ALL", costCenter: "ALL", overdueOnly: false };

const FILTER_LABEL = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500";

// Native select styled to match SearchInput (h-10, same border/shadow), so every toolbar control lines up.
const SelectControl = ({ value, onChange, options, icon: Icon, ariaLabel, className = "" }) => (
  <div className={`relative w-full ${className}`}>
    {Icon && <Icon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-10 w-full cursor-pointer appearance-none truncate rounded-lg border border-gray-300 bg-white ${Icon ? "pl-9" : "pl-3"} pr-9 text-sm text-gray-700 shadow-sm outline-none transition hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
  </div>
);

const ToggleChip = ({ active, onClick, disabled, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-pressed={active}
    className={`flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
      active
        ? "border-[#0a0082]/30 bg-[#0a0082] text-white"
        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
    }`}
  >
    {active && <Check size={14} />}
    {children}
  </button>
);

// Only paid-out advances are owed. Drafts and requests awaiting approval are not, and the server does not count them.
const OWED_STATUSES = ["DISBURSED", "IN_PROGRESS", "EXPENSE_SUBMITTED", "EXPENSE_VERIFIED", "SETTLEMENT_PENDING",
  "PARTIALLY_SETTLED", "PARTIALLY_ADJUSTED", "ADJUSTED", "AWAITING_REIMBURSEMENT", "OVERDUE"];

export default function MyAdvancesPage() {
  const navigate = useNavigate();

  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  // Closed and cancelled records are hidden under "All Statuses" unless this is ticked.
  const [showClosed, setShowClosed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  // Which row's detail panel is open (one at a time).
  const [expandedId, setExpandedId] = useState(null);
  const [sortBy, setSortBy] = useState("CREATED_DESC");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const activeFilterCount =
    (filters.tripFrom || filters.tripTo ? 1 : 0) +
    (filters.currency !== "ALL" ? 1 : 0) +
    (filters.costCenter !== "ALL" ? 1 : 0) +
    (filters.overdueOnly ? 1 : 0) +
    (showClosed ? 1 : 0);
  const clearAllFilters = () => {
    setFilters(EMPTY_FILTERS);
    setShowClosed(false);
  };
  // Removable chips shown under the toolbar while the filter panel is closed.
  const activeChips = [
    (filters.tripFrom || filters.tripTo) && {
      key: "trip",
      label: filters.tripFrom && filters.tripTo
        ? `Trip: ${formatDate(filters.tripFrom)} – ${formatDate(filters.tripTo)}`
        : filters.tripFrom ? `Trip from ${formatDate(filters.tripFrom)}` : `Trip until ${formatDate(filters.tripTo)}`,
      onRemove: () => setFilters((p) => ({ ...p, tripFrom: "", tripTo: "" })),
    },
    filters.currency !== "ALL" && { key: "cur", label: filters.currency, onRemove: () => setFilter("currency", "ALL") },
    filters.costCenter !== "ALL" && { key: "cc", label: filters.costCenter, onRemove: () => setFilter("costCenter", "ALL") },
    filters.overdueOnly && { key: "od", label: "Overdue only", onRemove: () => setFilter("overdueOnly", false) },
    showClosed && { key: "closed", label: "Including closed", onRemove: () => setShowClosed(false) },
  ].filter(Boolean);

  // Modals state
  const [editingAdvance, setEditingAdvance] = useState(null); // Edit modal
  const [confirmModal, setConfirmModal] = useState({ open: false, title: "", message: "", action: null });
  const [submittingAction, setSubmittingAction] = useState(false);

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Cash Advance", to: "/expense-management/cash-advance/my" },
    { label: "My Advances" },
  ];

  const fetchMyAdvances = async () => {
    setLoading(true);
    try {
      // Fetch my advances and expense reports concurrently
      let res, reportsRes;
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
            return [
              "APPROVED",
              "EXPENSE_VERIFIED",
              "EXPENSE VERIFIED",
              "VERIFIED",
              "SETTLED",
              "CLOSED",
            ].includes(statusUpper);
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
        const authoritativeOutstanding =
          adv.outstandingBalance ?? adv.outstanding_balance ?? adv.balance;
        const owedNow = OWED_STATUSES.includes((adv.status || "").toUpperCase());
        const outstandingBalance = !owedNow
          ? 0
          : authoritativeOutstanding != null
            ? Math.max(0, Number(authoritativeOutstanding) || 0)
            : Math.max(0, advAmt - verifiedExpenseAmount);

        return {
          ...adv,
          verifiedExpenseAmount,
          outstandingBalance,
          linkedExpenseReport: linkedReports[0] || adv.linkedExpenseReport || null,
          linkedExpenseReports: linkedReports,
        };
      });

      setAdvances(enrichedAdvances);
    } catch (err) {
      console.error("Failed to fetch cash advances:", err);
      showStatusToast("Failed to load cash advances", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAdvances();
  }, []);

  // Filtered Advances
  const filteredAdvances = useMemo(() => {
    return advances.filter((adv) => {
      const matchSearch =
        !searchTerm ||
        (adv.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (adv.purpose || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (adv.advanceId || adv.id || "").toString().toLowerCase().includes(searchTerm.toLowerCase());

      const advStatus = (adv.status || "").toUpperCase();
      const matchStatus =
        (statusFilter === "ALL" && (showClosed || !["CLOSED", "CANCELLED"].includes(advStatus))) ||
        (statusFilter === "PENDING" && (advStatus === "SUBMITTED" || advStatus === "PENDING" || advStatus === "PENDING_APPROVAL")) ||
        advStatus === statusFilter;

      // Trip date range: keep advances whose trip overlaps the chosen range. Advances without trip dates drop out.
      let matchTrip = true;
      if (filters.tripFrom || filters.tripTo) {
        const start = tripStartTime(adv);
        const end = tripEndTime(adv);
        const from = toDayTime(filters.tripFrom);
        const to = toDayTime(filters.tripTo);
        matchTrip = start != null && (to == null || start <= to) && (from == null || end >= from);
      }

      const matchCurrency = filters.currency === "ALL" || (adv.currencyCode || "INR") === filters.currency;
      const matchCostCenter = filters.costCenter === "ALL" || getCostCenterValue(adv) === filters.costCenter;
      const matchOverdue = !filters.overdueOnly || isOverdue(adv);

      return matchSearch && matchStatus && matchTrip && matchCurrency && matchCostCenter && matchOverdue;
    });
  }, [advances, searchTerm, statusFilter, showClosed, filters]);

  // Options for the currency / cost center filters, from the advances the user actually has.
  const currencyOptions = useMemo(() => {
    const codes = [...new Set(advances.map((a) => a.currencyCode || "INR"))].sort();
    return [{ label: "All currencies", value: "ALL" }, ...codes.map((c) => ({ label: c, value: c }))];
  }, [advances]);
  const costCenterOptions = useMemo(() => {
    const names = [...new Set(advances.map(getCostCenterValue).filter((v) => v && v !== "—"))].sort();
    return [{ label: "All cost centers", value: "ALL" }, ...names.map((n) => ({ label: n, value: n }))];
  }, [advances]);

  const sortedAdvances = useMemo(
    () => [...filteredAdvances].sort(SORTERS[sortBy] || SORTERS.CREATED_DESC),
    [filteredAdvances, sortBy]
  );

  const totalPages = Math.max(1, Math.ceil(sortedAdvances.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedAdvances = useMemo(
    () => sortedAdvances.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE),
    [sortedAdvances, safeCurrentPage]
  );
  // Money figures for the rows on this page, from the server (expenses added, salary deducted). See settlementFigures.js.
  const { figuresOf, isLoaded } = useAdvanceFigures(pagedAdvances);

  // Go back to page 1 whenever the search or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, filters, sortBy, showClosed]);

  // Statistics
  const stats = useMemo(() => {
    const totalCount = advances.length;
    const pendingCount = advances.filter((a) =>
      ["SUBMITTED", "PENDING", "PENDING_APPROVAL"].includes((a.status || "").toUpperCase())
    ).length;

    const totalDisbursed = advances
      .filter((a) => ["DISBURSED", "SETTLED"].includes((a.status || "").toUpperCase()))
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    const totalSettled = advances
      .filter((a) => ["SETTLED", "CLOSED"].includes((a.status || "").toUpperCase()))
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    const outstandingBalance = advances
      .filter((a) => OWED_STATUSES.includes((a.status || "").toUpperCase()))
      .reduce((sum, a) => sum + (Number(a.outstandingBalance) || 0), 0);

    const overdueCount = advances.filter(isOverdue).length;

    return { totalCount, pendingCount, totalDisbursed, totalSettled, outstandingBalance, overdueCount };
  }, [advances]);

  // Handle Actions
  const handleSubmit = (advance) => {
    const advanceId = advance.advanceId || advance.id;
    setConfirmModal({
      open: true,
      title: "Submit Cash Advance",
      message: `Are you sure you want to submit request "${advance.title || advanceId}" for approval?`,
      action: async () => {
        setSubmittingAction(true);
        try {
          await cashAdvanceApi.submit(advanceId);
          showStatusToast("Cash advance submitted for approval!", "success");
          fetchMyAdvances();
        } catch (err) {
          showStatusToast(err.response?.data?.message || "Failed to submit cash advance", "error");
        } finally {
          setSubmittingAction(false);
          setConfirmModal({ open: false, title: "", message: "", action: null });
        }
      },
    });
  };

  const handleDelete = (advance) => {
    const advanceId = advance.advanceId || advance.id;
    setConfirmModal({
      open: true,
      title: "Delete Cash Advance Draft",
      message: `Are you sure you want to delete draft "${advance.title || advanceId}"? This action cannot be undone.`,
      action: async () => {
        setSubmittingAction(true);
        try {
          await cashAdvanceApi.delete(advanceId);
          showStatusToast("Cash advance draft deleted successfully.", "success");
          fetchMyAdvances();
        } catch (err) {
          showStatusToast(err.response?.data?.message || "Failed to delete cash advance", "error");
        } finally {
          setSubmittingAction(false);
          setConfirmModal({ open: false, title: "", message: "", action: null });
        }
      },
    });
  };

  const handleCancel = (advance) => {
    const advanceId = advance.advanceId || advance.id;
    setConfirmModal({
      open: true,
      title: "Cancel Cash Advance Request",
      message: `Are you sure you want to cancel cash advance request "${advance.title || advanceId}"?`,
      action: async () => {
        setSubmittingAction(true);
        try {
          await cashAdvanceApi.cancel(advanceId);
          showStatusToast("Cash advance request cancelled.", "success");
          fetchMyAdvances();
        } catch (err) {
          showStatusToast(err.response?.data?.message || "Failed to cancel cash advance", "error");
        } finally {
          setSubmittingAction(false);
          setConfirmModal({ open: false, title: "", message: "", action: null });
        }
      },
    });
  };

  const handleUpdateEdit = async (e) => {
    e.preventDefault();
    if (!editingAdvance) return;
    const advanceId = editingAdvance.advanceId || editingAdvance.id;
    setSubmittingAction(true);
    try {
      await cashAdvanceApi.update(advanceId, editingAdvance);
      showStatusToast("Cash advance updated successfully!", "success");
      setEditingAdvance(null);
      fetchMyAdvances();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to update cash advance", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  const statusOptions = [
    { label: "All Statuses", value: "ALL" },
    { label: "Draft", value: "DRAFT" },
    { label: "Pending Approval", value: "PENDING" },
    { label: "Approved", value: "APPROVED" },
    { label: "In Progress", value: "IN_PROGRESS" },
    { label: "Reconciliation Pending", value: "RECONCILIATION_PENDING" },
    { label: "Submitted for Review", value: "SUBMITTED_FOR_REVIEW" },
    { label: "Under Review", value: "UNDER_REVIEW" },
    { label: "Settlement Pending", value: "SETTLEMENT_PENDING" },
    { label: "Closed", value: "CLOSED" },
    { label: "Rejected", value: "REJECTED" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbs} />

      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0a174e]">My Advances</h1>
          <p className="mt-1 text-sm text-gray-500">Track your cash advance requests and manage drafts.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMyAdvances}
            title="Refresh list"
            aria-label="Refresh list"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-[#0a0082]/30 hover:text-[#0a0082]"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>

          <Button
            variant="primary"
            onClick={() => navigate("/expense-management/cash-advance/request")}
            className="h-10 text-sm"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Request Advance
          </Button>
        </div>
      </div>

      {/* Summary strip: all five figures in one row */}
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:grid-cols-3 lg:grid-cols-5 [&>*]:border-gray-100 lg:divide-x lg:divide-gray-100">
        {[
          { label: "Total Requests", value: stats.totalCount, icon: FileText, tone: "text-[#263383] bg-[#263383]/10", valueTone: "text-gray-900" },
          { label: "Pending Approval", value: stats.pendingCount, icon: Clock, tone: "text-amber-600 bg-amber-50", valueTone: "text-amber-600" },
          { label: "Disbursed", value: formatMoney(stats.totalDisbursed), icon: DollarSign, tone: "text-indigo-600 bg-indigo-50", valueTone: "text-indigo-700" },
          { label: "Settled", value: formatMoney(stats.totalSettled), icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50", valueTone: "text-emerald-700" },
          {
            label: "Outstanding",
            value: formatMoney(stats.outstandingBalance),
            icon: AlertCircle,
            tone: stats.overdueCount > 0 ? "text-rose-600 bg-rose-50" : "text-orange-600 bg-orange-50",
            valueTone: stats.overdueCount > 0 ? "text-rose-600" : "text-orange-600",
            note: stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : null,
          },
        ].map(({ label, value, icon: Icon, tone, valueTone, note }) => (
          <div key={label} className="flex items-center gap-3 border-b p-4 lg:border-b-0">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
              <p className={`mt-0.5 truncate text-lg font-bold ${valueTone}`}>{value}</p>
              {note && <p className="text-[11px] font-medium text-rose-600">{note}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Table card with the filter toolbar on top */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-gray-100 p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <SearchInput
              value={searchTerm}
              onSearch={(val) => setSearchTerm(val || "")}
              placeholder="Search by title, purpose, or advance ID..."
              className="!pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <SelectControl
              ariaLabel="Filter by status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              className="sm:w-48"
            />
            <SelectControl
              ariaLabel="Sort advances"
              icon={ArrowUpDown}
              value={sortBy}
              onChange={setSortBy}
              options={SORT_OPTIONS}
              className="sm:w-52"
            />
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              className={`col-span-2 flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 text-sm font-medium shadow-sm transition ${
                showFilters || activeFilterCount > 0
                  ? "border-[#0a0082]/30 bg-[#0a0082]/5 text-[#0a0082]"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              <SlidersHorizontal size={15} />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0a0082] px-1.5 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown size={14} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="border-b border-gray-100 bg-[#F8F9FE] px-3 py-3">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
              <div className="w-full sm:w-auto">
                <span className={FILTER_LABEL}>Trip dates</span>
                <div className="flex h-10 items-center rounded-lg border border-gray-300 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
                  <Calendar size={15} className="ml-3 shrink-0 text-gray-400" />
                  <input
                    type="date"
                    aria-label="Trip from"
                    value={filters.tripFrom}
                    max={filters.tripTo || undefined}
                    onChange={(e) => setFilter("tripFrom", e.target.value)}
                    className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm text-gray-700 outline-none"
                  />
                  <span className="text-xs text-gray-400">to</span>
                  <input
                    type="date"
                    aria-label="Trip to"
                    value={filters.tripTo}
                    min={filters.tripFrom || undefined}
                    onChange={(e) => setFilter("tripTo", e.target.value)}
                    className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm text-gray-700 outline-none"
                  />
                </div>
              </div>
              <div className="w-[calc(50%-0.5rem)] sm:w-40">
                <span className={FILTER_LABEL}>Currency</span>
                <SelectControl
                  ariaLabel="Filter by currency"
                  value={filters.currency}
                  onChange={(v) => setFilter("currency", v)}
                  options={currencyOptions}
                />
              </div>
              <div className="w-[calc(50%-0.5rem)] sm:w-52">
                <span className={FILTER_LABEL}>Cost center</span>
                <SelectControl
                  ariaLabel="Filter by cost center"
                  value={filters.costCenter}
                  onChange={(v) => setFilter("costCenter", v)}
                  options={costCenterOptions}
                />
              </div>
              <div>
                <span className={FILTER_LABEL}>Show</span>
                <div className="flex h-10 items-center gap-2">
                  <ToggleChip active={filters.overdueOnly} onClick={() => setFilter("overdueOnly", !filters.overdueOnly)}>
                    Overdue only
                  </ToggleChip>
                  <ToggleChip
                    active={showClosed}
                    onClick={() => setShowClosed((v) => !v)}
                    disabled={statusFilter !== "ALL"}
                    title={statusFilter !== "ALL" ? "Applies when status is \"All Statuses\"" : undefined}
                  >
                    Include closed
                  </ToggleChip>
                </div>
              </div>
              <button
                type="button"
                onClick={clearAllFilters}
                disabled={activeFilterCount === 0}
                className="ml-auto flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-[#0a0082] transition hover:bg-[#0a0082]/5 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
              >
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          </div>
        )}

        {!showFilters && activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-3 py-2">
            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 rounded-full border border-[#0a0082]/20 bg-[#0a0082]/5 py-1 pl-3 pr-1.5 text-xs font-medium text-[#0a0082]"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={`Remove ${chip.label}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-[#0a0082]/10"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <button type="button" onClick={clearAllFilters} className="text-xs font-medium text-gray-500 hover:text-[#0a0082]">
              Clear all
            </button>
          </div>
        )}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-500">
            <LoadingSpinner size="lg" className="mb-2" />
            <p className="text-xs">Loading your cash advances...</p>
          </div>
        ) : filteredAdvances.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <DollarSign className="mx-auto h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-700">No cash advances found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchTerm || statusFilter !== "ALL" || activeFilterCount > 0
                ? "Try adjusting your search or status filter."
                : "You haven't requested any cash advances yet."}
            </p>
            {!searchTerm && statusFilter === "ALL" && activeFilterCount === 0 && (
              <Button
                variant="primary"
                onClick={() => navigate("/expense-management/cash-advance/request")}
                className="mt-4 text-xs bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Request Cash Advance Now
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-[#F4F6FC] text-[11px] font-semibold text-[#263383]/70 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="w-10 py-3 pl-4 pr-0" aria-label="Expand" />
                  <th className="py-3 px-4">Advance</th>
                  <th className="py-3 px-4 text-right" title="Approved amount, or the requested amount until it is approved">Amount</th>
                  <th className="py-3 px-4 text-right" title="Amount still to be accounted for">Outstanding</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedAdvances.map((adv) => {
                  const advId = adv.advanceId || adv.id || "N/A";
                  const statusUpper = (adv.status || "").toUpperCase();
                  const isDraft = statusUpper === "DRAFT";
                  const isSubmitted = ["SUBMITTED", "PENDING", "PENDING_APPROVAL"].includes(statusUpper);
                  const f = figuresOf(adv);
                  const cur = adv.currencyCode || "INR";
                  const loading = !isLoaded(adv);
                  // Figures that exist only once cash is paid out show "—" before that, and "…" while loading.
                  const paidCell = (value) =>
                    loading ? <span className="text-gray-300">…</span> : !f.paidOut ? <span className="text-gray-300">—</span> : formatMoney(value, cur);

                  const amountLabel = f.approvedKnown ? "Approved" : "Requested";
                  // A Carry Forward request covers new cash + the carried-forward balance. Show the total, and how it is made.
                  const cf = carryForwardRequest(adv);
                  const shownAmount = cf && !f.approvedKnown ? cf.total : f.approvedKnown ? f.approved : f.requested;

                  const isExpanded = expandedId === advId;
                  const overdue = isOverdue(adv);
                  const toggle = () => setExpandedId(isExpanded ? null : advId);

                  return (
                    <React.Fragment key={advId}>
                    <tr
                      onClick={toggle}
                      className={`cursor-pointer transition ${isExpanded ? "bg-[#F8F9FE]" : "hover:bg-gray-50/80"}`}
                    >
                      <td className="py-3 pl-4 pr-0 align-middle">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggle(); }}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? "Hide details" : "Show details"}
                          className="flex h-6 w-6 items-center justify-center rounded text-gray-400 transition hover:bg-gray-100 hover:text-[#0a0082]"
                        >
                          <ChevronRight size={16} className={`transition-transform ${isExpanded ? "rotate-90 text-[#0a0082]" : ""}`} />
                        </button>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-semibold text-gray-900 truncate text-[13px]" title={adv.title || undefined}>{adv.title || "Cash Advance"}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400 whitespace-nowrap">
                          <Calendar size={11} /> {formatTripDates(adv)}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                        <p className="font-semibold text-gray-900 text-[13px]">{formatMoney(shownAmount, cur)}</p>
                        <p className="mt-0.5 text-[11px] text-gray-400">{amountLabel}</p>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                        {loading ? (
                          <span className="text-gray-300">…</span>
                        ) : !f.paidOut ? (
                          <span className="text-gray-300">—</span>
                        ) : (
                          <p className={`font-semibold text-[13px] ${overdue ? "text-rose-600" : f.outstanding > 0 ? "text-amber-600" : "text-gray-400"}`}>
                            {formatMoney(f.outstanding, cur)}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {overdue ? getStatusBadge("OVERDUE") : getStatusBadge(adv.status)}
                        {overdue && (
                          <p className="text-[10px] text-rose-600 mt-1 font-medium">{getAgingDays(adv)} day(s) overdue</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Detail Action */}
                          {canSubmitLinkedExpenses(adv) && (
                            <button
                              onClick={() => navigate(linkedExpensesPath(adv, f.reports))}
                              title={activeLinkedReport(adv, f.reports) ? "Add expenses to the linked expense report" : "Submit linked expenses"}
                              className="p-1.5 rounded transition text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                            >
                              <Receipt size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/expense-management/cash-advance/${adv.advanceId || adv.id}`)}
                            title="View details"
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Submit linked expenses (same action as the detail page's Stage 4 button) */}

                          {/* Draft Actions */}
                          {isDraft && (
                            <>
                              <button
                                onClick={() => handleSubmit(adv)}
                                title="Submit for approval"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition"
                              >
                                <Send size={15} />
                              </button>

                              <button
                                onClick={() => setEditingAdvance(adv)}
                                title="Edit draft"
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition"
                              >
                                <Edit2 size={15} />
                              </button>

                              <button
                                onClick={() => handleDelete(adv)}
                                title="Delete draft"
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}

                          {/* Cancel Action */}
                          {(isDraft || isSubmitted) && (
                            <button
                              onClick={() => handleCancel(adv)}
                              title="Cancel request"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            >
                              <XCircle size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-[#F8F9FE]">
                        <td />
                        <td colSpan={5} className="px-4 pb-4 pt-0">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-4">
                            {[
                              { label: "Advance ID", value: advId },
                              { label: "Cost Center", value: getCostCenterValue(adv) },
                              { label: "Currency", value: cur },
                              { label: "Needed By", value: formatDate(getNeededByDateValue(adv)) },
                              { label: "Trip Dates", value: formatTripDates(adv) },
                              { label: "Settlement Due", value: formatDate(getSettlementDueDate(adv)), tone: overdue ? "text-rose-600" : "" },
                              { label: "Requested", value: formatMoney(f.requested, cur) },
                              { label: "Approved", value: f.approvedKnown ? formatMoney(f.approved, cur) : "—" },
                              { label: "Disbursed", value: paidCell(f.disbursed) },
                              { label: "Consumed", value: paidCell(f.consumed), tone: "text-sky-700" },
                              {
                                label: "Outstanding",
                                value: paidCell(f.outstanding),
                                tone: overdue ? "text-rose-600" : f.outstanding > 0 ? "text-amber-600" : "",
                              },
                              cf && cf.carry > 0 && {
                                label: "Carry Forward",
                                value: `${formatMoney(cf.newCash, cur)} new + ${formatMoney(cf.carry, cur)} carried${cf.moved ? "" : " (on approval)"}`,
                                tone: "text-violet-700",
                              },
                            ]
                              .filter(Boolean)
                              .map(({ label, value, tone }) => (
                                <div key={label} className="min-w-0">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
                                  <p className={`mt-0.5 text-xs font-medium text-gray-800 break-words tabular-nums ${tone || ""}`}>{value}</p>
                                </div>
                              ))}
                            {adv.purpose && (
                              <div className="col-span-full border-t border-gray-100 pt-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Purpose</p>
                                <p className="mt-0.5 text-xs text-gray-700 whitespace-pre-line">{adv.purpose}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              onPrevious={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
              onNext={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
              className="border-t border-gray-100"
            />
          </div>
        )}
      </div>

      {/* Edit Draft Modal */}
      {editingAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 text-sm">Edit Cash Advance Draft</h3>
              <button
                onClick={() => setEditingAdvance(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateEdit} className="p-5 space-y-4">
              <FormInput
                label="Title"
                name="title"
                value={editingAdvance.title || ""}
                onChange={(e) => setEditingAdvance({ ...editingAdvance, title: e.target.value })}
                required
              />

              <FormInput
                label="Amount"
                name="amount"
                type="number"
                step="0.01"
                value={editingAdvance.amount || ""}
                onChange={(e) => setEditingAdvance({ ...editingAdvance, amount: e.target.value })}
                required
              />

              <FormTextArea
                label="Purpose"
                name="purpose"
                value={editingAdvance.purpose || ""}
                onChange={(e) => setEditingAdvance({ ...editingAdvance, purpose: e.target.value })}
                rows={3}
                required
              />

              <FormInput
                label="Needed By Date"
                name="neededByDate"
                type="date"
                value={editingAdvance.neededByDate ? editingAdvance.neededByDate.split("T")[0] : ""}
                onChange={(e) => setEditingAdvance({ ...editingAdvance, neededByDate: e.target.value })}
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingAdvance(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingAction}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submittingAction ? <LoadingSpinner size="sm" className="mr-1.5" /> : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, title: "", message: "", action: null })}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        isLoading={submittingAction}
      />
    </div>
  );
}
