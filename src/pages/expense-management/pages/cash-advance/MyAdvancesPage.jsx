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
} from "lucide-react";
import { formatMoney, formatDate, formatTripDates, getCostCenterValue, getStatusBadge, hasSubmittedLinkedReport } from "@/pages/expense-management/pages/cash-advance/cashAdvanceDisplay";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import FormSelect from "@/components/forms/FormSelect";
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

      return matchSearch && matchStatus;
    });
  }, [advances, searchTerm, statusFilter, showClosed]);

  // Newest first, so the latest request is on the first page and older ones move to the last pages
  const sortedAdvances = useMemo(() => {
    const createdTime = (adv) => {
      const time = new Date(adv.createdAt || adv.createdDate || adv.created_at).getTime();
      return Number.isNaN(time) ? 0 : time;
    };
    return [...filteredAdvances].sort((a, b) => createdTime(b) - createdTime(a));
  }, [filteredAdvances]);

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
  }, [searchTerm, statusFilter]);

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
        <div className="flex flex-col gap-3 border-b border-gray-100 p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <SearchInput
              value={searchTerm}
              onSearch={(val) => setSearchTerm(val || "")}
              placeholder="Search by title, purpose, or advance ID..."
              className="!pl-9"
            />
          </div>
          <div className="w-full sm:w-56">
            <FormSelect
              name="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
              buttonClassName="!h-10"
            />
          </div>
          {statusFilter === "ALL" && (
            <label className="flex h-10 cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 px-3 text-sm text-gray-600 transition hover:bg-gray-50">
              <input
                type="checkbox"
                checked={showClosed}
                onChange={(e) => setShowClosed(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-[#0a0082]"
              />
              Show closed
            </label>
          )}
        </div>
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
              {searchTerm || statusFilter !== "ALL"
                ? "Try adjusting your search or status filter."
                : "You haven't requested any cash advances yet."}
            </p>
            {!searchTerm && statusFilter === "ALL" && (
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
                  <th className="py-3 px-4">S.No</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Cost Center</th>
                  <th className="py-3 px-4">Currency</th>
                  <th className="py-3 px-4">Needed By</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4">Trip Dates</th>
                  <th className="py-3 px-4 text-right" title="Approved amount, or the requested amount until it is approved">Amount</th>
                  <th className="py-3 px-4 text-right" title="Expenses you added against this advance">Consumed</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="sticky right-0 bg-[#F4F6FC] py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedAdvances.map((adv, idx) => {
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

                  return (
                    <tr key={advId} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-4 font-medium text-gray-600">
                        {(safeCurrentPage - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-semibold text-gray-900 truncate" title={adv.title || undefined}>{adv.title || "Cash Advance"}</p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                        {formatTripDates(adv)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                        <p className="font-semibold text-gray-900">{formatMoney(shownAmount, cur)}</p>
                        <p className="mt-0.5 text-[10px] text-gray-400">
                          {f.paidOut && !loading ? `${formatMoney(f.disbursed, cur)} disbursed` : amountLabel}
                        </p>
                        {cf && cf.carry > 0 && (
                          <p className="mt-0.5 text-[10px] text-violet-700">
                            {formatMoney(cf.newCash, cur)} new + {formatMoney(cf.carry, cur)} carry forward
                            {cf.moved ? "" : " (on approval)"}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                        <p className="font-semibold text-sky-700">{paidCell(f.consumed)}</p>
                        {f.paidOut && !loading && (
                          <p className={`mt-0.5 text-[10px] ${isOverdue(adv) ? "text-rose-600" : f.outstanding > 0 ? "text-amber-600" : "text-gray-400"}`}>
                            {f.outstanding > 0 ? `${formatMoney(f.outstanding, cur)} outstanding` : "Nothing outstanding"}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isOverdue(adv) ? getStatusBadge("OVERDUE") : getStatusBadge(adv.status)}
                        {isOverdue(adv) && (
                          <p className="text-[10px] text-rose-600 mt-1 font-medium">{getAgingDays(adv)} day(s) overdue</p>
                        )}
                      </td>
                      <td className="sticky right-0 bg-white py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Detail Action */}
                          {canSubmitLinkedExpenses(adv) && (
                            <button
                              onClick={() => navigate(`/expense-management/expenses/create?cashAdvanceId=${adv.advanceId || adv.id}`)}
                              disabled={hasSubmittedLinkedReport(adv)}
                              title={hasSubmittedLinkedReport(adv) ? "An expense report is already submitted for this advance" : "Submit linked expenses"}
                              className={`p-1.5 rounded transition ${hasSubmittedLinkedReport(adv) ? "text-gray-300 cursor-not-allowed" : "text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"}`}
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
