import React from "react";
import {
  FileText,
  UserCheck,
  CreditCard,
  Send,
  CheckCheck,
  Calculator,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

/**
 * 7-Stage Cash Advance Lifecycle Stepper
 * Stage 1: Employee Creates Request (REQUESTED)
 * Stage 2: Manager Reviews Request (APPROVED / REJECTED)
 * Stage 3: Finance Processes Approved Request (DISBURSED)
 * Stage 4: Employee Submits Expense Report (EXPENSE SUBMITTED)
 * Stage 5: Manager & Finance Approve Expenses (EXPENSE VERIFIED)
 * Stage 6: Backend Calculates Advance Adjustment (ADJUSTED / PARTIALLY ADJUSTED)
 * Stage 7: Complete Settlement & Closure (SETTLED)
 */

const STAGES = [
  {
    id: 1,
    title: "1. Advance Request",
    subtitle: "Employee creates cash advance request",
    icon: FileText,
    badgeKey: "REQUESTED",
  },
  {
    id: 2,
    title: "2. Manager & Finance Review",
    subtitle: "Approvers verify request & policy",
    icon: UserCheck,
    badgeKey: "APPROVED",
  },
  {
    id: 3,
    title: "3. Disbursement & In Progress",
    subtitle: "Finance disburses funds to employee",
    icon: CreditCard,
    badgeKey: "IN_PROGRESS",
  },
  {
    id: 4,
    title: "4. Reconciliation Pending",
    subtitle: "Employee links expenses & receipts",
    icon: Send,
    badgeKey: "RECONCILIATION_PENDING",
  },
  {
    id: 5,
    title: "5. Expense Review",
    subtitle: "Expense report submitted & under review",
    icon: CheckCheck,
    badgeKey: "SUBMITTED_FOR_REVIEW",
  },
  {
    id: 6,
    title: "6. Expense Approval & Settlement Pending",
    subtitle: "Expenses approved, net balance calculated",
    icon: Calculator,
    badgeKey: "SETTLEMENT_PENDING",
  },
  {
    id: 7,
    title: "7. Settlement & Closure",
    subtitle: "Repayment / Reimbursement zero-balance closure",
    icon: CheckCircle2,
    badgeKey: "CLOSED",
  },
];

export const getStageIndex = (statusStr) => {
  const upper = (statusStr || "").toUpperCase().trim();
  switch (upper) {
    case "DRAFT":
    case "SUBMITTED":
    case "REQUESTED":
    case "PENDING":
    case "PENDING_APPROVAL":
    case "PENDING_MANAGER_APPROVAL":
    case "PENDING_COST_CENTER_APPROVAL":
    case "PENDING_COST_CENTER":
    case "PENDING_FINANCE_APPROVAL":
    case "PENDING_FINANCE":
      return 1;
    case "APPROVED_REQUEST":
      return 2;
    case "DISBURSED":
    case "IN_PROGRESS":
    case "IN PROGRESS":
    case "PROCESSING":
      return 3;
    case "RECONCILIATION_PENDING":
    case "RECONCILIATION PENDING":
      return 4;
    case "SUBMITTED_FOR_REVIEW":
    case "SUBMITTED FOR REVIEW":
    case "EXPENSE_SUBMITTED":
    case "EXPENSE SUBMITTED":
    case "UNDER_REVIEW":
    case "UNDER REVIEW":
      return 5;
    case "APPROVED":
    case "EXPENSE_VERIFIED":
    case "EXPENSE VERIFIED":
    case "SETTLEMENT_PENDING":
    case "SETTLEMENT PENDING":
    case "PARTIALLY_SETTLED":
    case "PARTIALLY_ADJUSTED":
    case "PARTIALLY ADJUSTED":
    case "ADJUSTED":
      return 6;
    case "SETTLED":
    case "CLOSED":
      return 7;
    case "REJECTED":
    case "CANCELLED":
      return -1;
    default:
      return 3;
  }
};

export default function CashAdvanceWorkflowStepper({ currentStatus, linkedExpenseReport = null, className = "" }) {
  const currentStageIndex = getStageIndex(currentStatus);
  const isRejected = (currentStatus || "").toUpperCase() === "REJECTED";
  const isCancelled = (currentStatus || "").toUpperCase() === "CANCELLED";

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
        <div>
          <h4 className="text-xs font-bold text-[#0a174e] uppercase tracking-wider">
            Cash Advance Workflow Lifecycle (Stages 1–7)
          </h4>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Track progress from initial request through multi-level expense verification and zero-balance settlement.
          </p>
        </div>
        {isRejected ? (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <XCircle size={13} /> Rejected
          </span>
        ) : isCancelled ? (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
            <XCircle size={13} /> Cancelled
          </span>
        ) : (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <Clock size={13} /> Stage {currentStageIndex} of 7
          </span>
        )}
      </div>

      {/* Grid Stepper */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-7">
        {STAGES.map((stage) => {
          const Icon = stage.icon;
          const isPassed = !isRejected && !isCancelled && currentStageIndex > stage.id;
          const isCurrent = !isRejected && !isCancelled && currentStageIndex === stage.id;

          let cardStyle = "border-gray-200 bg-gray-50/70 text-gray-400";
          let iconBg = "bg-gray-200 text-gray-500";
          let badgeText = "Pending";
          let badgeStyle = "bg-gray-100 text-gray-500 border-gray-200";

          if (isPassed) {
            cardStyle = "border-emerald-200 bg-emerald-50/40 text-emerald-950";
            iconBg = "bg-emerald-600 text-white";
            badgeText = "Completed";
            badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
          } else if (isCurrent) {
            cardStyle = "border-blue-400 bg-blue-50/60 text-blue-950 ring-2 ring-blue-500/20";
            iconBg = "bg-blue-600 text-white";
            badgeText = "Active";
            badgeStyle = "bg-blue-600 text-white border-blue-600 animate-pulse";
          }

          return (
            <div
              key={stage.id}
              className={`relative flex flex-col justify-between rounded-lg border p-2.5 transition-all ${cardStyle}`}
            >
              <div className="flex items-start justify-between gap-1.5 mb-2">
                <div className={`p-1.5 rounded-md text-xs ${iconBg}`}>
                  <Icon size={14} />
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeStyle}`}>
                  {badgeText}
                </span>
              </div>

              <div>
                <p className="text-xs font-bold leading-tight">{stage.title}</p>
                <p className="text-[10px] leading-tight text-gray-500 mt-1 line-clamp-2">{stage.subtitle}</p>
              </div>

              {stage.id === 4 && linkedExpenseReport && (
                <div className="mt-2 pt-1.5 border-t border-gray-200/60 text-[10px] font-mono text-blue-700 font-semibold truncate">
                  Linked: #{String(linkedExpenseReport.reportNumber || linkedExpenseReport.id || "").slice(0, 8)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
