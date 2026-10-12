import React, { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  RefreshCw,
  Eye,
  Send,
  XCircle,
  FileText,
  Search,
  AlertCircle,
  Layers,
  Plus,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldAlert,
  CreditCard,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import FormSelect from "@/components/forms/FormSelect";
import FormInput from "@/components/forms/FormInput";
import FormTextArea from "@/components/forms/FormTextArea";
import LoadingSpinner from "@/components/LoadingSpinner";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { expenseReportService } from "@/pages/expense-management/api/expenseReportsApi";
import CashAdvanceWorkflowStepper from "@/pages/expense-management/pages/cash-advance/components/CashAdvanceWorkflowStepper";
import CashAdvanceAdjustmentCard from "@/pages/expense-management/pages/cash-advance/components/CashAdvanceAdjustmentCard";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployeeDirectory } from "@/pages/expense-management/approval-engine/hooks/useEmployeeDirectory";

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

export default function ReimbursementsPage() {
  const { user, hasRole } = useAuth();
  const { data: directory } = useEmployeeDirectory();

  const isAdmin = useMemo(() => {
    if (typeof hasRole === "function") {
      return hasRole(["Admin", "ADMIN", "Super_Admin", "SUPER_ADMIN"]);
    }
    const roles = Array.isArray(user?.roles)
      ? user.roles.map((r) => String(r).toUpperCase())
      : typeof user?.role === "string"
      ? [user.role.toUpperCase()]
      : [];
    return roles.some((r) => ["ADMIN", "SUPER_ADMIN"].includes(r));
  }, [user, hasRole]);

  const [tabType, setTabType] = useState("CASH_ADVANCES"); // "CASH_ADVANCES" | "REIMBURSEMENTS"
  const [advances, setAdvances] = useState([]);
  const [settlementAdvances, setSettlementAdvances] = useState([]);
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal states
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [settlingAdvance, setSettlingAdvance] = useState(null);
  const [settlementAction, setSettlementAction] = useState("SETTLE");
  const [settlementNotes, setSettlementNotes] = useState("");

  const [creatingAdjustment, setCreatingAdjustment] = useState(false);
  const [newAdjForm, setNewAdjForm] = useState({
    cashAdvanceId: "",
    expenseReportId: "",
    adjustmentAmount: "",
    notes: "",
  });

  const [editingAdjustment, setEditingAdjustment] = useState(null);
  const [editForm, setEditForm] = useState({
    adjustmentAmount: "",
    notes: "",
    status: "SETTLED",
  });

  const [deletingAdjustment, setDeletingAdjustment] = useState(null);
  const [rejectingAdvance, setRejectingAdvance] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Finance", to: "/expense-management/finance/verification" },
    { label: "Reimbursements & Disbursements" },
  ];

  const fetchAdvances = async () => {
    setLoading(true);
    try {
      const [allRes, reportsRes, adjRes] = await Promise.all([
        cashAdvanceApi.getAll().catch(() => ({ data: [] })),
        expenseReportService.getAll({ limit: 1000, page: 1 }).catch(() => ({ data: [] })),
        cashAdvanceApi.getReimbursementAdjustments().catch(() => ({ data: [] })),
      ]);

      const allData = allRes.data?.data || allRes.data || [];
      const allList = Array.isArray(allData) ? allData : allData.content || allData.items || [];

      const rawReports = reportsRes.data?.data || reportsRes.data || [];
      const reportsList = Array.isArray(rawReports)
        ? rawReports
        : rawReports.reports || rawReports.expenseReports || rawReports.content || rawReports.items || [];

      const enrichedAdvances = allList.map((adv) => {
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

      const relevantSettlements = enrichedAdvances.filter((a) =>
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
      setSettlementAdvances(relevantSettlements.length > 0 ? relevantSettlements : enrichedAdvances);

      const adjData = adjRes.data?.data || adjRes.data || [];
      const adjList = Array.isArray(adjData) ? adjData : adjData.content || adjData.items || [];
      setReimbursements(adjList);
    } catch (err) {
      console.error("Failed to load disbursement queue:", err);
      showStatusToast("Failed to load data for disbursement/reimbursement", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvances();
  }, [tabType]);

  const filteredAdvances = useMemo(() => {
    return advances.filter((adv) => {
      const statusUpper = (adv.status || "").toUpperCase();

      let matchStatus = false;
      if (statusFilter === "ALL") {
        matchStatus = ["APPROVED", "DISBURSED", "SETTLED", "CLOSED"].includes(statusUpper);
      } else if (statusFilter === "APPROVED") {
        matchStatus = statusUpper === "APPROVED";
      } else if (statusFilter === "DISBURSED") {
        matchStatus = ["DISBURSED", "SETTLED", "CLOSED"].includes(statusUpper);
      } else {
        matchStatus = true;
      }

      const matchSearch =
        !searchTerm ||
        (adv.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (adv.purpose || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (adv.employeeId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (adv.advanceId || adv.id || "").toString().toLowerCase().includes(searchTerm.toLowerCase());

      return matchStatus && matchSearch;
    });
  }, [advances, statusFilter, searchTerm]);

  const filteredSettlementAdvances = useMemo(() => {
    return settlementAdvances.filter((adv) => {
      const statusUpper = (adv.status || "").toUpperCase();
      const advAmt = Number(adv.amount) || 0;
      const expAmt = Number(adv.verifiedExpenseAmount) || 0;
      const balance = advAmt - expAmt;

      let matchStatus = true;
      if (statusFilter === "DISBURSED") {
        matchStatus = !["SETTLED", "CLOSED"].includes(statusUpper);
      } else if (statusFilter === "SETTLED" || statusFilter === "CLOSED") {
        matchStatus = ["SETTLED", "CLOSED"].includes(statusUpper);
      } else if (statusFilter === "SETTLEMENT_PENDING") {
        matchStatus = !["SETTLED", "CLOSED"].includes(statusUpper);
      } else if (statusFilter === "REPAYMENT_DUE") {
        matchStatus = balance > 0 && !["SETTLED", "CLOSED"].includes(statusUpper);
      } else if (statusFilter === "REIMBURSEMENT_DUE") {
        matchStatus = balance < 0 && !["SETTLED", "CLOSED"].includes(statusUpper);
      }

      const empName = getEmployeeName(adv, directory);

      const matchSearch =
        !searchTerm ||
        (adv.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (adv.purpose || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (adv.employeeId || "").toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        (adv.advanceId || adv.id || "").toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        empName.toLowerCase().includes(searchTerm.toLowerCase());

      return matchStatus && matchSearch;
    });
  }, [settlementAdvances, statusFilter, searchTerm, directory]);

  const filteredReimbursements = useMemo(() => {
    return reimbursements.filter((item) => {
      const statusUpper = (item.status || "").toUpperCase();
      let matchStatus = true;
      if (statusFilter === "SETTLED" || statusFilter === "CLOSED") {
        matchStatus = ["SETTLED", "CLOSED", "PROCESSED"].includes(statusUpper);
      } else if (statusFilter === "SETTLEMENT_PENDING") {
        matchStatus = ["PENDING", "DRAFT", "SUBMITTED"].includes(statusUpper);
      }

      const matchSearch =
        !searchTerm ||
        (item.adjustmentId || item.id || "").toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.cashAdvanceId || item.advanceId || "").toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.expenseReportId || "").toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.notes || item.remarks || "").toLowerCase().includes(searchTerm.toLowerCase());

      return matchStatus && matchSearch;
    });
  }, [reimbursements, statusFilter, searchTerm]);

  // Action handlers
  const handleDisburse = async (adv) => {
    const advanceId = adv.advanceId || adv.id;
    setActionLoading(true);
    try {
      await cashAdvanceApi.disburse(advanceId);
      showStatusToast(`Cash advance #${String(advanceId).slice(0, 8)} disbursed successfully!`, "success");
      fetchAdvances();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to disburse cash advance", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectingAdvance) return;
    const advanceId = rejectingAdvance.advanceId || rejectingAdvance.id;
    setActionLoading(true);
    try {
      await cashAdvanceApi.reject(advanceId, rejectionReason);
      showStatusToast(`Cash advance #${String(advanceId).slice(0, 8)} rejected.`, "success");
      setRejectingAdvance(null);
      setRejectionReason("");
      fetchAdvances();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to reject cash advance", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmSettlement = async (e) => {
    e.preventDefault();
    if (!settlingAdvance) return;
    const advanceId = settlingAdvance.advanceId || settlingAdvance.id;
    setActionLoading(true);
    try {
      const advAmt = Number(settlingAdvance.amount) || 0;
      const expAmt = Number(settlingAdvance.verifiedExpenseAmount || 0);
      const diff = advAmt - expAmt;

      try {
        await cashAdvanceApi.createReimbursementAdjustment({
          cashAdvanceId: advanceId,
          expenseReportId: settlingAdvance.linkedExpenseReport?.reportId || settlingAdvance.linkedExpenseReport?.id || null,
          adjustmentAmount: Math.abs(diff),
          notes: settlementNotes.trim() || `Settlement adjustment (${diff > 0 ? "Repayment" : diff < 0 ? "Additional Reimbursement" : "Zero Balance"})`,
        });
      } catch (err) {
        console.log("Optional reimbursement adjustment call log:", err);
      }

      await cashAdvanceApi.update(advanceId, {
        status: "CLOSED",
        settledAt: new Date().toISOString(),
        settlementNotes: settlementNotes.trim() || "Settled & Closed by Finance",
      });

      showStatusToast(`Cash advance #${String(advanceId).slice(0, 8)} settled and closed successfully!`, "success");
      setSettlingAdvance(null);
      setSettlementNotes("");
      fetchAdvances();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to record settlement", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Single adjustment detail inspection GET /xms/finance/reimbursements/{adjustmentId}
  const handleViewAdjustment = async (item) => {
    const adjId = item.adjustmentId || item.id;
    if (!adjId) {
      setSelectedAdjustment(item);
      return;
    }
    setDetailLoading(true);
    setSelectedAdjustment(item);
    try {
      const res = await cashAdvanceApi.getReimbursementAdjustmentById(adjId);
      const data = res.data?.data || res.data || item;
      setSelectedAdjustment(data);
    } catch (err) {
      console.error("Failed to fetch adjustment details by ID:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Create reimbursement adjustment POST /xms/finance/reimbursements
  const handleCreateAdjustment = async (e) => {
    e.preventDefault();
    if (!newAdjForm.cashAdvanceId && !newAdjForm.expenseReportId) {
      showStatusToast("Please enter a Cash Advance ID or Expense Report ID", "error");
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        cashAdvanceId: newAdjForm.cashAdvanceId ? Number(newAdjForm.cashAdvanceId) || newAdjForm.cashAdvanceId : null,
        expenseReportId: newAdjForm.expenseReportId ? Number(newAdjForm.expenseReportId) || newAdjForm.expenseReportId : null,
        adjustmentAmount: Number(newAdjForm.adjustmentAmount) || 0,
        notes: newAdjForm.notes.trim() || "Finance settlement adjustment",
      };
      await cashAdvanceApi.createReimbursementAdjustment(payload);
      showStatusToast("Reimbursement adjustment created successfully!", "success");
      setCreatingAdjustment(false);
      setNewAdjForm({ cashAdvanceId: "", expenseReportId: "", adjustmentAmount: "", notes: "" });
      fetchAdvances();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to create reimbursement adjustment", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Update reimbursement adjustment PUT /xms/finance/reimbursements/{adjustmentId}
  const handleUpdateAdjustment = async (e) => {
    e.preventDefault();
    if (!editingAdjustment) return;
    const adjId = editingAdjustment.adjustmentId || editingAdjustment.id;
    setActionLoading(true);
    try {
      const payload = {
        adjustmentAmount: Number(editForm.adjustmentAmount) || 0,
        notes: editForm.notes.trim(),
        status: editForm.status || editingAdjustment.status || "SETTLED",
      };
      await cashAdvanceApi.updateReimbursementAdjustment(adjId, payload);
      showStatusToast(`Adjustment #${String(adjId).slice(0, 8)} updated successfully!`, "success");
      setEditingAdjustment(null);
      fetchAdvances();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to update reimbursement adjustment", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete reimbursement adjustment DELETE /xms/finance/reimbursements/{adjustmentId} (Admin only)
  const handleDeleteAdjustment = async () => {
    if (!deletingAdjustment) return;
    const adjId = deletingAdjustment.adjustmentId || deletingAdjustment.id;
    setActionLoading(true);
    try {
      await cashAdvanceApi.deleteReimbursementAdjustment(adjId);
      showStatusToast(`Reimbursement adjustment #${String(adjId).slice(0, 8)} deleted successfully.`, "success");
      setDeletingAdjustment(null);
      fetchAdvances();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to delete reimbursement adjustment", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const tabOptions = [
    { label: "Cash Advance Disbursement", value: "CASH_ADVANCES" },
    { label: "Expense Reimbursements / Settlement Adjustments", value: "REIMBURSEMENTS" },
  ];

  const statusOptionsAdvances = [
    { label: "Pending Disbursement (Approved)", value: "APPROVED" },
    { label: "Disbursed", value: "DISBURSED" },
    { label: "All Approved/Disbursed", value: "ALL" },
  ];

  const statusOptionsReimbursements = [
    { label: "All Statuses", value: "ALL" },
    { label: "Settlement Pending", value: "SETTLEMENT_PENDING" },
    { label: "Settled / Closed", value: "CLOSED" },
    { label: "Repayment Due (Employee owes)", value: "REPAYMENT_DUE" },
    { label: "Additional Reimbursement Due (Company owes)", value: "REIMBURSEMENT_DUE" },
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbs} />

      {/* Header Card */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0a174e]">Finance Disbursement & Reimbursements</h1>
          <p className="text-xs text-gray-500 mt-0.5">Disburse approved cash advance requests and process employee reimbursements.</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {tabType === "REIMBURSEMENTS" && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setCreatingAdjustment(true)}
              className="!py-1.5 !px-3 !text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Record Adjustment</span>
            </Button>
          )}

          <button
            onClick={fetchAdvances}
            title="Refresh queue"
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md transition"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Filters & Type Select Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <FormSelect
            label="Disbursement Module"
            name="tabType"
            value={tabType}
            onChange={(e) => setTabType(e.target.value)}
            options={tabOptions}
            className="[&>label]:text-xs [&>label]:mb-1"
            buttonClassName="!py-1.5 !px-3 !text-xs font-semibold text-blue-700"
          />

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <SearchInput
              value={searchTerm}
              onSearch={(val) => setSearchTerm(val || "")}
              placeholder="Search by title, employee ID, advance ID, or adjustment ID..."
              className="!py-1.5 !px-3 !text-xs"
            />
          </div>

          <FormSelect
            label="Filter Status"
            name="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={tabType === "CASH_ADVANCES" ? statusOptionsAdvances : statusOptionsReimbursements}
            className="[&>label]:text-xs [&>label]:mb-1"
            buttonClassName="!py-1.5 !px-3 !text-xs"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {tabType === "REIMBURSEMENTS" ? (
        <div className="space-y-4">
          {/* Main Table: Settlement Advances & Adjustments */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-3.5 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#0a174e] uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-blue-600" />
                <span>Cash Advance Settlement Adjustments Queue</span>
              </h3>
              <span className="text-[11px] text-gray-500 font-medium">
                {filteredSettlementAdvances.length} Record(s) Found
              </span>
            </div>

            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-gray-500">
                <LoadingSpinner size="lg" className="mb-2" />
                <p className="text-xs">Loading settlement advances & reimbursements...</p>
              </div>
            ) : filteredSettlementAdvances.length === 0 && filteredReimbursements.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <FileText className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-gray-700">No reimbursement adjustments or settlement advances recorded</p>
                <p className="text-xs text-gray-400 mt-1">
                  Settlement adjustments recorded against expense reports will appear here. All ready reimbursements sync with AP Payments.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Ref #</th>
                      <th className="py-3 px-4">Employee Name</th>
                      <th className="py-3 px-4">Title & Purpose</th>
                      <th className="py-3 px-4 text-right">Disbursed Advance</th>
                      <th className="py-3 px-4 text-right">Verified Expenses</th>
                      <th className="py-3 px-4 text-right">Net Adjustment Balance</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSettlementAdvances.map((adv) => {
                      const advId = adv.advanceId || adv.id;
                      const statusUpper = (adv.status || "").toUpperCase();
                      const isSettled = ["SETTLED", "CLOSED"].includes(statusUpper);
                      const advAmt = Number(adv.amount) || 0;
                      const expAmt = Number(adv.verifiedExpenseAmount) || 0;
                      const diff = advAmt - expAmt;

                      return (
                        <tr key={advId} className="hover:bg-gray-50/80 transition">
                          <td className="py-3 px-4 font-mono font-medium text-blue-700">
                            #{String(advId).slice(0, 8)}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">
                            {getEmployeeName(adv, directory)}
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <p className="font-semibold text-gray-900 truncate">{adv.title || "Cash Advance"}</p>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">{adv.purpose || "—"}</p>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-gray-800 whitespace-nowrap">
                            {formatMoney(advAmt, adv.currencyCode || "INR")}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-blue-700 whitespace-nowrap">
                            {formatMoney(expAmt, adv.currencyCode || "INR")}
                          </td>
                          <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                            {diff > 0 ? (
                              <span className="text-amber-600 flex items-center justify-end gap-1">
                                <ArrowDownLeft size={13} />
                                <span>{formatMoney(diff, adv.currencyCode || "INR")}</span>
                              </span>
                            ) : diff < 0 ? (
                              <span className="text-purple-600 flex items-center justify-end gap-1">
                                <ArrowUpRight size={13} />
                                <span>{formatMoney(Math.abs(diff), adv.currencyCode || "INR")}</span>
                              </span>
                            ) : (
                              <span className="text-emerald-600">
                                {formatMoney(0, adv.currencyCode || "INR")}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${
                                isSettled
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : diff < 0
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : diff > 0
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              {isSettled
                                ? "Closed / Settled"
                                : diff < 0
                                ? "Additional Reimbursement Due"
                                : diff > 0
                                ? "Employee Repayment Due"
                                : "Zero Balance Pending Closure"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedAdvance(adv)}
                                title="View Details & Settlement History"
                                className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              >
                                <Eye size={15} />
                              </button>

                              {!isSettled && (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => {
                                    setSettlingAdvance(adv);
                                    setSettlementAction("SETTLE");
                                  }}
                                  className="!py-1 !px-2.5 !text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  Settle Advance
                                </Button>
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

          {/* Recorded Reimbursement Adjustments Table (/xms/finance/reimbursements) */}
          {filteredReimbursements.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="p-3.5 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#0a174e] uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign size={14} className="text-emerald-600" />
                  <span>Recorded Reimbursement Adjustments (/xms/finance/reimbursements)</span>
                </h3>
                <span className="text-[11px] text-gray-500 font-medium">
                  {filteredReimbursements.length} Adjustment(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Adjustment Ref #</th>
                      <th className="py-3 px-4">Advance Ref #</th>
                      <th className="py-3 px-4">Expense Report #</th>
                      <th className="py-3 px-4 text-right">Adjustment Amount</th>
                      <th className="py-3 px-4">Notes / Details</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredReimbursements.map((item, idx) => {
                      const adjId = item.adjustmentId || item.id || idx;
                      return (
                        <tr key={adjId} className="hover:bg-gray-50/80 transition">
                          <td className="py-3 px-4 font-mono font-medium text-blue-700">
                            #{String(adjId).slice(0, 8)}
                          </td>
                          <td className="py-3 px-4 font-mono text-gray-600">
                            {item.cashAdvanceId || item.advanceId ? `#${String(item.cashAdvanceId || item.advanceId).slice(0, 8)}` : "—"}
                          </td>
                          <td className="py-3 px-4 font-mono text-gray-600">
                            {item.expenseReportId ? `#${String(item.expenseReportId).slice(0, 8)}` : "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-gray-900">
                            {formatMoney(item.adjustmentAmount || item.amount, item.currencyCode || "INR")}
                          </td>
                          <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                            {item.notes || item.remarks || "—"}
                          </td>
                          <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                            {formatDate(item.createdAt || item.createdDate)}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleViewAdjustment(item)}
                                title="View Adjustment Details (GET by ID)"
                                className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              >
                                <Eye size={15} />
                              </button>

                              <button
                                onClick={() => {
                                  setEditingAdjustment(item);
                                  setEditForm({
                                    adjustmentAmount: item.adjustmentAmount || item.amount || 0,
                                    notes: item.notes || item.remarks || "",
                                    status: item.status || "SETTLED",
                                  });
                                }}
                                title="Edit Adjustment (PUT)"
                                className="p-1.5 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                              >
                                <Edit2 size={15} />
                              </button>

                              {isAdmin && (
                                <button
                                  onClick={() => setDeletingAdjustment(item)}
                                  title="Delete Adjustment (Admin Only)"
                                  className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition"
                                >
                                  <Trash2 size={15} />
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
            </div>
          )}
        </div>
      ) : (
        /* CASH_ADVANCES Disbursement Tab */
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-500">
              <LoadingSpinner size="lg" className="mb-2" />
              <p className="text-xs">Loading cash advance disbursement queue...</p>
            </div>
          ) : filteredAdvances.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <CheckCircle2 className="mx-auto h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-700">No cash advances found</p>
              <p className="text-xs text-gray-400 mt-1">There are no cash advances requiring disbursement matching your filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Ref #</th>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Title & Purpose</th>
                    <th className="py-3 px-4 text-right">Approved Amount</th>
                    <th className="py-3 px-4">Needed By</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAdvances.map((adv) => {
                    const advId = adv.advanceId || adv.id;
                    const isApproved = (adv.status || "").toUpperCase() === "APPROVED";

                    return (
                      <tr key={advId} className="hover:bg-gray-50/80 transition">
                        <td className="py-3 px-4 font-mono font-medium text-blue-700">
                          #{String(advId).slice(0, 8)}
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-800">
                          {adv.employeeId || "—"}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-semibold text-gray-900 truncate">{adv.title || "Cash Advance"}</p>
                          <p className="text-[11px] text-gray-500 truncate mt-0.5">{adv.purpose || "—"}</p>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-gray-900 whitespace-nowrap">
                          {formatMoney(adv.amount, adv.currencyCode || "INR")}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                          {formatDate(adv.neededByDate)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${
                              isApproved
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-indigo-50 text-indigo-700 border-indigo-200"
                            }`}
                          >
                            {isApproved ? "Approved (Pending Disburse)" : adv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedAdvance(adv)}
                              title="View details"
                              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            >
                              <Eye size={15} />
                            </button>

                            {isApproved && (
                              <>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleDisburse(adv)}
                                  disabled={actionLoading}
                                  className="!py-1 !px-2.5 !text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                  Disburse Advance
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => setRejectingAdvance(adv)}
                                  disabled={actionLoading}
                                  className="!py-1 !px-2.5 !text-[11px]"
                                >
                                  Reject
                                </Button>
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
          )}
        </div>
      )}

      {/* Advance & Settlement Detail Modal */}
      {selectedAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 text-sm">
                Finance POV — Advance & Settlement Details #{String(selectedAdvance.advanceId || selectedAdvance.id).slice(0, 8)}
              </h3>
              <button onClick={() => setSelectedAdvance(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <CashAdvanceWorkflowStepper
                currentStatus={selectedAdvance.status}
                linkedExpenseReport={selectedAdvance.linkedExpenseReport}
              />

              <CashAdvanceAdjustmentCard
                advanceAmount={selectedAdvance.amount}
                verifiedExpenseAmount={selectedAdvance.verifiedExpenseAmount || 0}
                currencyCode={selectedAdvance.currencyCode || "INR"}
                status={selectedAdvance.status}
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Employee</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{getEmployeeName(selectedAdvance, directory)}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Title</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{selectedAdvance.title || "—"}</p>
                </div>
              </div>

              {/* Linked Expense Report Section */}
              {selectedAdvance.linkedExpenseReport && (
                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">
                    Linked Expense Report
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {selectedAdvance.linkedExpenseReport.title || selectedAdvance.linkedExpenseReport.reportTitle || "Expense Report"}
                      </p>
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                        ID: #{String(selectedAdvance.linkedExpenseReport.reportId || selectedAdvance.linkedExpenseReport.id).slice(0, 8)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-900">
                        {formatMoney(
                          selectedAdvance.linkedExpenseReport.totalAmount || selectedAdvance.linkedExpenseReport.amount || 0,
                          selectedAdvance.currencyCode || "INR"
                        )}
                      </p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800">
                        {selectedAdvance.linkedExpenseReport.status || "Submitted"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">Purpose</p>
                <p className="text-gray-800 mt-1 whitespace-pre-line">{selectedAdvance.purpose || "No details provided."}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Needed By Date</p>
                  <p className="font-medium text-gray-800 mt-0.5">{formatDate(selectedAdvance.neededByDate)}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Settlement Expected</p>
                  <p className="font-medium text-gray-800 mt-0.5">{formatDate(selectedAdvance.settlementDueDate)}</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedAdvance(null)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Single Reimbursement Adjustment Detail Modal (GET /xms/finance/reimbursements/{adjustmentId}) */}
      {selectedAdjustment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <DollarSign size={16} className="text-blue-600" />
                <span>
                  Reimbursement Adjustment Details #{String(selectedAdjustment.adjustmentId || selectedAdjustment.id).slice(0, 8)}
                </span>
              </h3>
              <button onClick={() => setSelectedAdjustment(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <XCircle size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {detailLoading ? (
                <div className="py-8 flex flex-col items-center justify-center text-gray-500">
                  <LoadingSpinner size="md" className="mb-2" />
                  <p className="text-xs">Fetching adjustment details from server...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">Adjustment ID</p>
                      <p className="font-mono font-bold text-blue-700 mt-0.5">
                        #{String(selectedAdjustment.adjustmentId || selectedAdjustment.id).slice(0, 8)}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">Adjustment Amount</p>
                      <p className="font-bold text-emerald-700 text-sm mt-0.5">
                        {formatMoney(selectedAdjustment.adjustmentAmount || selectedAdjustment.amount, selectedAdjustment.currencyCode || "INR")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">Cash Advance Ref</p>
                      <p className="font-mono font-medium text-gray-800 mt-0.5">
                        {selectedAdjustment.cashAdvanceId || selectedAdjustment.advanceId
                          ? `#${String(selectedAdjustment.cashAdvanceId || selectedAdjustment.advanceId).slice(0, 8)}`
                          : "—"}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">Expense Report Ref</p>
                      <p className="font-mono font-medium text-gray-800 mt-0.5">
                        {selectedAdjustment.expenseReportId
                          ? `#${String(selectedAdjustment.expenseReportId).slice(0, 8)}`
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Notes & Remarks</p>
                    <p className="text-gray-800 mt-1 whitespace-pre-line">
                      {selectedAdjustment.notes || selectedAdjustment.remarks || "No remarks provided."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">Status</p>
                      <span className="inline-block mt-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {selectedAdjustment.status || "SETTLED"}
                      </span>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">Created Date</p>
                      <p className="font-medium text-gray-800 mt-0.5">
                        {formatDate(selectedAdjustment.createdAt || selectedAdjustment.createdDate)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedAdjustment(null)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Reimbursement Adjustment Modal (POST /xms/finance/reimbursements) */}
      {creatingAdjustment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <Plus size={16} className="text-blue-600" />
                <span>Record Reimbursement Adjustment (POST /xms/finance/reimbursements)</span>
              </h3>
              <button onClick={() => setCreatingAdjustment(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAdjustment} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cash Advance ID</label>
                  <FormInput
                    name="cashAdvanceId"
                    value={newAdjForm.cashAdvanceId}
                    onChange={(e) => setNewAdjForm({ ...newAdjForm, cashAdvanceId: e.target.value })}
                    placeholder="e.g. 101"
                    className="!py-1.5 !px-3 !text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Expense Report ID</label>
                  <FormInput
                    name="expenseReportId"
                    value={newAdjForm.expenseReportId}
                    onChange={(e) => setNewAdjForm({ ...newAdjForm, expenseReportId: e.target.value })}
                    placeholder="e.g. 502"
                    className="!py-1.5 !px-3 !text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Adjustment Amount (₹)</label>
                <FormInput
                  type="number"
                  step="0.01"
                  name="adjustmentAmount"
                  value={newAdjForm.adjustmentAmount}
                  onChange={(e) => setNewAdjForm({ ...newAdjForm, adjustmentAmount: e.target.value })}
                  placeholder="0.00"
                  required
                  className="!py-1.5 !px-3 !text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Reason</label>
                <textarea
                  value={newAdjForm.notes}
                  onChange={(e) => setNewAdjForm({ ...newAdjForm, notes: e.target.value })}
                  placeholder="Enter adjustment remarks, repayment details, or reimbursement payout reason..."
                  rows={3}
                  className="w-full rounded-md border border-gray-300 p-2.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setCreatingAdjustment(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={actionLoading} className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
                  {actionLoading ? <LoadingSpinner size="sm" className="mr-1.5" /> : "Save Adjustment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Reimbursement Adjustment Modal (PUT /xms/finance/reimbursements/{adjustmentId}) */}
      {editingAdjustment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <Edit2 size={16} className="text-amber-600" />
                <span>
                  Update Adjustment #{String(editingAdjustment.adjustmentId || editingAdjustment.id).slice(0, 8)}
                </span>
              </h3>
              <button onClick={() => setEditingAdjustment(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateAdjustment} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Adjustment Amount (₹)</label>
                <FormInput
                  type="number"
                  step="0.01"
                  name="adjustmentAmount"
                  value={editForm.adjustmentAmount}
                  onChange={(e) => setEditForm({ ...editForm, adjustmentAmount: e.target.value })}
                  required
                  className="!py-1.5 !px-3 !text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full rounded-md border border-gray-300 p-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="SETTLED">SETTLED</option>
                  <option value="PROCESSED">PROCESSED</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Remarks</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Update adjustment notes..."
                  rows={3}
                  className="w-full rounded-md border border-gray-300 p-2.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setEditingAdjustment(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={actionLoading} className="text-xs bg-amber-600 hover:bg-amber-700 text-white">
                  {actionLoading ? <LoadingSpinner size="sm" className="mr-1.5" /> : "Update Adjustment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Reimbursement Adjustment Modal (DELETE /xms/finance/reimbursements/{adjustmentId} - Admin Only) */}
      {deletingAdjustment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-red-50/50">
              <h3 className="font-bold text-red-900 text-sm flex items-center gap-1.5">
                <ShieldAlert size={18} className="text-red-600" />
                <span>Delete Reimbursement Adjustment (Admin)</span>
              </h3>
              <button onClick={() => setDeletingAdjustment(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-gray-700">
                Are you sure you want to permanently delete reimbursement adjustment{" "}
                <strong className="text-gray-900 font-mono">
                  #{String(deletingAdjustment.adjustmentId || deletingAdjustment.id).slice(0, 8)}
                </strong>
                ?
              </p>
              <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-red-800 text-[11px]">
                <strong>Warning:</strong> This action is available to system Administrators only and cannot be undone.
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeletingAdjustment(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteAdjustment}
                disabled={actionLoading}
                className="text-xs"
              >
                {actionLoading ? <LoadingSpinner size="sm" className="mr-1.5" /> : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Advance Details Modal */}
      {settlingAdvance && (() => {
        const advAmt = Number(settlingAdvance.amount) || 0;
        const expAmt = Number(settlingAdvance.verifiedExpenseAmount || 0);
        const balance = advAmt - expAmt;
        const empName = getEmployeeName(settlingAdvance, directory);
        const currency = settlingAdvance.currencyCode || "INR";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 border border-gray-100">
              <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    Settlement Details
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Advance #{String(settlingAdvance.advanceId || settlingAdvance.id).slice(0, 8)} • Employee: <span className="font-medium text-gray-800">{empName}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettlingAdvance(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmSettlement} className="p-5 space-y-5 text-xs">
                <div className="grid grid-cols-3 gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Advance Amount</p>
                    <p className="text-base font-bold text-gray-900 mt-1">{formatMoney(advAmt, currency)}</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Expenses</p>
                    <p className="text-base font-bold text-gray-900 mt-1">{formatMoney(expAmt, currency)}</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Balance</p>
                    <div className="mt-1">
                      {balance > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {formatMoney(balance, currency)} <span className="text-[10px] font-normal ml-1">(Employee Repayment Due)</span>
                        </span>
                      ) : balance < 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {formatMoney(Math.abs(balance), currency)} <span className="text-[10px] font-normal ml-1">(Additional Reimbursement Due)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {formatMoney(0, currency)} <span className="text-[10px] font-normal ml-1">(Fully Settled)</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-800">Settlement Action</label>
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-gray-800">
                      <input
                        type="radio"
                        name="settlementAction"
                        value="SETTLE"
                        checked={settlementAction === "SETTLE"}
                        onChange={(e) => setSettlementAction(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span>
                        Mark as Settled{" "}
                        <span className="text-gray-500 font-normal">
                          {balance > 0
                            ? `(Employee to refund ${formatMoney(balance, currency)})`
                            : balance < 0
                            ? `(Company to reimburse ${formatMoney(Math.abs(balance), currency)})`
                            : "(Fully settled)"}
                        </span>
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-gray-800">
                      <input
                        type="radio"
                        name="settlementAction"
                        value="ADJUST"
                        checked={settlementAction === "ADJUST"}
                        onChange={(e) => setSettlementAction(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span>Adjust to next advance</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea
                    value={settlementNotes}
                    onChange={(e) => setSettlementNotes(e.target.value)}
                    placeholder={
                      balance > 0
                        ? "Expenses verified. Balance to be refunded."
                        : balance < 0
                        ? "Expenses verified. Excess to be reimbursed."
                        : "Expenses verified. Fully settled."
                    }
                    rows={3}
                    className="w-full rounded-md border border-gray-300 p-2.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <Button type="button" variant="outline" onClick={() => setSettlingAdvance(null)} className="text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={actionLoading} className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
                    {actionLoading ? <LoadingSpinner size="sm" className="mr-1.5" /> : "Confirm Settlement"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Reject Modal */}
      {rejectingAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 text-sm">Reject Cash Advance Disbursement</h3>
              <button onClick={() => setRejectingAdvance(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <XCircle size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmReject} className="p-5 space-y-4">
              <p className="text-xs text-gray-600">
                Are you sure you want to reject disbursement for advance request <strong className="text-gray-900">#{String(rejectingAdvance.advanceId || rejectingAdvance.id).slice(0, 8)}</strong>?
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason for Rejection (Optional)</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for declining disbursement..."
                  rows={3}
                  className="w-full rounded-md border border-gray-300 p-2.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setRejectingAdvance(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" variant="danger" disabled={actionLoading} className="text-xs">
                  {actionLoading ? <LoadingSpinner size="sm" className="mr-1.5" /> : "Confirm Reject"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
