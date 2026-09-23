/**
 * Literal UMS permission codes for the invoice TDS (tax deducted at source) determination/
 * verification workflow, exactly as issued on the JWT's `permissions` claim (backend TDS Phase 1
 * routes under /invoice/{id}/tds*). Not a role -> permission map — UMS owns which roles carry
 * which of these; mirrors constants/paymentPermissions.js's pattern exactly.
 */
import { INVOICE_PERMISSIONS } from "./invoicePermissions";

export const TDS_PERMISSIONS = {
  // GET /invoice/{id}/tds — also accepted (any-of) alongside INVOICE_VIEW per the backend contract.
  INVOICE_TDS_VIEW: "INVOICE_TDS_VIEW",
  // POST /invoice/{id}/tds/determine.
  INVOICE_TDS_DETERMINE: "INVOICE_TDS_DETERMINE",
  // PUT /invoice/{id}/tds — correcting the payment nature; the backend recalculates everything else.
  INVOICE_TDS_EDIT: "INVOICE_TDS_EDIT",
  // POST /invoice/{id}/tds/verify.
  INVOICE_TDS_VERIFY: "INVOICE_TDS_VERIFY",
};

/**
 * GET /invoice/{id}/tds accepts either of these (backend contract: "TDS view permissions or
 * INVOICE_VIEW") — every role that can see an invoice at all (Approver included) can also see
 * its TDS determination, same as INVOICE_TDS_VIEW alone would grant a dedicated TDS viewer.
 * Mirrors constants/approvalPermissions.js's APPROVAL_ANY_VIEW_PERMISSIONS pattern exactly.
 */
export const TDS_ANY_VIEW_PERMISSIONS = [TDS_PERMISSIONS.INVOICE_TDS_VIEW, INVOICE_PERMISSIONS.INVOICE_VIEW];

export default TDS_PERMISSIONS;
