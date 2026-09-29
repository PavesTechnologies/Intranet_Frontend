import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Send,
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
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import FormSelect from "@/components/forms/FormSelect";
import FormInput from "@/components/forms/FormInput";
import FormTextArea from "@/components/forms/FormTextArea";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { expenseReportService } from "@/pages/expense-management/api/expenseReportsApi";
import CashAdvanceWorkflowStepper from "@/pages/expense-management/pages/cash-advance/components/CashAdvanceWorkflowStepper";
import CashAdvanceAdjustmentCard from "@/pages/expense-management/pages/cash-advance/components/CashAdvanceAdjustmentCard";

const formatMoney = (amount, currencyCode = "INR") => {
  const num = Number(amount) || 0;
  return `${currencyCode} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

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

const formatDate = (dateValue) => {
  if (!dateValue) return "—";

  if (Array.isArray(dateValue)) {
    const [y, m, d] = dateValue;
    if (y && m) {
      const dt = new Date(y, m - 1, d || 1);
      return dt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
    }
  }

  if (typeof dateValue === "object" && dateValue !== null) {
    const y = dateValue.year;
    const m = dateValue.monthValue || dateValue.month;
    const d = dateValue.dayOfMonth || dateValue.day;
    if (y && m) {
      const dt = new Date(y, m - 1, d || 1);
      return dt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
    }
  }

  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const getCostCenterValue = (adv) => {
  if (!adv) return "—";

  if (typeof adv.costCenterName === "string" && adv.costCenterName.trim()) {
    return adv.costCenterName;
  }
  if (typeof adv.costCenterCode === "string" && adv.costCenterCode.trim()) {
    return adv.costCenterCode;
  }
  if (typeof adv.costCenter === "string" && adv.costCenter.trim()) {
    return adv.costCenter;
  }
  if (typeof adv.cost_center_name === "string" && adv.cost_center_name.trim()) {
    return adv.cost_center_name;
  }
  if (typeof adv.cost_center_code === "string" && adv.cost_center_code.trim()) {
    return adv.cost_center_code;
  }

  if (typeof adv.costCenter === "object" && adv.costCenter !== null) {
    const name = adv.costCenter.costCenterName || adv.costCenter.name || adv.costCenter.title || adv.costCenter.costCenterCode || adv.costCenter.code;
    if (name) return name;
  }

  if (typeof adv.cost_center === "object" && adv.cost_center !== null) {
    const name = adv.cost_center.costCenterName || adv.cost_center.name || adv.cost_center.title || adv.cost_center.code;
    if (name) return name;
  }

  if (adv.departmentName) return adv.departmentName;
  if (typeof adv.department === "string") return adv.department;
  if (adv.department && adv.department.name) return adv.department.name;

  if (adv.projectName) return adv.projectName;
  if (typeof adv.project === "string") return adv.project;
  if (adv.project && adv.project.name) return adv.project.name;

  if (adv.costCenterId || adv.cost_center_id) {
    return `CC-${adv.costCenterId || adv.cost_center_id}`;
  }

  return "—";
};

const getStatusBadge = (status) => {
  const upper = (status || "").toUpperCase();
  switch (upper) {
    case "DRAFT":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-300">Draft</span>;
    case "SUBMITTED":
    case "PENDING":
    case "PENDING_APPROVAL":
    case "PENDING_MANAGER_APPROVAL":
    case "PENDING_COST_CENTER_APPROVAL":
    case "PENDING_FINANCE_APPROVAL":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Pending Approval</span>;
    case "APPROVED":
    case "EXPENSE_VERIFIED":
    case "EXPENSE VERIFIED":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-50 text-teal-700 border border-teal-200">Approved</span>;
    case "DISBURSED":
    case "IN_PROGRESS":
    case "IN PROGRESS":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">In Progress</span>;
    case "RECONCILIATION_PENDING":
    case "RECONCILIATION PENDING":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-50 text-orange-700 border border-orange-200">Reconciliation Pending</span>;
    case "SUBMITTED_FOR_REVIEW":
    case "SUBMITTED FOR REVIEW":
    case "EXPENSE_SUBMITTED":
    case "EXPENSE SUBMITTED":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">Submitted for Review</span>;
    case "UNDER_REVIEW":
    case "UNDER REVIEW":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200">Under Review</span>;
    case "SETTLEMENT_PENDING":
    case "SETTLEMENT PENDING":
    case "PARTIALLY_SETTLED":
    case "PARTIALLY_ADJUSTED":
    case "PARTIALLY ADJUSTED":
    case "ADJUSTED":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Settlement Pending</span>;
    case "CLOSED":
    case "SETTLED":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Closed</span>;
    case "REJECTED":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">Rejected</span>;
    case "CANCELLED":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-300">Cancelled</span>;
    default:
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">{status || "Unknown"}</span>;
  }
};

export default function MyAdvancesPage() {
  const navigate = useNavigate();

  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals state
  const [selectedAdvance, setSelectedAdvance] = useState(null); // Detail modal
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
        statusFilter === "ALL" ||
        (statusFilter === "PENDING" && (advStatus === "SUBMITTED" || advStatus === "PENDING" || advStatus === "PENDING_APPROVAL")) ||
        advStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [advances, searchTerm, statusFilter]);

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
      .filter((a) => (a.status || "").toUpperCase() === "SETTLED")
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    return { totalCount, pendingCount, totalDisbursed, totalSettled };
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

      {/* Page Header Card */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0a174e]">My Advances</h1>
          <p className="text-xs text-gray-500 mt-0.5">Track the status of your cash advance requests and manage drafts.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMyAdvances}
            title="Refresh list"
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md transition"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>

          <Button
            variant="primary"
            onClick={() => navigate("/expense-management/cash-advance/request")}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Request Advance
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <FileText size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Requests</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.totalCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Pending Approval</p>
            <p className="text-xl font-bold text-amber-600 mt-0.5">{stats.pendingCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <DollarSign size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Disbursed Total</p>
            <p className="text-xl font-bold text-indigo-600 mt-0.5">{formatMoney(stats.totalDisbursed)}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Settled Total</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">{formatMoney(stats.totalSettled)}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <SearchInput
              value={searchTerm}
              onSearch={(val) => setSearchTerm(val || "")}
              placeholder="Search by title, purpose, or advance ID..."
              className="!py-1.5 !px-3 !text-xs"
            />
          </div>

          <FormSelect
            label="Status"
            name="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={statusOptions}
            className="[&>label]:text-xs [&>label]:mb-1"
            buttonClassName="!py-1.5 !px-3 !text-xs"
          />
        </div>
      </div>

      {/* Data Table Container */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
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
              <thead className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">S.No</th>
                  <th className="py-3 px-4">Report #</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Cost Center</th>
                  <th className="py-3 px-4">Currency</th>
                  <th className="py-3 px-4">Needed By</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAdvances.map((adv, idx) => {
                  const advId = adv.advanceId || adv.id || "N/A";
                  const statusUpper = (adv.status || "").toUpperCase();
                  const isDraft = statusUpper === "DRAFT";
                  const isSubmitted = ["SUBMITTED", "PENDING", "PENDING_APPROVAL"].includes(statusUpper);

                  return (
                    <tr key={advId} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-4 font-medium text-gray-600">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-blue-700">
                        #{String(advId).slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-semibold text-gray-900 truncate">{adv.title || "Cash Advance"}</p>
                        {adv.purpose && <p className="text-[11px] text-gray-500 truncate mt-0.5">{adv.purpose}</p>}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-700 whitespace-nowrap">
                        {getCostCenterValue(adv)}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap">
                        {formatMoney(adv.amount, adv.currencyCode || "INR")}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                        {formatDate(getNeededByDateValue(adv))}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(adv.status)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Detail Action */}
                          <button
                            onClick={() => setSelectedAdvance(adv)}
                            title="View details"
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          >
                            <Eye size={15} />
                          </button>

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
          </div>
        )}
      </div>

      {/* View Detail Modal */}
      {selectedAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-sm">
                  Cash Advance Lifecycle #{String(selectedAdvance.advanceId || selectedAdvance.id).slice(0, 8)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAdvance(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* 7-Stage Workflow Lifecycle Stepper */}
              <CashAdvanceWorkflowStepper
                currentStatus={selectedAdvance.status}
                linkedExpenseReport={selectedAdvance.linkedExpenseReport}
              />

              <div className="flex items-center justify-between bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-blue-600">Advance Disbursed Amount</p>
                  <p className="text-lg font-bold text-blue-900 mt-0.5">
                    {formatMoney(selectedAdvance.amount, selectedAdvance.currencyCode || "INR")}
                  </p>
                </div>
                <div>{getStatusBadge(selectedAdvance.status)}</div>
              </div>

              {/* Stage 6 Adjustment Card */}
              {["DISBURSED", "EXPENSE_SUBMITTED", "EXPENSE_VERIFIED", "PARTIALLY_ADJUSTED", "ADJUSTED", "SETTLED"].includes(
                (selectedAdvance.status || "").toUpperCase()
              ) && (
                <CashAdvanceAdjustmentCard
                  advanceAmount={selectedAdvance.amount}
                  verifiedExpenseAmount={selectedAdvance.verifiedExpenseAmount || selectedAdvance.expenseAmount || selectedAdvance.totalExpenses || 0}
                  currencyCode={selectedAdvance.currencyCode || "INR"}
                  status={selectedAdvance.status}
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Title</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{selectedAdvance.title || "—"}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Cost Center</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{getCostCenterValue(selectedAdvance)}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">Purpose / Business Justification</p>
                <p className="text-gray-800 mt-1 leading-relaxed whitespace-pre-line">
                  {selectedAdvance.purpose || "No justification provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Needed By Date</p>
                  <p className="font-medium text-gray-800 mt-0.5">{formatDate(selectedAdvance.neededByDate)}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Settlement Due Date</p>
                  <p className="font-medium text-gray-800 mt-0.5">{formatDate(selectedAdvance.settlementDueDate)}</p>
                </div>
              </div>

              {selectedAdvance.notes && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Notes & Remarks</p>
                  <p className="text-gray-700 mt-1">{selectedAdvance.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                {["DISBURSED", "EXPENSE_SUBMITTED"].includes((selectedAdvance.status || "").toUpperCase()) && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      const advId = selectedAdvance.advanceId || selectedAdvance.id;
                      setSelectedAdvance(null);
                      navigate(`/expense-management/expenses/create?cashAdvanceId=${advId}`);
                    }}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Send size={13} className="mr-1.5" /> Stage 4: Submit Linked Expenses
                  </Button>
                )}
              </div>

              <Button variant="outline" onClick={() => setSelectedAdvance(null)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

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
