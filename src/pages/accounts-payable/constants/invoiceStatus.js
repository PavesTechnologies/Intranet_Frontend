/**
 * Invoice lifecycle pipeline:
 *   Draft -> OCR Processing -> OCR Review Pending -> Validation Pending -> Pending Approval
 *   -> Approved -> Ready for Payment -> Partially Paid -> Paid
 *
 * OCR Failed / Validation Failed / Rejected / Disputed / Duplicate are branch statuses, not
 * stops on the stepper — they route the invoice back into an earlier queue for correction (see
 * *_REENTRY_QUEUE below) or park it for manual resolution.
 *
 * Validation is a backend processing stage, not a top-level Invoice Management tab — it's
 * surfaced through the Status filter and the invoice detail page's Validation section instead
 * (see VALIDATION_QUEUE_STATUSES and InvoiceValidationPanel).
 */
export const INVOICE_STATUS = {
  // DRAFT: "Draft",
  OCR_PROCESSING: "OCR Processing",
  OCR_REVIEW_PENDING: "OCR Review Pending",
  // OCR_FAILED: "OCR Failed",
  // VALIDATION_PENDING: "Validation Pending",
  // VALIDATION_FAILED: "Validation Failed",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  // READY_FOR_PAYMENT: "Ready for Payment",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  // DISPUTED: "Disputed",
  // DUPLICATE: "Duplicate",
};

export const INVOICE_STATUS_OPTIONS = Object.values(INVOICE_STATUS).map((value) => ({
  value,
  label: value,
}));

/** Ordered stops for InvoicePipelineStepper — deliberately excludes the exception statuses. */
export const INVOICE_PIPELINE_STAGES = [
  INVOICE_STATUS.DRAFT,
  INVOICE_STATUS.OCR_PROCESSING,
  INVOICE_STATUS.OCR_REVIEW_PENDING,
  INVOICE_STATUS.VALIDATION_PENDING,
  INVOICE_STATUS.PENDING_APPROVAL,
  INVOICE_STATUS.APPROVED,
  // INVOICE_STATUS.READY_FOR_PAYMENT,
  INVOICE_STATUS.PARTIALLY_PAID,
  INVOICE_STATUS.PAID,
  INVOICE_STATUS.DISPUTED,
];

/** Which queue a failed/rejected invoice reappears in for correction. */
export const INVOICE_FAILURE_REENTRY_QUEUE = {
  [INVOICE_STATUS.OCR_FAILED]: INVOICE_STATUS.OCR_REVIEW_PENDING,
  [INVOICE_STATUS.VALIDATION_FAILED]: INVOICE_STATUS.VALIDATION_PENDING,
  [INVOICE_STATUS.REJECTED]: INVOICE_STATUS.PENDING_APPROVAL,
};

/** Statuses listed in the OCR Review queue/tab. */
export const OCR_REVIEW_QUEUE_STATUSES = [
  INVOICE_STATUS.OCR_REVIEW_PENDING,
  INVOICE_STATUS.OCR_FAILED,
];

/**
 * Statuses handled by the backend Validation stage. Not a top-level tab — surfaced via the
 * Status filter, the invoice detail page's Validation section, and the standalone Validation
 * Queue utility page (AP_ROUTES.INVOICE_VALIDATION), which remains a valid direct route.
 */
export const VALIDATION_QUEUE_STATUSES = [
  INVOICE_STATUS.VALIDATION_PENDING,
  INVOICE_STATUS.VALIDATION_FAILED,
];

/** Statuses listed in the Invoice Management "Approval" tab — business review, not backend validation. */
export const APPROVAL_QUEUE_STATUSES = [
  INVOICE_STATUS.PENDING_APPROVAL,
  INVOICE_STATUS.REJECTED,
];

/** Statuses listed in the Ready for Payment queue/tab. */
export const PAYMENT_QUEUE_STATUSES = [INVOICE_STATUS.READY_FOR_PAYMENT];

/** Statuses listed in the Paid tab. */
export const PAID_QUEUE_STATUSES = [INVOICE_STATUS.PARTIALLY_PAID, INVOICE_STATUS.PAID];
