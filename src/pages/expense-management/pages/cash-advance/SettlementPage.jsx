import React, { useState, useEffect, useMemo } from "react";
import { DollarSign, CheckCircle2, RefreshCw, Eye, Receipt, CheckCircle, Clock, FileText, AlertCircle, Layers, ArrowUpRight, ArrowDownLeft, CreditCard, XCircle, Loader2 } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import FormSelect from "@/components/forms/FormSelect";
import FormInput from "@/components/forms/FormInput";
import FormTextArea from "@/components/forms/FormTextArea";
import LoadingSpinner from "@/components/LoadingSpinner";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import SettlementModal, { toSettlementAdvance } from "@/components/settlement/SettlementModal";
import { getSettlementBlockReason } from "@/pages/expense-management/api/adjustmentRequest";
import { expenseReportService } from "@/pages/expense-management/api/expenseReportsApi";
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
const canOpenExpenseFor = (adv, user) =>
  Boolean(user?.employeeId) &&
  String(adv.employeeId ?? "").trim().toLowerCase() === String(user.employeeId).trim().toLowerCase() &&
  LINKABLE_EXPENSE_STATUSES.includes((adv.status || "").toUpperCase()) &&
  Number(adv.outstandingBalance ?? 0) > 0;

export default function SettlementPage() {
  const { user, hasRole } = useAuth();
  const { data: directory } = useEmployeeDirectory();
  const navigate = useNavigate();
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

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

  useEffect(() => {
    fetchSettlementAdvances();
  }, [isFinanceExecutive]);

  const filteredAdvances = useMemo(() => {
    return advances.filter((adv) => {
      const statusUpper = (adv.status || "").toUpperCase();

      let matchStatus = true;
      if (statusFilter === "APPROVED") {
        matchStatus = ["APPROVED"].includes(statusUpper);
      } else if (statusFilter === "DISBURSED" || statusFilter === "IN_PROGRESS") {
        matchStatus = [
          "DISBURSED", "IN_PROGRESS", "IN PROGRESS",
          "RECONCILIATION_PENDING", "RECONCILIATION PENDING",
          "SUBMITTED_FOR_REVIEW", "SUBMITTED FOR REVIEW", "EXPENSE_SUBMITTED",
          "UNDER_REVIEW", "UNDER REVIEW",
          "EXPENSE_VERIFIED",
          "SETTLEMENT_PENDING", "SETTLEMENT PENDING", "PARTIALLY_SETTLED", "PARTIALLY_ADJUSTED"
        ].includes(statusUpper);
      } else if (statusFilter === "SETTLED" || statusFilter === "CLOSED") {
        matchStatus = ["SETTLED", "CLOSED"].includes(statusUpper);
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

  // Statistics
  const stats = useMemo(() => {
    const totalDisbursedCount = advances.length;

    const totalOutstanding = advances
      .filter((a) => !["SETTLED", "CLOSED"].includes((a.status || "").toUpperCase()))
      .reduce((sum, a) => sum + (Number(a.outstandingBalance ?? a.amount) || 0), 0);

    const totalSettled = advances
      .filter((a) => ["SETTLED", "CLOSED"].includes((a.status || "").toUpperCase()))
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    return { totalDisbursedCount, totalOutstanding, totalSettled };
  }, [advances]);

  const handleDisburse = (adv) => {
    if (!isFinanceExecutive) return;
    setDisbursing(adv);
  };

  const handleConfirmDisburse = async (values) => {
    if (!disbursing) return;
    const advanceId = disbursing.advanceId || disbursing.id;

    setSubmitting(true);
    try {
      await cashAdvanceApi.disburse(advanceId, buildDisbursementFormData(values));
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
    if (["SETTLED", "CLOSED"].includes(String(adv.status || "").toUpperCase()) || Number(adv.outstandingBalance) === 0) {
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

  const statusOptions = [
    { label: "All Advances", value: "ALL" },
    { label: "Approved (Awaiting Disbursement)", value: "APPROVED" },
    { label: "Disbursed / Outstanding", value: "DISBURSED" },
    { label: "Fully Settled", value: "SETTLED" },
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbs} />

      {/* Header Card */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0a174e]">Cash Advance Settlement & Closure</h1>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <DollarSign size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Disbursed Advances</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.totalDisbursedCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Outstanding Balance</p>
            <p className="text-xl font-bold text-amber-600 mt-0.5">{formatMoney(stats.totalOutstanding)}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Settled</p>
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

      {/* Data Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-500">
            <LoadingSpinner size="lg" className="mb-2" />
            <p className="text-xs">Loading cash advance settlement records...</p>
          </div>
        ) : filteredAdvances.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CheckCircle2 className="mx-auto h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-700">No settlement records found</p>
            <p className="text-xs text-gray-400 mt-1">There are no cash advance settlements matching your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Ref #</th>
                  {isFinanceExecutive && <th className="py-3 px-4">Employee Name</th>}
                  <th className="py-3 px-4">Title & Purpose</th>
                  <th className="py-3 px-4 text-right">Advance Disbursed</th>
                  <th className="py-3 px-4 text-right">Outstanding Balance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAdvances.map((adv) => {
                  const advId = adv.advanceId || adv.id;
                  const statusUpper = (adv.status || "").toUpperCase();
                  const isSettled = ["SETTLED", "CLOSED"].includes(statusUpper);
                  const outstanding = adv.outstandingBalance != null ? adv.outstandingBalance : adv.amount;

                  return (
                    <tr key={advId} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-4 font-mono font-medium text-blue-700">
                        #{String(advId).slice(0, 8)}
                      </td>
                      {isFinanceExecutive && (
                        <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">
                          {getEmployeeName(adv, directory)}
                        </td>
                      )}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-semibold text-gray-900 truncate">{adv.title || "Cash Advance"}</p>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">{adv.purpose || "—"}</p>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-800 whitespace-nowrap">
                        {formatMoney(adv.amount, adv.currencyCode || "INR")}
                      </td>
                      <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                        <span className={isSettled ? "text-emerald-600" : "text-amber-600"}>
                          {formatMoney(outstanding, adv.currencyCode || "INR")}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${
                            isSettled
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : statusUpper === "SETTLEMENT_PENDING" || statusUpper === "PARTIALLY_SETTLED"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : statusUpper === "APPROVED" || statusUpper === "EXPENSE_VERIFIED"
                              ? "bg-teal-50 text-teal-700 border-teal-200"
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
                          <button
                            onClick={() => navigate(`/expense-management/cash-advance/settlement/${adv.advanceId || adv.id}`)}
                            title="View Details & Lifecycle"
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition flex items-center gap-1"
                          >
                            <Eye size={15} />
                          </button>

                          {canOpenExpenseFor(adv, user) && (
                            <button
                              onClick={() => navigate(`/expense-management/expenses/create?cashAdvanceId=${adv.advanceId || adv.id}`)}
                              title="Create an expense report for this cash advance"
                              className="inline-flex items-center gap-1 rounded-md border border-indigo-200 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50"
                            >
                              <Receipt size={13} /> Cash Advance Expense
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
                              {!isSettled && statusUpper !== "APPROVED" && (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleOpenSettle(adv)}
                                  className="!py-1 !px-2.5 !text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  Settle Advance
                                </Button>
                              )}
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


      {/* Settle Advance Details Modal / Panel */}
      {/* Disbursement Confirmation Modal */}
      {isFinanceExecutive && disbursing && (
        <RecordDisbursementModal
          title="Disburse Cash Advance"
          submitLabel="Confirm Disburse"
          isSubmitting={submitting}
          onCancel={() => setDisbursing(null)}
          onSubmit={handleConfirmDisburse}
          summary={
            <>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-700">
                  You are about to <strong>disburse</strong> cash advance request <strong className="text-blue-900">#{String(disbursing.advanceId || disbursing.id).slice(0, 8)}</strong> for <strong className="text-blue-900">{formatMoney(disbursing.amount, disbursing.currencyCode || "INR")}</strong>.
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs font-medium text-gray-600">Requested Amount:</span>
                  <span className="text-xs font-bold text-gray-900">{formatMoney(disbursing.amount, disbursing.currencyCode || "INR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-medium text-gray-600">Outstanding Balance:</span>
                  <span className="text-xs font-bold text-gray-900">{formatMoney(disbursing.outstandingBalance || disbursing.amount, disbursing.currencyCode || "INR")}</span>
                </div>
              </div>

              <div className="text-xs text-gray-600 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                <p className="font-medium text-amber-900 mb-1">Payment will be initiated to:</p>
                <p className="text-amber-800">{disbursing.employeeName || `Employee ID: ${disbursing.employeeId || disbursing.employee_id}`}</p>
              </div>
            </>
          }
        />
      )}

      <SettlementModal
        isOpen={isFinanceExecutive && !!settlingAdvance}
        advance={toSettlementAdvance(settlingAdvance)}
        onClose={() => setSettlingAdvance(null)}
        onSettled={() => {
          setSettlingAdvance(null);
          fetchSettlementAdvances();
        }}
      />
    </div>
  );
}
