/**
 * Literal UMS permission codes for the configurable Invoice Approval Workflow, exactly as
 * issued on the JWT's `permissions` claim (Backend/API_Layer/routes/approval_policy_route.py
 * and invoice_approval_route.py's permission_based_access checks).
 *
 * This is NOT a role -> permission map — UMS owns which roles carry which of these; the
 * frontend never encodes that relationship. It exists only so call sites pass around one
 * named constant instead of a repeated magic string, e.g.
 * hasPermission(APPROVAL_PERMISSIONS.INVOICE_APPROVE). Mirrors
 * constants/procurementPermissions.js's pattern exactly.
 */
import { PAYMENT_PERMISSIONS } from "./paymentPermissions";
import { INVOICE_PERMISSIONS } from "./invoicePermissions";

export const APPROVAL_PERMISSIONS = {
  // Approval Policy configuration (policies, roles/approvers metadata, department approvers) —
  // every route under approval_policy_route.py requires this single permission.
  APPROVAL_POLICY_MANAGE: "APPROVAL_POLICY_MANAGE",

  // Invoice approval workflow actions.
  INVOICE_SEND_FOR_APPROVAL: "INVOICE_SEND_FOR_APPROVAL",
  INVOICE_APPROVAL_VIEW: "INVOICE_APPROVAL_VIEW",
  INVOICE_APPROVE: "INVOICE_APPROVE",
  INVOICE_REJECT: "INVOICE_REJECT",
  // POST /invoice/{id}/send-back — distinct from INVOICE_REJECT (Send Back returns the invoice
  // for correction/resubmission, Reject is terminal).
  INVOICE_SEND_BACK: "INVOICE_SEND_BACK",
};

/**
 * GET /invoice/{id}/approval and .../approval/steps accept any of these (see
 * invoice_approval_route.py's _APPROVAL_VIEW_PERMISSIONS) — viewing the approval status/timeline
 * is broader than deciding on it: an AP Executive tracking what they submitted and a Finance
 * user checking why an invoice isn't Approved yet both need read access here too, which
 * INVOICE_VIEW alone already covers (every AP Invoice group carries it). Route-level/visibility
 * use only; do not reuse for an action check.
 */
export const APPROVAL_ANY_VIEW_PERMISSIONS = [
  INVOICE_PERMISSIONS.INVOICE_VIEW,
  APPROVAL_PERMISSIONS.INVOICE_APPROVAL_VIEW,
  APPROVAL_PERMISSIONS.INVOICE_APPROVE,
  APPROVAL_PERMISSIONS.INVOICE_REJECT,
];

/**
 * GET /invoice/{id}/history accepts any of these (plus INVOICE_VIEW/PAYMENT_VIEW — see
 * constants/invoicePermissions.js and constants/paymentPermissions.js) — mirrors
 * invoice_details_route.py's _HISTORY_VIEW_PERMISSIONS exactly.
 */
export const INVOICE_HISTORY_VIEW_PERMISSIONS = [
  INVOICE_PERMISSIONS.INVOICE_VIEW,
  APPROVAL_PERMISSIONS.INVOICE_APPROVAL_VIEW,
  APPROVAL_PERMISSIONS.INVOICE_SEND_FOR_APPROVAL,
  APPROVAL_PERMISSIONS.INVOICE_APPROVE,
  APPROVAL_PERMISSIONS.INVOICE_REJECT,
  PAYMENT_PERMISSIONS.PAYMENT_VIEW,
];

export default APPROVAL_PERMISSIONS;
