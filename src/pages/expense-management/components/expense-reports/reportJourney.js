/**
 * Plain-language view of where an expense report is, for the employee who owns it.
 *
 * The backend reportStatus says which stage the report is in; once APPROVED, paymentRoutingStatus /
 * noPaymentDue say what happened to the money. This turns both into one label that says what is
 * actually going on ("Finance is checking it", "Paid to you") and who has to act next.
 */

// The stages a report moves through. `step` on a journey is an index into this list.
export const JOURNEY_STEPS = ["Draft", "Approval", "Finance check", "Payment", "Done"];

// tone -> badge classes
export const TONE_CLASSES = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  action: "border-orange-200 bg-orange-50 text-orange-700",
  payment: "border-indigo-200 bg-indigo-50 text-indigo-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
};

/**
 * Labels for each backend status, used by the status filter. The filter sends the raw status to the
 * server, so APPROVED covers every payment outcome (payment on the way, paid, nothing to pay).
 */
export const STATUS_LABELS = {
  DRAFT: "Draft - not submitted",
  SUBMITTED: "Submitted",
  PENDING_APPROVAL: "Waiting for approval",
  PENDING_FINANCE_VERIFICATION: "Finance is checking it",
  AWAITING_CORRECTION: "Sent back - needs your fix",
  QUERY_RAISED: "Question for you - reply needed",
  POLICY_REJECTED: "Against policy - edit and resubmit",
  APPROVED: "Approved",
  REIMBURSED: "Paid to you",
  REJECTED: "Rejected - closed",
  CANCELLED: "Cancelled by you",
  CLOSED: "Closed",
};

/** Statuses where the report is back with the employee and waiting on them. */
export const NEEDS_EMPLOYEE_ACTION = ["AWAITING_CORRECTION", "QUERY_RAISED", "POLICY_REJECTED"];
/** Statuses where approvers or Finance are working on it. */
export const IN_REVIEW = ["SUBMITTED", "PENDING_APPROVAL", "PENDING_FINANCE_VERIFICATION"];

/**
 * { label, hint, tone, step, stopped }
 *  - label: what is happening, in plain words
 *  - hint:  what happens next / who acts
 *  - step:  index into JOURNEY_STEPS reached so far
 *  - stopped: the report will not move further (rejected / cancelled)
 */
export const reportJourney = (report) => {
  const status = String(report?.reportStatus || "DRAFT").toUpperCase();

  if (status === "APPROVED" || status === "REIMBURSED" || status === "CLOSED") {
    if (status === "REIMBURSED" || report?.paymentRoutingStatus === "PAYMENT_COMPLETED") {
      return { label: "Paid to you", hint: "Reimbursed to your account", tone: "success", step: 4 };
    }
    if (report?.noPaymentDue) {
      return { label: "Settled - nothing to pay", hint: "Covered by your cash advance", tone: "neutral", step: 4 };
    }
    if (report?.paymentRoutingStatus === "APPROVED_FOR_PAYMENT") {
      return { label: "Approved - payment on the way", hint: "Accounts is processing your payment", tone: "payment", step: 3 };
    }
    if (status === "CLOSED") {
      return { label: "Closed", hint: "No further action", tone: "neutral", step: 4 };
    }
    return { label: "Approved", hint: "Waiting to be sent for payment", tone: "success", step: 3 };
  }

  switch (status) {
    case "DRAFT":
      return { label: STATUS_LABELS.DRAFT, hint: "Add your expenses and submit", tone: "neutral", step: 0 };
    case "SUBMITTED":
    case "PENDING_APPROVAL":
      return { label: STATUS_LABELS.PENDING_APPROVAL, hint: "With your approver", tone: "info", step: 1 };
    case "PENDING_FINANCE_VERIFICATION":
      return { label: STATUS_LABELS.PENDING_FINANCE_VERIFICATION, hint: "Approvals done - Finance is verifying", tone: "violet", step: 2 };
    case "AWAITING_CORRECTION":
      return { label: STATUS_LABELS.AWAITING_CORRECTION, hint: "Open it, fix the flagged expenses, resubmit", tone: "action", step: 0 };
    case "QUERY_RAISED":
      return { label: STATUS_LABELS.QUERY_RAISED, hint: "Open it and answer the question", tone: "action", step: 0 };
    case "POLICY_REJECTED":
      return { label: STATUS_LABELS.POLICY_REJECTED, hint: "Fix the policy issues, then resubmit", tone: "action", step: 0 };
    case "REJECTED":
      return { label: STATUS_LABELS.REJECTED, hint: "This report can't be resubmitted", tone: "danger", step: 0, stopped: true };
    case "CANCELLED":
      return { label: STATUS_LABELS.CANCELLED, hint: "No longer in progress", tone: "neutral", step: 0, stopped: true };
    default:
      return { label: status.replace(/_/g, " ").toLowerCase(), hint: "", tone: "neutral", step: 0 };
  }
};
