/**
 * Literal UMS permission codes for the invoice intake/OCR/view pipeline, exactly as issued on
 * the JWT's `permissions` claim (Backend/API_Layer/routes/invoice_extraction_route.py,
 * invoice_process_route.py, and invoice_details_route.py's permission_based_access checks).
 * These endpoints previously had zero permission gating at all — any authenticated user could
 * upload/extract/correct/create an invoice or list/view any invoice's details.
 *
 * Not a role -> permission map — UMS owns which roles/groups carry which of these ("AP Invoice
 * Intake" = VIEW+CREATE+OCR_REVIEW+SEND_FOR_APPROVAL, "AP Invoice Approver" =
 * VIEW+APPROVAL_VIEW+APPROVE+REJECT+SEND_BACK, "AP Finance" = VIEW+PAYMENT_VIEW+PAYMENT_PROCESS);
 * mirrors constants/approvalPermissions.js's pattern exactly.
 */
export const INVOICE_PERMISSIONS = {
  // GET /invoice/{id}, GET /invoice, GET /invoice/view/{inbound_document_id} — the baseline "can
  // see an invoice at all" permission, common to every AP Invoice group.
  INVOICE_VIEW: "INVOICE_VIEW",
  // The whole pre-persistence intake pipeline: extract-fields, validate-fields, the vendor/
  // buyer/tax/amounts corrections, confirm-section, create-invoice, upload-document,
  // match-vendor, process-invoice.
  INVOICE_CREATE: "INVOICE_CREATE",
  // PATCH .../ocr-review, GET /review-queue.
  INVOICE_OCR_REVIEW: "INVOICE_OCR_REVIEW",
};

export default INVOICE_PERMISSIONS;
