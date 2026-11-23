import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, DollarSign, Send } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { recoveryApi } from "@/pages/expense-management/api/recoveryApi";
import EmployeeLabel from "@/pages/expense-management/approval-engine/components/EmployeeLabel";
import { useAuth } from "@/contexts/AuthContext";
import SettleBalancePanel from "@/pages/expense-management/pages/cash-advance/components/SettleBalancePanel";
import MoneyMovements from "@/pages/expense-management/pages/cash-advance/components/MoneyMovements";
import CashAdvanceWorkflowStepper from "@/pages/expense-management/pages/cash-advance/components/CashAdvanceWorkflowStepper";
import CashAdvanceAdjustmentCard from "@/pages/expense-management/pages/cash-advance/components/CashAdvanceAdjustmentCard";
import CashAdvanceApprovalPanel from "@/pages/expense-management/pages/cash-advance/components/CashAdvanceApprovalPanel";
import DecisionNotice from "@/pages/expense-management/pages/cash-advance/components/DecisionNotice";
import AdvanceMoneySummary from "@/pages/expense-management/pages/cash-advance/components/AdvanceMoneySummary";
import { figuresForAdvance } from "@/pages/expense-management/pages/cash-advance/useAdvanceFigures";
import { canApproveAdvance } from "@/pages/expense-management/approval-engine/components/CashAdvanceApprovalsList";
import {
  formatDate,
  formatMoney,
  formatTripDates,
  getCostCenterValue,
  getStatusBadge,
  hasSubmittedLinkedReport,
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
  const { user, hasRole } = useAuth();

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
  const [loadError, setLoadError] = useState("");
  const [settlement, setSettlement] = useState(null);
  const [utilization, setUtilization] = useState(null);
  // Amount Payroll has actually deducted for this advance, summed for the money-movement cards.
  const [salaryDeducted, setSalaryDeducted] = useState(0);

  useEffect(() => {
    const id = advance?.advanceId || advanceId;
    if (!id) return undefined;
    let cancelled = false;
    Promise.resolve()
      .then(() => recoveryApi.listSalaryDeductions(id))
      .then((list) => {
        const rows = Array.isArray(list) ? list : list?.content ?? [];
        // Only what Payroll confirmed has been deducted. A request that is still waiting for Payroll is not a deduction yet.
        const total = rows
          .filter((r) => r.status === "PAYROLL_CONFIRMED")
          .reduce((sum, r) => sum + Number(r.actualAmountDeducted || 0), 0);
        if (!cancelled) setSalaryDeducted(total);
      })
      .catch(() => {
        if (!cancelled) setSalaryDeducted(0);
      });
    return () => {
      cancelled = true;
    };
  }, [advance?.advanceId, advanceId]);
  const [loading, setLoading] = useState(true);

  const fetchAdvance = useCallback(async () => {
    setLoading(true);

    // Only a failure to load the advance itself means "not found". A failed settlement or utilization call keeps the
    // page open and shows the server's message, so the real cause is visible.
    let response;
    try {
      response = await cashAdvanceApi.getById(advanceId);
    } catch (error) {
      console.error("Failed to load cash advance:", error);
      // Show the server's reason (for example, a permission message) instead of implying the record is missing.
      setLoadError(error.response?.data?.message || "Cash advance not found.");
      setAdvance(null);
      setLoading(false);
      return;
    }

    setLoadError("");
    setAdvance(response?.data?.data ?? response?.data ?? null);

    // Figures load on both the employee and the settlement routes, so the same balance is shown in each.
    {
      try {
        const [settlementResponse, utilizationResponse] = await Promise.all([
          cashAdvanceApi.getSettlement(advanceId),
          cashAdvanceApi.getUtilization(advanceId),
        ]);
        setSettlement(settlementResponse?.data?.data ?? settlementResponse?.data ?? null);
        setUtilization(utilizationResponse?.data?.data ?? utilizationResponse?.data ?? null);
      } catch (error) {
        console.error("Failed to load settlement figures:", error);
        showStatusToast(error.response?.data?.message || "Could not load the settlement figures", "error", 8000);
      }
    }

    setLoading(false);
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
          <p className="text-sm text-gray-700">{loadError || "Cash advance not found."}</p>

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

  const Fact = ({ label, children, wide = false }) => (
    <div className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-[11px] font-medium text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800">{children}</dd>
    </div>
  );

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbs} />

      {/* Header: what this advance is and where it stands */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0A0082]/10 text-[#0A0082]">
            <DollarSign size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {isSettlementView ? "Settlement & Lifecycle" : "Cash Advance"}
            </p>
            <h1 className="truncate text-lg font-bold text-[#0a174e]">{advance.title || "Cash Advance"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {getStatusBadge(advance.status)}
              <span className="font-mono text-[11px] text-gray-400">{formatAdvanceNumber(advance)}</span>
            </div>
          </div>
        </div>

        <Button variant="outline" onClick={() => navigate(backPath)} className="shrink-0 text-xs">
          <ArrowLeft size={13} className="mr-1.5" /> {backLabel}
        </Button>
      </div>

      {closedWithBalance && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            This advance is marked Closed, but {formatMoney(outstanding, currencyCode)} is still
            outstanding. A closed advance should have a zero balance. Check the audit trail before relying on this status.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: details, progress and the actions for this stage */}
        <div className="min-w-0 space-y-4 text-xs lg:col-span-2">
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-[#0a174e]">Details</h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Fact label="Employee">
                <span className="font-semibold"><EmployeeLabel employeeId={advance.employeeId || advance.employee_id} showIdSubtext /></span>
              </Fact>
              <Fact label="Cost center"><span className="font-semibold">{getCostCenterValue(advance)}</span></Fact>
              <Fact label="Trip dates">{formatTripDates(advance)}</Fact>
              <Fact label="Needed by">{formatDate(advance.neededByDate)}</Fact>
              <Fact label="Settlement due">{formatDate(advance.settlementDueDate)}</Fact>
              <Fact label="Report #"><span className="font-mono text-xs text-[#0A0082] break-all">{formatAdvanceNumber(advance)}</span></Fact>
              <Fact label="Purpose / business justification" wide>
                <span className="whitespace-pre-line leading-relaxed">{advance.purpose || "No justification provided."}</span>
              </Fact>
              {advance.notes && (
                <Fact label="Notes & remarks" wide>
                  <span className="text-gray-700">{advance.notes}</span>
                </Fact>
              )}
            </dl>
          </section>

          {/* 7-Stage Workflow Lifecycle Stepper */}
          <CashAdvanceWorkflowStepper
            currentStatus={advance.status}
            linkedExpenseReport={advance.linkedExpenseReport}
          />

          {!isSettlementView && (
            <DecisionNotice
              advance={advance}
              isOwner={!!user?.employeeId && user.employeeId === advance.employeeId}
              onChanged={fetchAdvance}
            />
          )}

          {/* Server-calculated utilization from the linked expense reports (settlement view only; figures are not recalculated here) */}
          {isSettlementView && utilization && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0a174e]">Utilization from expense reports</h4>
                <span className="text-[11px] font-semibold text-gray-600">Closure: {utilization.closureStatus?.replace(/_/g, " ")}</span>
              </div>

              {Number(utilization.reimbursementOwedAmount) > 0 && (
                <p className="text-xs font-semibold text-amber-700">
                  Awaiting employee reimbursement:{" "}
                  {formatMoney(utilization.reimbursementOwedAmount, utilization.currencyCode || currencyCode)}.
                  This advance closes once it is paid.
                </p>
              )}

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
              currencyCode={currencyCode}
              status={advance.status}
              outstandingBalance={outstanding}
              carriedOutAmount={advance.carriedOutAmount ?? 0}
              salaryDeductedAmount={salaryDeducted}
              expenseReport={advance.linkedExpenseReport}
            />
          )}

          {isSettlementView && settlement && (
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#0a174e]">Money movement</h4>
              <MoneyMovements
                settlement={settlement}
                currencyCode={currencyCode}
                advanceId={advance.advanceId || advance.id || advanceId}
                carriedOut={advance.carriedOutAmount ?? 0}
                salaryDeducted={salaryDeducted}
              />
            </section>
          )}

          {canRepay && (
            <SettleBalancePanel
              advanceId={advance.advanceId || advance.id || advanceId}
              advanceNumber={formatAdvanceNumber(advance)}
              outstanding={outstanding}
              currencyCode={currencyCode}
              onSettled={fetchAdvance}
            />
          )}

          {isApprovalView && (
            <CashAdvanceApprovalPanel
              advance={advance}
              canAct={canApproveAdvance(advance, user, hasRole)}
              onChanged={fetchAdvance}
            />
          )}

          {!isApprovalView && !isSettlementView && ["DISBURSED", "IN_PROGRESS", "EXPENSE_SUBMITTED", "EXPENSE_VERIFIED", "SETTLEMENT_PENDING", "PARTIALLY_ADJUSTED", "PARTIALLY_SETTLED"].includes(status) && Number(outstanding) > 0 && (
            <div>
              <Button
                variant="primary"
                onClick={() => navigate(`/expense-management/expenses/create?cashAdvanceId=${advance.advanceId || advance.id}`)}
                disabled={hasSubmittedLinkedReport(advance)}
                title={hasSubmittedLinkedReport(advance) ? "An expense report is already submitted for this advance" : undefined}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Send size={13} className="mr-1.5" /> Stage 4: Submit Linked Expenses
              </Button>
            </div>
          )}
        </div>

        {/* Right: the money, as a short statement */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <AdvanceMoneySummary advance={advance} figures={figuresForAdvance(advance, utilization, salaryDeducted)} />
        </div>
      </div>
    </div>
  );
}
