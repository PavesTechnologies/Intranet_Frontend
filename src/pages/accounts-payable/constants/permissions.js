import { AP_VENDOR_MANAGER_ROLES, AP_ALL_ROLES } from "./apRoles";

/**
 * Named AP permissions still authorized by a frontend role -> permission map — just the
 * dashboard and vendor management capabilities now. Invoice intake/OCR/view, invoice approval,
 * payment, and procurement are all authorized by real UMS JWT permission codes instead (see
 * constants/invoicePermissions.js, approvalPermissions.js, paymentPermissions.js,
 * procurementPermissions.js, read via hasPermission()) — not a frontend role -> permission map.
 * See useApPermissions.js.
 */
export const AP_PERMISSIONS = {
  VIEW_DASHBOARD: "view_dashboard",
  ONBOARD_VENDOR: "onboard_vendor",
  EDIT_VENDOR: "edit_vendor",
  VIEW_VENDOR: "view_vendor",
};

export const AP_PERMISSION_ROLES = {
  [AP_PERMISSIONS.VIEW_DASHBOARD]: AP_ALL_ROLES,
  [AP_PERMISSIONS.ONBOARD_VENDOR]: AP_VENDOR_MANAGER_ROLES,
  [AP_PERMISSIONS.EDIT_VENDOR]: AP_VENDOR_MANAGER_ROLES,
  [AP_PERMISSIONS.VIEW_VENDOR]: AP_ALL_ROLES,
};

/** @returns {string[]} allowed roles for a permission, or [] if the key is unrecognized. */
export function rolesForPermission(permission) {
  return AP_PERMISSION_ROLES[permission] ?? [];
}
