import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, DollarSign, Send } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import EmployeeLabel from "@/pages/expense-management/approval-engine/components/EmployeeLabel";
import { useAuth } from "@/contexts/AuthContext";
import { validateRepaymentAmount } from "@/pages/expense-management/pages/cash-advance/repaymentValidation";
import CashAdvanceWorkflowStepper from "@/pages/expense-management/pages/cash-advance/components/CashAdvanceWorkflowStepper";
import CashAdvanceAdjustmentCard from "@/pages/expense-management/pages/cash-advance/components/CashAdvanceAdjustmentCard";
import {
  formatDate,
  formatMoney,
  getCostCenterValue,
  getStatusBadge,
} from "@/pages/expense-management/pages/cash-advance/cashAdvanceDisplay";

const APPROVALS_PATH = "/expense-management/approvals";
const MY_ADVANCES_PATH = "/expense-management/cash-advance/my";
const SETTLEMENT_PATH = "/expense-management/cash-advance/settlement";

// Same report number format the approvals list shows (ADV-<advance id>)
const formatAdvanceNumber = (adv) => {
  const raw = adv?.advanceId || adv?.id || "";
  const str = String(raw).toUpperCase();
  if (!str) return "ADV-—";
  return str.startsWith("ADV-") ? str : `ADV-${str}`;
};

// One page serves three views, chosen by the URL:
//   employee   /cash-advance/my/...          (My Advances)
//   approver   /approvals/cash-advance/...   (Approvals)
//   settlement /cash-advance/settlement/...  (Settlement)
export default function CashAdvanceDetailPage() {
  const { advanceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasRole } = useAuth();

  const isApprovalView = location.pathname.startsWith(APPROVALS_PATH);
  const isSettlementView = location.pathname.startsWith(SETTLEMENT_PATH);

  const backPath = isApprovalView ? APPROVALS_PATH : isSettlementView ? SETTLEMENT_PATH : MY_ADVANCES_PATH;
  const backLabel = isApprovalView
    ? "Back to Approvals"
    : isSettlementView
      ? "Back to Settlement"
      : "Back to My Advances";

  const parentCrumb = isApprovalView
    ? { label: "Approvals", to: APPROVALS_PATH }
    : isSettlementView
      ? { label: "Settlement", to: SETTLEMENT_PATH }
      : { label: "Cash Advance", to: MY_ADVANCES_PATH };

  const breadcrumbs = [
    {
      label: "Expense Management",
      to: "/expense-management/dashboard",
    },
    parentCrumb,
    { label: "Details" },
  ];

  const [advance, setAdvance] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [utilization, setUtilization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [repayment, setRepayment] = useState({ amount: "", paymentMethod: "BANK_TRANSFER", paymentReference: "", notes: "" });
  const [repayError, setRepayError] = useState("");
  const [repaying, setRepaying] = useState(false);

  const fetchAdvance = useCallback(async () => {
    setLoading(true);

    try {
      const response = await cashAdvanceApi.getById(advanceId);

      setAdvance(response?.data?.data ?? response?.data ?? null);

      // The settlement figures (verified expenses, repaid, outstanding) come from the settlement endpoint
      if (isSettlementView) {
        const [settlementResponse, utilizationResponse] = await Promise.all([
          cashAdvanceApi.getSettlement(advanceId),
          cashAdvanceApi.getUtilization(advanceId),
        ]);
        setSettlement(settlementResponse?.data?.data ?? settlementResponse?.data ?? null);
        setUtilization(utilizationResponse?.data?.data ?? utilizationResponse?.data ?? null);
      }
    } catch (error) {
      console.error("Failed to load cash advance:", error);

      setAdvance(null);
    } finally {
      setLoading(false);
    }
  }, [advanceId, isSettlementView]);

  useEffect(() => {
    fetchAdvance();
  }, [fetchAdvance]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (!advance) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={breadcrumbs} />

        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-gray-700">Cash advance not found.</p>

          <Button variant="outline" onClick={() => navigate(backPath)} className="mt-4 text-xs">
            {backLabel}
          </Button>
        </div>
      </div>
    );
  }

  const status = (advance.status || "").toUpperCase();

  // Settlement figures: prefer the settlement endpoint, fall back to the advance itself
  const verifiedExpenses = settlement?.totalAdjustedAmount ?? advance.verifiedExpenseAmount ?? 0;
  const outstanding = settlement?.outstandingBalance ?? advance.outstandingBalance ?? 0;
  const closedWithBalance = status === "CLOSED" && Number(outstanding) > 0;

  // Statuses in which the backend accepts a repayment (matches CashAdvanceServiceImpl.repay)
  const repayableStatuses = [
    "DISBURSED", "IN_PROGRESS", "RECONCILIATION_PENDING", "SUBMITTED_FOR_REVIEW", "UNDER_REVIEW", "APPROVED",
    "SETTLEMENT_PENDING", "EXPENSE_SUBMITTED", "EXPENSE_VERIFIED", "ADJUSTED", "PARTIALLY_SETTLED",
    "PARTIALLY_ADJUSTED", "OVERDUE",
  ];
  // Repayments are recorded by Finance (the backend enforces the same rule)
  const canRecordRepayment = hasRole(["Finance", "FINANCE", "FINANCE_EXECUTIVE", "Admin", "ADMIN"]);
  const canRepay =
    isSettlementView && canRecordRepayment && repayableStatuses.includes(status) && Number(outstanding) > 0;
  const currencyCode = advance.currencyCode || "INR";

  // Checked before the request is sent. The backend checks again and is the authority.
  const validateRepayment = () =>
    validateRepaymentAmount(repayment.amount, outstanding, (n) => formatMoney(n, currencyCode));

  const handleRepay = async (e) => {
    e.preventDefault();
    const message = validateRepayment();
    if (message) {
      setRepayError(message);
      return;
    }
    setRepayError("");
    setRepaying(true);
    try {
      await cashAdvanceApi.repay(advance.advanceId || advance.id || advanceId, {
        amount: Number(repayment.amount),
        paymentMethod: repayment.paymentMethod,
        paymentReference: repayment.paymentReference || null,
        notes: repayment.notes || null,
      });
      showStatusToast("Repayment recorded", "success");
      setRepayment({ amount: "", paymentMethod: "BANK_TRANSFER", paymentReference: "", notes: "" });
      fetchAdvance();
    } catch (err) {
      const message = err.response?.data?.message || "Failed to record repayment";
      setRepayError(message);
      showStatusToast(message, "error");
    } finally {
      setRepaying(false);
    }
  };

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbs} />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-600" />

          <h1 className="text-lg font-bold text-gray-900">
            {isSettlementView ? "Settlement & Lifecycle" : "Cash Advance Lifecycle"} {formatAdvanceNumber(advance)}
          </h1>
        </div>

        <Button variant="outline" onClick={() => navigate(backPath)} className="text-xs">
          <ArrowLeft size={13} className="mr-1.5" /> {backLabel}
        </Button>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 text-xs shadow-sm">
        {closedWithBalance && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>
              This advance is marked Closed, but {formatMoney(outstanding, advance.currencyCode || "INR")} is still
              outstanding. A closed advance should have a zero balance. Check the audit trail before relying on this status.
            </p>
          </div>
        )}

        {/* 7-Stage Workflow Lifecycle Stepper */}
        <CashAdvanceWorkflowStepper
          currentStatus={advance.status}
          linkedExpenseReport={advance.linkedExpenseReport}
        />

        <div className="flex items-center justify-between bg-blue-50/50 p-3 rounded-lg border border-blue-100">
          <div>
            <p className="text-[10px] font-semibold uppercase text-blue-600">
              {isApprovalView ? "Requested Amount" : "Advance Disbursed Amount"}
            </p>
            <p className="text-lg font-bold text-blue-900 mt-0.5">
              {formatMoney(advance.amount, advance.currencyCode || "INR")}
            </p>
          </div>
          <div>{getStatusBadge(advance.status)}</div>
        </div>


        {/* Settlement breakdown (settlement view only) */}
        {isSettlementView && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Disbursed", formatMoney(advance.amount, advance.currencyCode || "INR"), "text-gray-900"],
              ["Verified Expenses", formatMoney(verifiedExpenses, advance.currencyCode || "INR"), "text-blue-700"],
              ["Repaid by Employee", formatMoney(settlement?.totalRepaidAmount ?? 0, advance.currencyCode || "INR"), "text-emerald-700"],
              ["Outstanding Balance", formatMoney(outstanding, advance.currencyCode || "INR"), Number(outstanding) > 0 ? "text-amber-700" : "text-gray-900"],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
                <p className={`mt-1 text-sm font-bold ${tone}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Server-calculated utilization from the linked expense reports (settlement view only; figures are not recalculated here) */}
        {isSettlementView && utilization && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0a174e]">Utilization from expense reports</h4>
              <span className="text-[11px] font-semibold text-gray-600">Closure: {utilization.closureStatus?.replace(/_/g, " ")}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Claimed", utilization.claimedAmount],
                ["Approved", utilization.approvedAmount],
                ["Returned", utilization.returnedAmount],
                ["Pending review", utilization.pendingReviewAmount],
                ["Submitted (reserved)", utilization.submittedReservationAmount],
                ["Approved utilization", utilization.approvedUtilization],
                ["Repaid (confirmed)", utilization.totalRepaidAmount],
                ["Outstanding", utilization.outstandingBalance],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">{formatMoney(value ?? 0, utilization.currencyCode || advance.currencyCode || "INR")}</p>
                </div>
              ))}
            </div>

            {!utilization.balanceConsistent && (
              <p className="text-xs font-semibold text-rose-700">
                Stored outstanding balance does not match the ledger. Check the adjustments and repayments before closing.
              </p>
            )}

            {utilization.linkedReports?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-1.5 pr-4 font-semibold">Report</th>
                      <th className="py-1.5 pr-4 font-semibold">Status</th>
                      <th className="py-1.5 pr-4 font-semibold text-right">Claimed</th>
                      <th className="py-1.5 font-semibold text-right">Reserved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utilization.linkedReports.map((r) => (
                      <tr key={r.reportId} className="border-t border-gray-100">
                        <td className="py-1.5 pr-4 font-mono">{r.reportNumber}</td>
                        <td className="py-1.5 pr-4">{r.reportStatus?.replace(/_/g, " ")}</td>
                        <td className="py-1.5 pr-4 text-right">{formatMoney(r.claimedAmount ?? 0, utilization.currencyCode || "INR")}</td>
                        <td className="py-1.5 text-right">{formatMoney(r.reservedAmount ?? 0, utilization.currencyCode || "INR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {utilization.categories?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-1.5 pr-4 font-semibold">Category</th>
                      <th className="py-1.5 pr-4 font-semibold text-right">Lines</th>
                      <th className="py-1.5 pr-4 font-semibold text-right">Claimed</th>
                      <th className="py-1.5 pr-4 font-semibold text-right">Approved</th>
                      <th className="py-1.5 pr-4 font-semibold text-right">Returned</th>
                      <th className="py-1.5 font-semibold text-right">Missing receipts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utilization.categories.map((c) => (
                      <tr key={c.categoryId ?? c.categoryName} className="border-t border-gray-100">
                        <td className="py-1.5 pr-4">{c.categoryName}</td>
                        <td className="py-1.5 pr-4 text-right">{c.lineCount}</td>
                        <td className="py-1.5 pr-4 text-right">{formatMoney(c.claimedAmount ?? 0, utilization.currencyCode || "INR")}</td>
                        <td className="py-1.5 pr-4 text-right">{formatMoney(c.approvedAmount ?? 0, utilization.currencyCode || "INR")}</td>
                        <td className="py-1.5 pr-4 text-right">{formatMoney(c.returnedAmount ?? 0, utilization.currencyCode || "INR")}</td>
                        <td className={`py-1.5 text-right ${c.missingReceiptCount > 0 ? "font-semibold text-rose-700" : ""}`}>{c.missingReceiptCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Stage 6 Adjustment Card */}
        {["DISBURSED", "EXPENSE_SUBMITTED", "EXPENSE_VERIFIED", "PARTIALLY_ADJUSTED", "ADJUSTED", "SETTLED", "SETTLEMENT_PENDING", "CLOSED"].includes(status) && (
          <CashAdvanceAdjustmentCard
            advanceAmount={advance.amount}
            verifiedExpenseAmount={verifiedExpenses}
            currencyCode={advance.currencyCode || "INR"}
            status={advance.status}
            outstandingBalance={outstanding}
            expenseReport={advance.linkedExpenseReport}
            onApplyOffset={async ({ expenseReportId, offsetAmount }) => {
              if (!expenseReportId) {
                showStatusToast("No linked expense report is available for the advance offset.", "error");
                return;
              }
              const maxOffset = Math.min(
                Number(outstanding) || 0,
                Number(advance.linkedExpenseReport?.reimbursableTotal ?? advance.linkedExpenseReport?.totalAmount ?? 0) || 0
              );
              if (offsetAmount <= 0 || offsetAmount > maxOffset) {
                showStatusToast("Offset amount cannot exceed the verified expense amount or outstanding advance balance.", "error");
                return;
              }
              await cashAdvanceApi.applyAdvanceOffset(expenseReportId, {
                cashAdvanceId: advance.advanceId || advance.id,
                advanceId: advance.advanceId || advance.id,
                offsetAmount,
              });
              showStatusToast("Advance offset applied successfully.", "success");
              fetchAdvance();
            }}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Employee</p>
            <p className="font-semibold text-gray-800 mt-0.5">
              <EmployeeLabel employeeId={advance.employeeId || advance.employee_id} showIdSubtext />
            </p>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Report #</p>
            <p className="font-mono font-medium text-blue-700 mt-0.5">{formatAdvanceNumber(advance)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Title</p>
            <p className="font-semibold text-gray-800 mt-0.5">{advance.title || "Cash Advance"}</p>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Cost Center</p>
            <p className="font-semibold text-gray-800 mt-0.5">{getCostCenterValue(advance)}</p>
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase">Purpose / Business Justification</p>
          <p className="text-gray-800 mt-1 leading-relaxed whitespace-pre-line">
            {advance.purpose || "No justification provided."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Needed By Date</p>
            <p className="font-medium text-gray-800 mt-0.5">{formatDate(advance.neededByDate)}</p>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Settlement Due Date</p>
            <p className="font-medium text-gray-800 mt-0.5">{formatDate(advance.settlementDueDate)}</p>
          </div>
        </div>

        {canRepay && (
          <form onSubmit={handleRepay} className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Record employee repayment</p>
              <p className="text-[11px] text-gray-600">
                Outstanding: {formatMoney(outstanding, currencyCode)}. The advance closes when the balance reaches zero.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-gray-500">Amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={repayment.amount}
                  disabled={repaying}
                  onChange={(e) => setRepayment({ ...repayment, amount: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-gray-500">Payment method</span>
                <select
                  value={repayment.paymentMethod}
                  disabled={repaying}
                  onChange={(e) => setRepayment({ ...repayment, paymentMethod: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  {["BANK_TRANSFER", "CASH", "UPI", "CHEQUE"].map((m) => (
                    <option key={m} value={m}>{m.replace("_", " ")}</option>
                  ))}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-[10px] font-semibold uppercase text-gray-500">Payment reference</span>
                <input
                  type="text"
                  maxLength={255}
                  value={repayment.paymentReference}
                  disabled={repaying}
                  onChange={(e) => setRepayment({ ...repayment, paymentReference: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-rose-700" role="alert">{repayError}</p>
              <Button type="submit" variant="success" disabled={repaying} loading={repaying}>
                Record repayment
              </Button>
            </div>
          </form>
        )}

        {advance.notes && (
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Notes & Remarks</p>
            <p className="text-gray-700 mt-1">{advance.notes}</p>
          </div>
        )}

        {!isApprovalView && !isSettlementView && ["DISBURSED", "IN_PROGRESS", "EXPENSE_SUBMITTED", "EXPENSE_VERIFIED", "SETTLEMENT_PENDING", "PARTIALLY_ADJUSTED", "PARTIALLY_SETTLED"].includes(status) && Number(outstanding) > 0 && (
          <div className="pt-2">
            <Button
              variant="primary"
              onClick={() => navigate(`/expense-management/expenses/create?cashAdvanceId=${advance.advanceId || advance.id}`)}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Send size={13} className="mr-1.5" /> Stage 4: Submit Linked Expenses
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
