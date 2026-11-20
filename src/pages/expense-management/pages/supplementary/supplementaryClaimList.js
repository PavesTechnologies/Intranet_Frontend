import { SUPP_STATUS, SUPP_STATUS_LABEL } from "@/pages/expense-management/api/supplementaryClaimApi";
import { claimActions } from "@/pages/expense-management/pages/supplementary/supplementaryClaimActions";

/**
 * Rules for the My Supplementary Claims list. Pure functions, so the summary, badges, filters and row actions can be
 * tested without rendering. Every value comes from the claims the API returned; nothing here is hardcoded data.
 */

// Badge colour family per status: neutral (not started), info (with someone to act), warning (needs the employee),
// success (approved or paid), danger (rejected), muted (cancelled).
const STATUS_TONE = {
  [SUPP_STATUS.DRAFT]: "neutral",
  [SUPP_STATUS.PENDING_MANAGER]: "info",
  [SUPP_STATUS.PENDING_FINANCE]: "info",
  [SUPP_STATUS.CLARIFICATION_REQUIRED]: "warning",
  [SUPP_STATUS.APPROVED]: "success",
  [SUPP_STATUS.PAYMENT_PENDING]: "success",
  [SUPP_STATUS.SETTLED]: "success",
  [SUPP_STATUS.MANAGER_REJECTED]: "danger",
  [SUPP_STATUS.FINANCE_REJECTED]: "danger",
  [SUPP_STATUS.CANCELLED]: "muted",
};

export const TONE_CLASSES = {
  neutral: "bg-gray-100 text-gray-700 ring-gray-200",
  info: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
  muted: "bg-gray-100 text-gray-500 ring-gray-200",
};

export const statusTone = (status) => STATUS_TONE[status] || "neutral";
export const statusLabel = (status) => SUPP_STATUS_LABEL[status] || status || "—";

/** The five summary cards. Pending Approval counts both manager and Finance review. */
export function summarizeClaims(claims = []) {
  const count = (...statuses) => claims.filter((c) => statuses.includes(c.status)).length;
  return {
    total: claims.length,
    draft: count(SUPP_STATUS.DRAFT),
    pendingApproval: count(SUPP_STATUS.PENDING_MANAGER, SUPP_STATUS.PENDING_FINANCE),
    clarification: count(SUPP_STATUS.CLARIFICATION_REQUIRED),
    settled: count(SUPP_STATUS.SETTLED),
  };
}

/** Payment progress from the API's paymentStatus: NONE until Finance approves, REQUESTED once AP has the payment, PAID after AP confirms. */
export function paymentInfo(claim) {
  if (claim?.paymentStatus === "PAID") {
    return { label: "Paid", tone: "success", reference: claim.paymentReference || "" };
  }
  if (claim?.paymentStatus === "REQUESTED") {
    return { label: "Awaiting payment", tone: "info", reference: "" };
  }
  return { label: "Not started", tone: "muted", reference: "" };
}

/** The status filter's choices, in the order a claim moves through them. */
export const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: SUPP_STATUS.DRAFT, label: statusLabel(SUPP_STATUS.DRAFT) },
  { value: SUPP_STATUS.PENDING_MANAGER, label: statusLabel(SUPP_STATUS.PENDING_MANAGER) },
  { value: SUPP_STATUS.PENDING_FINANCE, label: statusLabel(SUPP_STATUS.PENDING_FINANCE) },
  { value: SUPP_STATUS.CLARIFICATION_REQUIRED, label: statusLabel(SUPP_STATUS.CLARIFICATION_REQUIRED) },
  { value: SUPP_STATUS.APPROVED, label: statusLabel(SUPP_STATUS.APPROVED) },
  { value: SUPP_STATUS.PAYMENT_PENDING, label: statusLabel(SUPP_STATUS.PAYMENT_PENDING) },
  { value: SUPP_STATUS.SETTLED, label: statusLabel(SUPP_STATUS.SETTLED) },
  { value: SUPP_STATUS.MANAGER_REJECTED, label: statusLabel(SUPP_STATUS.MANAGER_REJECTED) },
  { value: SUPP_STATUS.FINANCE_REJECTED, label: statusLabel(SUPP_STATUS.FINANCE_REJECTED) },
  { value: SUPP_STATUS.CANCELLED, label: statusLabel(SUPP_STATUS.CANCELLED) },
];

export const SORT_OPTIONS = [
  { value: "created-desc", label: "Newest first", key: "createdAt", dir: "desc" },
  { value: "created-asc", label: "Oldest first", key: "createdAt", dir: "asc" },
  { value: "amount-desc", label: "Amount: high to low", key: "amount", dir: "desc" },
  { value: "amount-asc", label: "Amount: low to high", key: "amount", dir: "asc" },
];

/**
 * Search matches the claim reference or the original report reference. The API has no filter or paging for this list,
 * so the claims already returned are filtered and sorted here.
 */
export function filterAndSortClaims(claims = [], { search = "", status = "ALL", sort = "created-desc" } = {}) {
  const query = search.trim().toLowerCase();
  const option = SORT_OPTIONS.find((o) => o.value === sort) || SORT_OPTIONS[0];
  const rows = claims.filter((c) => {
    if (status !== "ALL" && c.status !== status) return false;
    if (!query) return true;
    return [c.claimNumber, c.reportNumber].some((v) => String(v || "").toLowerCase().includes(query));
  });
  const keyOf = option.key === "amount"
    ? (c) => Number(c.totalAmount || 0)
    : (c) => new Date(c.createdAt || 0).getTime();
  const direction = option.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => (keyOf(a) - keyOf(b)) * direction);
}

/**
 * Row actions. Edit and Cancel come from the same rules the claim detail page uses, which the backend also enforces:
 * - View: every claim on the list belongs to the signed-in employee.
 * - Edit: Draft and Clarification Required only. Editing happens on the claim page.
 * - Cancel: Draft, Pending Manager and Clarification Required only.
 */
export function claimRowActions(claim) {
  const actions = claimActions(claim, "employee");
  return { canView: true, canEdit: actions.canEditItems, canCancel: actions.canCancel };
}

const ALLOWED = Object.freeze({ allowed: true, reason: "" });
const blocked = (reason) => ({ allowed: false, reason });

/**
 * Every action the employee can take on a claim, each with whether it is allowed now and, when it is not, why.
 * The screens show all of them and disable the ones that are not allowed, so the reason is always visible.
 */
export function employeeActionStates(claim) {
  const actions = claimActions(claim, "employee");
  const status = claim?.status;
  const items = Array.isArray(claim?.items) ? claim.items : [];
  const withoutReceipt = items.some((i) => !Array.isArray(i.receipts) || i.receipts.length === 0);

  const acknowledge = actions.canAcknowledge
    ? ALLOWED
    : blocked(status === "DRAFT" ? "Nothing to acknowledge on this claim." : "Only a Draft that Finance created needs acknowledging.");

  let submit = ALLOWED;
  if (!actions.canSubmit) {
    if (status !== SUPP_STATUS.DRAFT) submit = blocked("Only a Draft can be submitted.");
    else if (items.length === 0) submit = blocked("Add at least one expense first.");
    else if (withoutReceipt) submit = blocked("Every expense needs a receipt before you submit.");
    else submit = blocked("Acknowledge this claim before you submit it.");
  }

  let resubmit = ALLOWED;
  if (!actions.canResubmit) {
    resubmit = status === SUPP_STATUS.CLARIFICATION_REQUIRED
      ? blocked("Every expense needs a receipt before you resubmit.")
      : blocked("Only a claim that needs clarification can be resubmitted.");
  }

  const cancel = actions.canCancel
    ? ALLOWED
    : blocked("Cancel is available only while the claim is a Draft, waiting for your manager, or needs clarification.");

  const editExpenses = actions.canEditItems
    ? ALLOWED
    : blocked("Expenses can be changed only while the claim is a Draft or needs clarification.");

  return { acknowledge, submit, resubmit, cancel, editExpenses };
}

/** Row actions on the My Claims list: View is always allowed; Edit and Cancel follow the same rules as the claim page. */
export function listRowActionStates(claim) {
  const states = employeeActionStates(claim);
  return {
    view: ALLOWED,
    edit: states.editExpenses.allowed
      ? ALLOWED
      : blocked("Edit is available only for a Draft or a claim that needs clarification."),
    cancel: states.cancel,
  };
}
