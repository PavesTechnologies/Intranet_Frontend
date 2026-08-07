import { INVOICE_ACTIONS } from "./invoiceActions";

/**
 * Named activity/audit events recorded across the AP module — powers the dashboard's
 * RecentActivityFeed (types/dashboard.js: ActivityFeedItem) and any future audit trail.
 *
 * Where an event corresponds 1:1 to a user-initiated invoice action, its value IS the
 * matching INVOICE_ACTIONS value (not a redefinition) — logging that action already tells
 * you the event. The remaining entries cover vendor lifecycle events and the two
 * system-driven OCR outcomes, neither of which INVOICE_ACTIONS models.
 */
export const AUDIT_EVENTS = {
  VENDOR_ONBOARDED: "vendor_onboarded",
  VENDOR_UPDATED: "vendor_updated",
  VENDOR_DEACTIVATED: "vendor_deactivated",

  INVOICE_UPLOADED: INVOICE_ACTIONS.UPLOAD,
  INVOICE_OCR_COMPLETED: "invoice_ocr_completed", // system-driven, not a user action
  INVOICE_OCR_FAILED: "invoice_ocr_failed", // system-driven, not a user action
  INVOICE_OCR_CORRECTED: INVOICE_ACTIONS.SAVE_OCR_CORRECTIONS,
  INVOICE_VALIDATED: INVOICE_ACTIONS.VALIDATE,
  INVOICE_VALIDATION_REJECTED: INVOICE_ACTIONS.REJECT_VALIDATION,

  PAYMENT_MARKED_PAID: INVOICE_ACTIONS.MARK_PAID,
};

export const AUDIT_EVENT_LABELS = {
  [AUDIT_EVENTS.VENDOR_ONBOARDED]: "Vendor onboarded",
  [AUDIT_EVENTS.VENDOR_UPDATED]: "Vendor details updated",
  [AUDIT_EVENTS.VENDOR_DEACTIVATED]: "Vendor deactivated",
  [AUDIT_EVENTS.INVOICE_UPLOADED]: "Invoice uploaded",
  [AUDIT_EVENTS.INVOICE_OCR_COMPLETED]: "OCR processing completed",
  [AUDIT_EVENTS.INVOICE_OCR_FAILED]: "OCR processing failed",
  [AUDIT_EVENTS.INVOICE_OCR_CORRECTED]: "OCR fields corrected",
  [AUDIT_EVENTS.INVOICE_VALIDATED]: "Invoice validated",
  [AUDIT_EVENTS.INVOICE_VALIDATION_REJECTED]: "Invoice validation rejected",
  [AUDIT_EVENTS.PAYMENT_MARKED_PAID]: "Marked as paid",
};
