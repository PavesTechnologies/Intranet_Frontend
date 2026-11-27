import React from "react";

/**
 * One status vocabulary for every row on My Approvals, whatever the request type. The same stage has the same name
 * and colour for an expense report, a cash advance and a supplementary claim (e.g. "Pending finance" means Finance
 * must act, for all three), so the table reads as one flow. Each list maps its own raw status with the helpers below
 * and renders <ApprovalStatusBadge>; the status filter on the page uses the same keys.
 */
export const APPROVAL_STATUS = {
  DRAFT: { label: "Draft", tone: "border-slate-200 bg-slate-50 text-slate-600", hint: "Not submitted yet" },
  PENDING_MANAGER: { label: "Pending manager", tone: "border-amber-200 bg-amber-50 text-amber-700", hint: "Waiting for the manager's decision" },
  PENDING_COST_CENTER: { label: "Pending cost center", tone: "border-purple-200 bg-purple-50 text-purple-700", hint: "Waiting for the cost center owner" },
  PENDING_FINANCE: { label: "Pending finance", tone: "border-indigo-200 bg-indigo-50 text-indigo-700", hint: "Waiting for Finance to verify" },
  SENT_BACK: { label: "Sent back", tone: "border-orange-200 bg-orange-50 text-orange-700", hint: "Returned to the employee to correct or explain" },
  APPROVED: { label: "Approved", tone: "border-emerald-200 bg-emerald-50 text-emerald-700", hint: "Approved, payment not started yet" },
  AWAITING_PAYMENT: { label: "Awaiting payment", tone: "border-blue-200 bg-blue-50 text-blue-700", hint: "Approved and with AP for payment" },
  PAID: { label: "Paid", tone: "border-teal-200 bg-teal-50 text-teal-700", hint: "Money paid to the employee" },
  IN_PROGRESS: { label: "In progress", tone: "border-sky-200 bg-sky-50 text-sky-700", hint: "Advance paid out; the employee is using it" },
  SETTLEMENT_PENDING: { label: "Settlement pending", tone: "border-yellow-200 bg-yellow-50 text-yellow-800", hint: "Advance balance still to be settled" },
  CLOSED: { label: "Closed", tone: "border-slate-200 bg-slate-100 text-slate-600", hint: "Finished, nothing left to do" },
  REJECTED: { label: "Rejected", tone: "border-rose-200 bg-rose-50 text-rose-700", hint: "Rejected, no payment" },
  CANCELLED: { label: "Cancelled", tone: "border-slate-200 bg-slate-50 text-slate-400", hint: "Withdrawn by the employee" },
};

/** Status filter options, in the order a request moves through them. */
export const APPROVAL_STATUS_OPTIONS = [
  { label: "All statuses", value: "" },
  ...Object.entries(APPROVAL_STATUS).map(([value, s]) => ({ label: s.label, value })),
];

const up = (v) => String(v || "").toUpperCase();

/** Expense report (reportStatus, plus payment routing once approved). */
export function expenseStatusKey(report) {
  const s = up(report?.reportStatus);
  const routing = up(report?.paymentRoutingStatus);
  if (s === "DRAFT") return "DRAFT";
  if (s === "SUBMITTED" || s === "PENDING_APPROVAL") return "PENDING_MANAGER";
  if (s === "PENDING_FINANCE_VERIFICATION") return "PENDING_FINANCE";
  if (["AWAITING_CORRECTION", "QUERY_RAISED", "POLICY_REJECTED"].includes(s)) return "SENT_BACK";
  if (s === "REIMBURSED" || routing === "PAYMENT_COMPLETED") return "PAID";
  if (s === "APPROVED") return routing === "APPROVED_FOR_PAYMENT" ? "AWAITING_PAYMENT" : "APPROVED";
  if (s === "CLOSED") return "CLOSED";
  if (s === "REJECTED") return "REJECTED";
  if (s === "CANCELLED") return "CANCELLED";
  return "PENDING_MANAGER";
}

/** Cash advance (its lifecycle status). */
export function cashStatusKey(status) {
  const s = up(status);
  if (s === "DRAFT") return "DRAFT";
  if (["SUBMITTED", "PENDING", "PENDING_APPROVAL", "PENDING_MANAGER_APPROVAL"].includes(s)) return "PENDING_MANAGER";
  if (s.startsWith("PENDING_COST_CENTER")) return "PENDING_COST_CENTER";
  if (s.startsWith("PENDING_FINANCE")) return "PENDING_FINANCE";
  if (s === "APPROVED") return "APPROVED";
  if (s === "DISBURSED") return "PAID";
  if (["IN_PROGRESS", "PARTIALLY_SETTLED", "PARTIALLY_ADJUSTED", "ADJUSTED", "EXPENSE_SUBMITTED", "EXPENSE_VERIFIED"].includes(s)) return "IN_PROGRESS";
  if (["SETTLEMENT_PENDING", "OVERDUE", "AWAITING_REIMBURSEMENT", "RECONCILIATION_PENDING"].includes(s) || s.startsWith("RECOVERY_")) return "SETTLEMENT_PENDING";
  if (s === "SETTLED" || s === "CLOSED") return "CLOSED";
  if (s === "REJECTED") return "REJECTED";
  if (s === "CANCELLED") return "CANCELLED";
  return "PENDING_MANAGER";
}

/** Supplementary claim (its lifecycle status). */
export function suppStatusKey(status) {
  const s = up(status);
  if (s === "DRAFT") return "DRAFT";
  if (s === "PENDING_MANAGER") return "PENDING_MANAGER";
  if (s === "PENDING_FINANCE") return "PENDING_FINANCE";
  if (s === "CLARIFICATION_REQUIRED") return "SENT_BACK";
  if (s === "MANAGER_REJECTED" || s === "FINANCE_REJECTED") return "REJECTED";
  if (s === "APPROVED") return "APPROVED";
  if (s === "PAYMENT_PENDING") return "AWAITING_PAYMENT";
  if (s === "SETTLED") return "PAID";
  if (s === "CANCELLED") return "CANCELLED";
  return "PENDING_MANAGER";
}

/**
 * One pill for every status: same size, border and casing. `detail` is a short second line for what the status alone
 * does not say (approval level, a policy warning, who asked for a correction).
 */
export function ApprovalStatusBadge({ statusKey, detail, detailTone = "text-slate-400" }) {
  const s = APPROVAL_STATUS[statusKey] || APPROVAL_STATUS.PENDING_MANAGER;
  return (
    <span className="inline-flex flex-col items-start gap-0.5" data-approval-status={statusKey}>
      <span
        title={s.hint}
        className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none ${s.tone}`}
      >
        {s.label}
      </span>
      {detail && <span className={`whitespace-nowrap text-[10.5px] leading-tight ${detailTone}`}>{detail}</span>}
    </span>
  );
}
