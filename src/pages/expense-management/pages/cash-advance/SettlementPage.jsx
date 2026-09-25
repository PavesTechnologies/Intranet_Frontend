import React, { useState, useEffect, useMemo } from "react";
import { DollarSign, CheckCircle2, RefreshCw, Eye, CheckCircle, Clock, FileText, AlertCircle, Layers, ArrowUpRight, ArrowDownLeft, CreditCard, XCircle } from "lucide-react";
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

export default function SettlementPage() {
  const { user, hasRole } = useAuth();
  const { data: directory } = useEmployeeDirectory();
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

  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [settlingAdvance, setSettlingAdvance] = useState(null);
  const [settlementAction, setSettlementAction] = useState("SETTLE");
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
      if (statusFilter === "DISBURSED" || statusFilter === "IN_PROGRESS") {
        matchStatus = [
          "DISBURSED", "IN_PROGRESS", "IN PROGRESS",
          "RECONCILIATION_PENDING", "RECONCILIATION PENDING",
          "SUBMITTED_FOR_REVIEW", "SUBMITTED FOR REVIEW", "EXPENSE_SUBMITTED",
          "UNDER_REVIEW", "UNDER REVIEW",
          "APPROVED", "EXPENSE_VERIFIED",
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

  const handleOpenSettle = (adv) => {
    if (!isFinanceExecutive) return;
    setSettlingAdvance(adv);
    setSettlementAction("SETTLE");

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

  const handleConfirmSettlement = async (e) => {
    e.preventDefault();
    if (!settlingAdvance) return;
    const advanceId = settlingAdvance.advanceId || settlingAdvance.id;

    const advAmt = Number(settlingAdvance.amount) || 0;
    const expAmt = Number(
      settlingAdvance.verifiedExpenseAmount ||
      settlingAdvance.expenseAmount ||
      settlingAdvance.totalExpenses ||
      0
    );
    const diff = advAmt - expAmt;
    const currency = settlingAdvance.currencyCode || "INR";

    setSubmitting(true);
    try {
      const actionLabel = settlementAction === "ADJUST" ? "Adjust to next advance" : "Mark as Settled";
      const formattedNotes = [
        settlingAdvance.notes || "",
        `[Settlement Log - ${new Date().toLocaleDateString("en-IN")}]`,
        `Action: ${actionLabel}`,
        `Employee: ${getEmployeeName(settlingAdvance, directory)}`,
        `Advance Amount: ${formatMoney(advAmt, currency)}`,
        `Total Expenses: ${formatMoney(expAmt, currency)}`,
        `Difference: ${formatMoney(Math.abs(diff), currency)} (${diff > 0 ? "Employee to refund" : diff < 0 ? "Company to reimburse" : "Zero balance"})`,
        settlementNotes ? `Remarks: ${settlementNotes}` : "",
      ]
        .filter(Boolean)
        .join("\n")
        .trim();

      const payload = {
        ...settlingAdvance,
        outstandingBalance: 0,
        status: "CLOSED",
        notes: formattedNotes,
      };

      try {
        await cashAdvanceApi.createReimbursementAdjustment({
          cashAdvanceId: advanceId,
          advanceId: advanceId,
          adjustmentAmount: Math.abs(diff),
          amount: Math.abs(diff),
          paymentMethod: settlementAction === "ADJUST" ? "NEXT_ADVANCE_ADJUSTMENT" : "DIRECT_SETTLEMENT",
          referenceNumber: `SETTLE-${Date.now().toString().slice(-6)}`,
          notes: settlementNotes,
        });
      } catch {
        await cashAdvanceApi.update(advanceId, payload);
      }

      showStatusToast(
        `Cash advance #${String(advanceId).slice(0, 8)} successfully settled!`,
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
                            onClick={() => setSelectedAdvance(adv)}
                            title="View Details & Lifecycle"
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition flex items-center gap-1"
                          >
                            <Eye size={15} />
                          </button>

                          {!isSettled && isFinanceExecutive && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleOpenSettle(adv)}
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

      {/* View Details & Lifecycle Stepper Modal */}
      {selectedAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 text-sm">
                Settlement & Lifecycle Details #{String(selectedAdvance.advanceId || selectedAdvance.id).slice(0, 8)}
              </h3>
              <button onClick={() => setSelectedAdvance(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <CheckCircle2 size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Stepper */}
              <CashAdvanceWorkflowStepper
                currentStatus={selectedAdvance.status}
                linkedExpenseReport={selectedAdvance.linkedExpenseReport}
              />

              {/* Stage 6 Adjustment Calculation Card */}
              <CashAdvanceAdjustmentCard
                advanceAmount={selectedAdvance.amount}
                verifiedExpenseAmount={selectedAdvance.verifiedExpenseAmount || selectedAdvance.expenseAmount || selectedAdvance.totalExpenses || 0}
                currencyCode={selectedAdvance.currencyCode || "INR"}
                status={selectedAdvance.status}
              />

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">Title & Business Purpose</p>
                <p className="font-semibold text-gray-900 mt-0.5">{selectedAdvance.title || "—"}</p>
                <p className="text-gray-700 mt-1 whitespace-pre-line">{selectedAdvance.purpose || "—"}</p>
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
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Settlement Audit & Notes History</p>
                  <p className="text-gray-800 mt-1 whitespace-pre-line font-mono text-[11px]">
                    {selectedAdvance.notes}
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedAdvance(null)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Advance Details Modal / Panel */}
      {isFinanceExecutive && settlingAdvance && (() => {
        const advAmt = Number(settlingAdvance.amount) || 0;
        const expAmt = Number(
          settlingAdvance.verifiedExpenseAmount ||
          settlingAdvance.expenseAmount ||
          settlingAdvance.totalExpenses ||
          0
        );
        const diff = advAmt - expAmt;
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
                {/* Settlement Details summary metrics */}
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
                      {diff > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {formatMoney(diff, currency)} <span className="text-[10px] font-normal ml-1">(Employee Repayment Due)</span>
                        </span>
                      ) : diff < 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {formatMoney(Math.abs(diff), currency)} <span className="text-[10px] font-normal ml-1">(Additional Reimbursement Due)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {formatMoney(0, currency)} <span className="text-[10px] font-normal ml-1">(Fully Settled)</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Settlement Action options */}
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
                          {diff > 0
                            ? `(Employee to refund ${formatMoney(diff, currency)})`
                            : diff < 0
                            ? `(Company to reimburse ${formatMoney(Math.abs(diff), currency)})`
                            : "(Zero balance)"}
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

                {/* Remarks field */}
                <div>
                  <FormTextArea
                    label="Remarks"
                    name="settlementNotes"
                    value={settlementNotes}
                    onChange={(e) => setSettlementNotes(e.target.value)}
                    placeholder="Expenses verified. Balance to be refunded."
                    rows={2}
                    className="!text-xs"
                  />
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <Button type="button" variant="outline" onClick={() => setSettlingAdvance(null)} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                    className="text-xs bg-[#0a4b94] hover:bg-blue-800 text-white px-5 font-semibold"
                  >
                    {submitting ? <LoadingSpinner size="sm" className="mr-1.5" /> : "Confirm Settlement"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
