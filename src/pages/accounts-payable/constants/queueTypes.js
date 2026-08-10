import {
  INVOICE_STATUS,
  OCR_REVIEW_QUEUE_STATUSES,
  VALIDATION_QUEUE_STATUSES,
  PAYMENT_QUEUE_STATUSES,
} from "./invoiceStatus";

/**
 * Named invoice work queues. Components/hooks take a QUEUE_TYPES key (e.g. useInvoices(queueType)
 * in Phase 6) instead of hardcoding a status array or a queue label string — the same InvoiceTable
 * is reused across all five queues, parameterized only by which of these it's given.
 */
export const QUEUE_TYPES = {
  OCR_REVIEW: "ocr_review",
  VALIDATION: "validation",
  ALL_INVOICES: "all_invoices",
  READY_FOR_PAYMENT: "ready_for_payment",
  PAID: "paid",
};

/** Status filter applied per queue; null means no filter (every status is shown). */
export const QUEUE_STATUS_FILTERS = {
  [QUEUE_TYPES.OCR_REVIEW]: OCR_REVIEW_QUEUE_STATUSES,
  [QUEUE_TYPES.VALIDATION]: VALIDATION_QUEUE_STATUSES,
  [QUEUE_TYPES.ALL_INVOICES]: null,
  [QUEUE_TYPES.READY_FOR_PAYMENT]: PAYMENT_QUEUE_STATUSES,
  [QUEUE_TYPES.PAID]: [INVOICE_STATUS.PAID],
};

export const QUEUE_LABELS = {
  [QUEUE_TYPES.OCR_REVIEW]: "OCR Review",
  [QUEUE_TYPES.VALIDATION]: "Validation",
  [QUEUE_TYPES.ALL_INVOICES]: "All",
  [QUEUE_TYPES.READY_FOR_PAYMENT]: "Ready for Payment",
  [QUEUE_TYPES.PAID]: "Paid",
};
