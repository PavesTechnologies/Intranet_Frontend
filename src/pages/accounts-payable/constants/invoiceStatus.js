/**
 * Invoice lifecycle pipeline:
 *   Uploaded -> OCR Processing -> OCR Review Pending -> Validation Pending -> Ready for Payment -> Paid
 * OCR Failed / Validation Failed are branch statuses, not stops on the stepper — they route the
 * invoice back into the OCR Review or Validation queue for correction (see *_REENTRY_QUEUE below).
 *
 * NOTE: none of these labels currently match a color-keyword branch in StatusBadge
 * (src/components/status/statusbadge.jsx) — extend it before shipping the invoice UI.
 */
export const INVOICE_STATUS = {
  UPLOADED: "Uploaded",
  OCR_PROCESSING: "OCR Processing",
  OCR_REVIEW_PENDING: "OCR Review Pending",
  OCR_FAILED: "OCR Failed",
  VALIDATION_PENDING: "Validation Pending",
  VALIDATION_FAILED: "Validation Failed",
  READY_FOR_PAYMENT: "Ready for Payment",
  PAID: "Paid",
};

export const INVOICE_STATUS_OPTIONS = Object.values(INVOICE_STATUS).map((value) => ({
  value,
  label: value,
}));

/** Ordered stops for InvoicePipelineStepper — deliberately excludes the two failure statuses. */
export const INVOICE_PIPELINE_STAGES = [
  INVOICE_STATUS.UPLOADED,
  INVOICE_STATUS.OCR_PROCESSING,
  INVOICE_STATUS.OCR_REVIEW_PENDING,
  INVOICE_STATUS.VALIDATION_PENDING,
  INVOICE_STATUS.READY_FOR_PAYMENT,
  INVOICE_STATUS.PAID,
];

/** Which queue a failed invoice reappears in for correction. */
export const INVOICE_FAILURE_REENTRY_QUEUE = {
  [INVOICE_STATUS.OCR_FAILED]: INVOICE_STATUS.OCR_REVIEW_PENDING,
  [INVOICE_STATUS.VALIDATION_FAILED]: INVOICE_STATUS.VALIDATION_PENDING,
};

/** Statuses listed in the OCR Review queue. */
export const OCR_REVIEW_QUEUE_STATUSES = [
  INVOICE_STATUS.OCR_REVIEW_PENDING,
  INVOICE_STATUS.OCR_FAILED,
];

/** Statuses listed in the Validation queue. */
export const VALIDATION_QUEUE_STATUSES = [
  INVOICE_STATUS.VALIDATION_PENDING,
  INVOICE_STATUS.VALIDATION_FAILED,
];

/** Statuses listed in the Ready for Payment queue. */
export const PAYMENT_QUEUE_STATUSES = [INVOICE_STATUS.READY_FOR_PAYMENT];
