/**
 * Literal UMS permission codes for the TDS Configuration backend (Rules / Nature of Payment /
 * Deductor / Excel Import), distinct from constants/tdsPermissions.js (the per-invoice TDS
 * determination/verification feature — a different domain, different routes). Not a role ->
 * permission map — UMS owns which roles carry which of these; mirrors
 * constants/paymentPermissions.js's pattern exactly.
 *
 * Per the backend integration spec: holding the Finance_Executive role is necessary but not
 * sufficient — these are the actual JWT permission codes the backend enforces, and the frontend
 * must gate each action on the specific one, not just on role. See useApPermissions.js.
 */
export const TDS_CONFIG_PERMISSIONS = {
  TDS_CONFIG_VIEW: "TDS_CONFIG_VIEW",
  TDS_CONFIG_CREATE: "TDS_CONFIG_CREATE",
  TDS_CONFIG_EDIT: "TDS_CONFIG_EDIT",
  TDS_CONFIG_DELETE: "TDS_CONFIG_DELETE",
  TDS_CONFIG_IMPORT: "TDS_CONFIG_IMPORT",
};

export default TDS_CONFIG_PERMISSIONS;
