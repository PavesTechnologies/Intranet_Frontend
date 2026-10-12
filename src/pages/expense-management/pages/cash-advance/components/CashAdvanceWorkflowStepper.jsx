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
    // APPROVED means Finance approved it but has not yet disbursed it, so stage 3 is the current stage
    case "APPROVED":
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
  const upperStatus = (currentStatus || "").toUpperCase();
  const isRejected = upperStatus === "REJECTED";
  const isCancelled = upperStatus === "CANCELLED";
  const isOverdue = upperStatus === "OVERDUE";

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
        ) : isOverdue ? (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <Clock size={13} /> Overdue
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

      {/* Horizontal pipeline: scrolls sideways on narrow screens instead of wrapping */}
      <div className="overflow-x-auto pb-2">
        <ol className="flex min-w-[880px] items-start">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            const isPassed = !isRejected && !isCancelled && !isOverdue && currentStageIndex > stage.id;
            const isCurrent = !isRejected && !isCancelled && !isOverdue && currentStageIndex === stage.id;
            const isLast = index === STAGES.length - 1;

            let circleStyle = "bg-gray-100 text-gray-400 border-gray-300";
            let connectorStyle = "bg-gray-200";
            let titleStyle = "text-gray-400";
            let badgeText = "Pending";
            let badgeStyle = "bg-gray-100 text-gray-500 border-gray-200";

            if (isPassed) {
              circleStyle = "bg-emerald-600 text-white border-emerald-600";
              connectorStyle = "bg-emerald-500";
              titleStyle = "text-gray-900";
              badgeText = "Completed";
              badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
            } else if (isCurrent) {
              circleStyle = "bg-blue-600 text-white border-blue-600 ring-4 ring-blue-500/20";
              titleStyle = "text-blue-900";
              badgeText = "Active";
              badgeStyle = "bg-blue-600 text-white border-blue-600 animate-pulse";
            }

            return (
              <li key={stage.id} className="relative flex flex-1 flex-col items-center px-2 text-center">
                {/* Connector from this stage's centre to the next stage's centre */}
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className={`absolute left-1/2 top-5 h-0.5 w-full ${connectorStyle}`}
                  />
                )}

                <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 ${circleStyle}`}>
                  {isPassed ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                </div>

                <p className={`mt-2 text-xs font-bold leading-tight ${titleStyle}`}>{stage.title}</p>
                <p className="mt-1 text-[10px] leading-tight text-gray-500">{stage.subtitle}</p>

                <span className={`mt-2 text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeStyle}`}>
                  {badgeText}
                </span>

                {stage.id === 4 && linkedExpenseReport && (
                  <div className="mt-1.5 text-[10px] font-mono text-blue-700 font-semibold truncate max-w-full">
                    Linked: #{String(linkedExpenseReport.reportNumber || linkedExpenseReport.id || "").slice(0, 8)}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
