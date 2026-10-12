/**
 * Literal UMS permission codes for TDS Tracking (Backend/API_Layer/routes/tds_tracking_route.py,
 * mounted at /apm/tds/tracking) — recording TDS deduction / challan deposit / return filing that
 * Finance performed outside this system, plus supporting documents. Distinct from
 * constants/tdsPermissions.js (per-invoice determination/verification) and
 * constants/tdsConfigPermissions.js (rule configuration).
 *
 * Not a role -> permission map — UMS owns which roles carry which of these; mirrors
 * constants/paymentPermissions.js's pattern exactly.
 */
export const TDS_TRACKING_PERMISSIONS = {
  // GET /tds/tracking, GET /tds/tracking/{invoiceId}, metadata, view/download documents.
  TDS_TRACKING_VIEW: "TDS_TRACKING_VIEW",
  // POST .../deduction | .../deposit | .../filing | .../documents (also grants read).
  TDS_TRACKING_UPDATE: "TDS_TRACKING_UPDATE",
};

export const TDS_TRACKING_ANY_VIEW_PERMISSIONS = [
  TDS_TRACKING_PERMISSIONS.TDS_TRACKING_VIEW,
  TDS_TRACKING_PERMISSIONS.TDS_TRACKING_UPDATE,
];

export default TDS_TRACKING_PERMISSIONS;
