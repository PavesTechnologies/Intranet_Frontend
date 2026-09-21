/**
 * Literal UMS permission codes for the payment lifecycle, exactly as issued on the JWT's
 * `permissions` claim (Backend/API_Layer/routes/payment_route.py's permission_based_access
 * checks). Payment routes previously had zero permission gating at all — any authenticated
 * user could create/list/update payments — these two are the first ones added there.
 *
 * Not a role -> permission map — UMS owns which roles carry which of these; mirrors
 * constants/approvalPermissions.js's pattern exactly.
 */
export const PAYMENT_PERMISSIONS = {
  // GET /payment, GET /payment/{id} — also accepted (any-of) by GET /invoice/{id}/history.
  PAYMENT_VIEW: "PAYMENT_VIEW",
  // POST /payment (create), PATCH /payment/{id}/status, POST /invoice/{id}/ready-for-payment.
  PAYMENT_PROCESS: "PAYMENT_PROCESS",
};

export default PAYMENT_PERMISSIONS;
