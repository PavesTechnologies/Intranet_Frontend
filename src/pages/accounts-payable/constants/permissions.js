import { AP_VENDOR_MANAGER_ROLES, AP_ALL_ROLES, AP_ROLES } from "./apRoles";

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
  // System Configuration's base tabs (Fiscal Years, Tax & Compliance, Status Master,
  // Departments & Categories) and the new TDS Configuration tab are role-exclusive, not just
  // role-broadened — Admin never sees TDS Configuration, Finance_Executive never sees the base
  // tabs. Approval Policies/Department Approvers are unaffected — they keep their own
  // APPROVAL_POLICY_MANAGE gate, independent of role, so the SYSTEM_CONFIG route itself stays
  // open to AP_ALL_ROLES (narrowing it would lock out an Approval-Policy-permission holder who
  // isn't Admin/Finance_Executive) — see SystemConfigurationPage.jsx.
  MANAGE_SYSTEM_CONFIG: "manage_system_config",
  MANAGE_TDS_CONFIG: "manage_tds_config",
};

export const AP_PERMISSION_ROLES = {
  [AP_PERMISSIONS.VIEW_DASHBOARD]: AP_ALL_ROLES,
  [AP_PERMISSIONS.ONBOARD_VENDOR]: AP_VENDOR_MANAGER_ROLES,
  [AP_PERMISSIONS.EDIT_VENDOR]: AP_VENDOR_MANAGER_ROLES,
  [AP_PERMISSIONS.VIEW_VENDOR]: AP_ALL_ROLES,
  [AP_PERMISSIONS.MANAGE_SYSTEM_CONFIG]: [AP_ROLES.ADMIN],
  [AP_PERMISSIONS.MANAGE_TDS_CONFIG]: [AP_ROLES.FINANCE_EXECUTIVE],
};

/** @returns {string[]} allowed roles for a permission, or [] if the key is unrecognized. */
export function rolesForPermission(permission) {
  return AP_PERMISSION_ROLES[permission] ?? [];
}
