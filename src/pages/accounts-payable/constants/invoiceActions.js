import { INVOICE_STATUS } from "./invoiceStatus";

/**
 * Named user-initiated actions on an invoice, one per manual pipeline transition (see
 * invoiceStatus.js). useInvoiceMutations.js (Phase 6) keys its mutations off these instead of
 * hardcoding action strings, so a transition is defined in exactly one place.
 *
 * OCR success/failure itself is system-driven (the async OCR job), not a user action, so it
 * has no entry here — see auditEvents.js for those system-driven event labels instead.
 */
export const INVOICE_ACTIONS = {
  UPLOAD: "upload_invoice",
  SAVE_OCR_CORRECTIONS: "save_ocr_corrections",
  RESUBMIT_OCR: "resubmit_ocr",
  VALIDATE: "validate_invoice",
  REJECT_VALIDATION: "reject_validation",
  APPROVE_INVOICE: "approve_invoice",
  REJECT_INVOICE: "reject_invoice",
  MARK_PAID: "mark_paid",
};

/**
 * The invoice status each action transitions *to* on success — drives optimistic UI updates.
 *
 * High OCR confidence or a clean validation pass never resolves to APPROVED/READY_FOR_PAYMENT
 * directly — VALIDATE only ever lands an invoice in PENDING_APPROVAL. Reaching APPROVED requires
 * the separate, human APPROVE_INVOICE action (see InvoiceApprovalPanel) regardless of how
 * confident OCR/validation was.
 */
export const INVOICE_ACTION_RESULT_STATUS = {
  [INVOICE_ACTIONS.UPLOAD]: INVOICE_STATUS.OCR_PROCESSING,
  [INVOICE_ACTIONS.SAVE_OCR_CORRECTIONS]: INVOICE_STATUS.VALIDATION_PENDING,
  [INVOICE_ACTIONS.RESUBMIT_OCR]: INVOICE_STATUS.OCR_PROCESSING,
  [INVOICE_ACTIONS.VALIDATE]: INVOICE_STATUS.PENDING_APPROVAL,
  [INVOICE_ACTIONS.REJECT_VALIDATION]: INVOICE_STATUS.VALIDATION_FAILED,
  [INVOICE_ACTIONS.APPROVE_INVOICE]: INVOICE_STATUS.READY_FOR_PAYMENT,
  [INVOICE_ACTIONS.REJECT_INVOICE]: INVOICE_STATUS.REJECTED,
  [INVOICE_ACTIONS.MARK_PAID]: INVOICE_STATUS.PAID,
};
