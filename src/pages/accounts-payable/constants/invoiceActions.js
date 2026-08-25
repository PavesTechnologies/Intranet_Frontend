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
 * Only actions with a real backend endpoint and a confirmed resulting status are listed.
 * RESUBMIT_OCR, VALIDATE and REJECT_VALIDATION are deliberately absent: they have no
 * corresponding backend endpoint at all (see the AP Integration Ledger) — inventing a target
 * status for them would fabricate a transition the backend doesn't perform. SAVE_OCR_CORRECTIONS
 * only reaches PENDING_APPROVAL for Path A items (invoice already exists) — see
 * useSaveOcrReviewMutation.
 */
export const INVOICE_ACTION_RESULT_STATUS = {
  [INVOICE_ACTIONS.UPLOAD]: INVOICE_STATUS.OCR_REVIEW_PENDING,
  [INVOICE_ACTIONS.SAVE_OCR_CORRECTIONS]: INVOICE_STATUS.PENDING_APPROVAL,
  [INVOICE_ACTIONS.APPROVE_INVOICE]: INVOICE_STATUS.APPROVED,
  [INVOICE_ACTIONS.REJECT_INVOICE]: INVOICE_STATUS.REJECTED,
  [INVOICE_ACTIONS.MARK_PAID]: INVOICE_STATUS.PAID,
};
