import {
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
  ALL_INVOICES: "all_invoices",
  READY_FOR_PAYMENT: "ready_for_payment",
  PAID: "paid",
};

/** Status filter applied per queue; null means no filter (every status is shown). */
export const QUEUE_STATUS_FILTERS = {
  [QUEUE_TYPES.OCR_REVIEW]: OCR_REVIEW_QUEUE_STATUSES,
  [QUEUE_TYPES.VALIDATION]: VALIDATION_QUEUE_STATUSES,
  [QUEUE_TYPES.APPROVAL]: APPROVAL_QUEUE_STATUSES,
  [QUEUE_TYPES.ALL_INVOICES]: null,
  [QUEUE_TYPES.READY_FOR_PAYMENT]: PAYMENT_QUEUE_STATUSES,
  [QUEUE_TYPES.PAID]: PAID_QUEUE_STATUSES,
};

export const QUEUE_LABELS = {
  [QUEUE_TYPES.OCR_REVIEW]: "OCR Review",
  [QUEUE_TYPES.VALIDATION]: "Validation",
  [QUEUE_TYPES.APPROVAL]: "Approval",
  [QUEUE_TYPES.ALL_INVOICES]: "All",
  [QUEUE_TYPES.READY_FOR_PAYMENT]: "Ready for Payment",
  [QUEUE_TYPES.PAID]: "Paid",
};
