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
export const APPROVAL_PERMISSIONS = {
  // Approval Policy configuration (policies, roles/approvers metadata, department approvers) —
  // every route under approval_policy_route.py requires this single permission.
  APPROVAL_POLICY_MANAGE: "APPROVAL_POLICY_MANAGE",

  // Invoice approval workflow actions.
  INVOICE_SEND_FOR_APPROVAL: "INVOICE_SEND_FOR_APPROVAL",
  INVOICE_APPROVAL_VIEW: "INVOICE_APPROVAL_VIEW",
  INVOICE_APPROVE: "INVOICE_APPROVE",
  INVOICE_REJECT: "INVOICE_REJECT",
};

/**
 * GET /invoice/{id}/approval and .../approval/steps accept any one of these three (see
 * invoice_approval_route.py's permission_based_access(["INVOICE_APPROVAL_VIEW", "INVOICE_APPROVE",
 * "INVOICE_REJECT"])) — an approver can see the approval status without a separate view
 * permission. Route-level/visibility use only; do not reuse for an action check.
 */
export const APPROVAL_ANY_VIEW_PERMISSIONS = [
  APPROVAL_PERMISSIONS.INVOICE_APPROVAL_VIEW,
  APPROVAL_PERMISSIONS.INVOICE_APPROVE,
  APPROVAL_PERMISSIONS.INVOICE_REJECT,
];

export default APPROVAL_PERMISSIONS;
