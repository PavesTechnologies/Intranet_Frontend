/**
 * Invoice lifecycle statuses — exact `status_code` values from the backend's status_master
 * (module_name = INVOICE), per the verified AP backend contract. Do not add statuses beyond this
 * list without confirming them against status_master first: OCR_PROCESSING, VALIDATION_PENDING,
 * VALIDATION_FAILED, READY_FOR_PAYMENT and DUPLICATE were previously assumed here but are not
 * real invoice statuses and have been removed.
 *
 * "Ready for payment" is a UI-level grouping over APPROVED invoices with an outstanding balance
 * (see PAYMENT_QUEUE_STATUSES below), not a status of its own. There is no standalone backend
 * validation stage either — validate-fields runs only inline during upload, before an invoice is
 * ever persisted (see VALIDATION_QUEUE_STATUSES below).
 */
export const INVOICE_STATUS = {
  DRAFT: "Draft",
  OCR_REVIEW_PENDING: "OCR Review Pending",
  OCR_FAILED: "OCR Failed",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  DISPUTED: "Disputed",
};

export const INVOICE_STATUS_OPTIONS = Object.values(INVOICE_STATUS).map((value) => ({
  value,
  label: value,
}));

/**
 * Numeric status_master ids for the INVOICE module, for use with
 * PUT /apm/invoice/status-update/{invoice_id}?status_id={status_id}. Only the id actually
 * confirmed against a working call is captured here — don't add more from guesswork.
 */
export const INVOICE_STATUS_ID = {
  PENDING_APPROVAL: 8,
};

/** Ordered stops for InvoicePipelineStepper — deliberately excludes the exception statuses. */
export const INVOICE_PIPELINE_STAGES = [
  INVOICE_STATUS.DRAFT,
  INVOICE_STATUS.OCR_REVIEW_PENDING,
  INVOICE_STATUS.PENDING_APPROVAL,
  INVOICE_STATUS.APPROVED,
  INVOICE_STATUS.PARTIALLY_PAID,
  INVOICE_STATUS.PAID,
];

/** Which queue a failed/rejected invoice reappears in for correction. */
export const INVOICE_FAILURE_REENTRY_QUEUE = {
  [INVOICE_STATUS.OCR_FAILED]: INVOICE_STATUS.OCR_REVIEW_PENDING,
  [INVOICE_STATUS.REJECTED]: INVOICE_STATUS.PENDING_APPROVAL,
};

/** Statuses listed in the OCR Review queue/tab. */
export const OCR_REVIEW_QUEUE_STATUSES = [
  INVOICE_STATUS.OCR_REVIEW_PENDING,
  INVOICE_STATUS.OCR_FAILED,
];

/**
 * No standalone validation status exists on the backend, so this stays an explicit empty list
 * rather than being deleted — the Validation Queue page/tab keeps compiling and correctly shows
 * "nothing here" instead of accidentally matching every invoice. See the AP Integration Ledger
 * for the full gap; this is a backend-dependent screen, not a bug to fix client-side.
 */
export const VALIDATION_QUEUE_STATUSES = [];

/** Statuses listed in the Invoice Management "Approval" tab — business review, not backend validation. */
export const APPROVAL_QUEUE_STATUSES = [
  INVOICE_STATUS.PENDING_APPROVAL,
  INVOICE_STATUS.REJECTED,
];

/**
 * "Ready for payment" isn't a distinct backend status — every Approved invoice with an
 * outstanding balance qualifies. Filtering to APPROVED here is that UI-level grouping, not a
 * status rename.
 */
export const PAYMENT_QUEUE_STATUSES = [INVOICE_STATUS.APPROVED];

/** Statuses listed in the Paid tab. */
export const PAID_QUEUE_STATUSES = [INVOICE_STATUS.PARTIALLY_PAID, INVOICE_STATUS.PAID];
