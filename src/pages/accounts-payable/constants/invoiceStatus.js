/**
 * Invoice lifecycle statuses — exact `status_code` values from the backend's status_master
 * (module_name = INVOICE), per the verified AP backend contract. Do not add statuses beyond this
 * list without confirming them against status_master first: OCR_PROCESSING, VALIDATION_PENDING,
 * VALIDATION_FAILED and DUPLICATE were previously assumed here but are not real invoice
 * statuses and have been removed.
 *
 * RETURNED_FOR_REVIEW, READY_FOR_PAYMENT and DISPUTED were added by
 * Data_Access_Layer/migration_invoice_return_and_ready_for_payment.sql — READY_FOR_PAYMENT is
 * now a real status (an explicit Finance action, APPROVED -> READY_FOR_PAYMENT via
 * PaymentService.mark_ready_for_payment), no longer the "every Approved invoice" UI-level
 * grouping this file used to describe. There is no standalone backend invoice status for
 * validation either — extract-fields/validate-fields run as a job during upload (see
 * InvoiceUploadPage), before an invoice is ever persisted, and that job's stage results aren't
 * retained on the invoice record afterward (see VALIDATION_QUEUE_STATUSES below).
 *
 * OCR_REVIEWED was added by migration_add_ocr_reviewed_status.sql — "reviewed and saved, not yet
 * sent", distinct from PENDING_APPROVAL ("sent, awaiting a decision"). apply_ocr_review always
 * ends here now; send_for_approval is what performs OCR_REVIEWED -> PENDING_APPROVAL. Before
 * this, both states shared PENDING_APPROVAL with no way to tell them apart from status alone.
 */
export const INVOICE_STATUS = {
  DRAFT: "Draft",
  OCR_REVIEW_PENDING: "OCR Review Pending",
  OCR_FAILED: "OCR Failed",
  OCR_REVIEWED: "OCR Reviewed",
  PENDING_APPROVAL: "Pending Approval",
  RETURNED_FOR_REVIEW: "Returned for Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  READY_FOR_PAYMENT: "Ready for Payment",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  DISPUTED: "Disputed",
};

export const INVOICE_STATUS_OPTIONS = Object.values(INVOICE_STATUS).map((value) => ({
  value,
  label: value,
}));

/** Ordered stops for InvoicePipelineStepper — deliberately excludes the exception/branch
 * statuses (OCR_FAILED, RETURNED_FOR_REVIEW, REJECTED, DISPUTED — spec section 1). */
export const INVOICE_PIPELINE_STAGES = [
  INVOICE_STATUS.DRAFT,
  INVOICE_STATUS.OCR_REVIEW_PENDING,
  INVOICE_STATUS.OCR_REVIEWED,
  INVOICE_STATUS.PENDING_APPROVAL,
  INVOICE_STATUS.APPROVED,
  INVOICE_STATUS.READY_FOR_PAYMENT,
  INVOICE_STATUS.PARTIALLY_PAID,
  INVOICE_STATUS.PAID,
];

/** Which queue a failed/rejected/returned invoice reappears in for correction. */
export const INVOICE_FAILURE_REENTRY_QUEUE = {
  [INVOICE_STATUS.OCR_FAILED]: INVOICE_STATUS.OCR_REVIEW_PENDING,
  [INVOICE_STATUS.REJECTED]: INVOICE_STATUS.PENDING_APPROVAL,
  [INVOICE_STATUS.RETURNED_FOR_REVIEW]: INVOICE_STATUS.PENDING_APPROVAL,
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

/**
 * Statuses listed in the Invoice Management "Approval" tab — business review, not backend
 * validation. Includes OCR_REVIEWED (reviewed, waiting on the AP Executive to actually send it)
 * alongside the states that follow sending it.
 */
export const APPROVAL_QUEUE_STATUSES = [
  INVOICE_STATUS.OCR_REVIEWED,
  INVOICE_STATUS.PENDING_APPROVAL,
  INVOICE_STATUS.RETURNED_FOR_REVIEW,
  INVOICE_STATUS.REJECTED,
];

/**
 * Real backend status now (was previously a client-side "every Approved invoice" grouping —
 * see the file header note). An invoice sits here only after Finance explicitly marks it ready
 * (PaymentService.mark_ready_for_payment); a merely-Approved invoice is not payable yet.
 */
export const PAYMENT_QUEUE_STATUSES = [INVOICE_STATUS.READY_FOR_PAYMENT];

/** Statuses listed in the Paid tab. */
export const PAID_QUEUE_STATUSES = [INVOICE_STATUS.PARTIALLY_PAID, INVOICE_STATUS.PAID];

/** AP Executive's default landing filter — invoices that need their attention right now. */
export const AP_EXECUTIVE_DEFAULT_STATUSES = [
  INVOICE_STATUS.OCR_REVIEW_PENDING,
  INVOICE_STATUS.OCR_FAILED,
  INVOICE_STATUS.OCR_REVIEWED,
  INVOICE_STATUS.RETURNED_FOR_REVIEW,
];

/** Finance Executive's default landing filter — the payment-readiness/execution pipeline. */
export const FINANCE_DEFAULT_STATUSES = [
  INVOICE_STATUS.APPROVED,
  INVOICE_STATUS.READY_FOR_PAYMENT,
  INVOICE_STATUS.PARTIALLY_PAID,
  INVOICE_STATUS.PAID,
];
