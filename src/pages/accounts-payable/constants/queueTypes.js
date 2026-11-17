import {
  INVOICE_STATUS,
  OCR_REVIEW_QUEUE_STATUSES,
  VALIDATION_QUEUE_STATUSES,
  APPROVAL_QUEUE_STATUSES,
  PAYMENT_QUEUE_STATUSES,
  PAID_QUEUE_STATUSES,
} from "./invoiceStatus";

/**
 * Named invoice work queues. Components/hooks take a QUEUE_TYPES key instead of hardcoding a
 * status array or a queue label string — the same InvoiceTable is reused across every queue,
 * parameterized only by which of these it's given.
 *
 * VALIDATION stays defined (and still backs the standalone Validation Queue page at
 * AP_ROUTES.INVOICE_VALIDATION) but is intentionally excluded from InvoiceStatusTabs' TAB_ORDER —
 * Validation is a backend processing stage, not an Invoice Management tab.
 */
export const QUEUE_TYPES = {
  OCR_REVIEW: "ocr_review",
  VALIDATION: "validation",
  APPROVAL: "approval",
  // Finance's TDS verification worklist: Approved invoices, shown with their TDS determination
  // status. Same invoice set as APPROVED, but its own tab so verifying TDS is a visible step.
  TDS_STATUS: "tds_status",
  ALL_INVOICES: "all_invoices",
  APPROVED: "approved",
  READY_FOR_PAYMENT: "ready_for_payment",
  PAID: "paid",
};

/** Status filter applied per queue; null means no filter (every status is shown). */
export const QUEUE_STATUS_FILTERS = {
  [QUEUE_TYPES.OCR_REVIEW]: OCR_REVIEW_QUEUE_STATUSES,
  [QUEUE_TYPES.VALIDATION]: VALIDATION_QUEUE_STATUSES,
  [QUEUE_TYPES.APPROVAL]: APPROVAL_QUEUE_STATUSES,
  [QUEUE_TYPES.TDS_STATUS]: [INVOICE_STATUS.APPROVED],
  [QUEUE_TYPES.ALL_INVOICES]: null,
  [QUEUE_TYPES.APPROVED]: [INVOICE_STATUS.APPROVED],
  [QUEUE_TYPES.READY_FOR_PAYMENT]: PAYMENT_QUEUE_STATUSES,
  [QUEUE_TYPES.PAID]: PAID_QUEUE_STATUSES,
};

export const QUEUE_LABELS = {
  [QUEUE_TYPES.OCR_REVIEW]: "To review",
  [QUEUE_TYPES.VALIDATION]: "Validation",
  [QUEUE_TYPES.APPROVAL]: "Approval",
  [QUEUE_TYPES.TDS_STATUS]: "TDS Status",
  [QUEUE_TYPES.ALL_INVOICES]: "All",
  [QUEUE_TYPES.APPROVED]: "Approved",
  [QUEUE_TYPES.READY_FOR_PAYMENT]: "Ready for Payment",
  [QUEUE_TYPES.PAID]: "Paid",
};

/**
 * Which Invoice Management tab each capability unlocks — permission-driven, not role-driven, so
 * a pure Approver or Finance user (holding none of Admin/AP_Executive/Finance_Executive) sees
 * exactly the tabs their UMS permissions imply. "Approved" is common to every AP invoice group
 * (they all carry INVOICE_VIEW), so it's always shown once the page itself was reachable at all.
 *
 * @param {ReturnType<typeof import("../hooks/useApPermissions").useApPermissions>} permissions
 * @returns {string[]} QUEUE_TYPES values, in InvoiceStatusTabs' display order
 */
export function getVisibleQueueTypes(permissions) {
  const { canUploadInvoice, canReviewOcr, canViewInvoiceApproval, canApproveInvoice, canRejectInvoice, canSendBackInvoice, canSendForApproval, canMarkPaid, canViewPayment, canVerifyTds } = permissions;

  const canSeeAll = canUploadInvoice || canReviewOcr;
  const canSeeApproval = canViewInvoiceApproval || canApproveInvoice || canRejectInvoice || canSendBackInvoice || canSendForApproval;
  const canSeePayment = canMarkPaid || canViewPayment;

  return [
    canSeeAll && QUEUE_TYPES.ALL_INVOICES,
    canReviewOcr && QUEUE_TYPES.OCR_REVIEW,
    // TDS verification is Finance's step (INVOICE_TDS_VERIFY) — shown before Approval.
    canVerifyTds && QUEUE_TYPES.TDS_STATUS,
    canSeeApproval && QUEUE_TYPES.APPROVAL,
    QUEUE_TYPES.APPROVED,
    canSeePayment && QUEUE_TYPES.READY_FOR_PAYMENT,
    canSeePayment && QUEUE_TYPES.PAID,
  ].filter(Boolean);
}
