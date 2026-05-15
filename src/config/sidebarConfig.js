/**
 * Canonical role identifiers.
 * hasRole() in AuthContext is case-insensitive (uppercases before comparing),
 * so casing here is for readability only.
 */
export const ROLES = {
  SUPER_ADMIN:       "Super Admin",
  ADMIN:             "Admin",
  HR:                "HR",
  GENERAL:           "General",
  RESOURCE_MANAGER:  "Resource_Manager",
  PROJECT_MANAGER:   "Project_Manager",
  DELIVERY_MANAGER:  "Delivery_Manager",
  REPORTING_MANAGER: "Reporting_Manager",
  EMPLOYEE:          "Employee",
};

const ADMIN_ROLES      = [ROLES.ADMIN, ROLES.SUPER_ADMIN];
const MANAGEMENT_ROLES = [...ADMIN_ROLES, ROLES.HR, ROLES.REPORTING_MANAGER];
const HR_ADMIN         = [ROLES.HR, ...ADMIN_ROLES];
const HR_MANAGEMENT    = [ROLES.HR, ROLES.REPORTING_MANAGER];

/**
 * Employee Onboarding flyout submenu config.
 *
 * allowedRoles: string[]  → item visible only when hasRole(allowedRoles) is true.
 * (omit allowedRoles)     → item visible to every authenticated user.
 *
 * Children are filtered recursively by filterMenuByRole() before rendering,
 * so a parent whose children all become hidden is automatically suppressed.
 */
export const EO_SUBMENU = [
  {
    label: "Onboarding Dashboard",
    to: "/employee-onboarding/onboarding-summary",
    allowedRoles: HR_MANAGEMENT,
    children: [
      { label: "Summary",   to: "/employee-onboarding/onboarding-summary" },
      { label: "Analytics", to: "/employee-onboarding/analytics" },
    ],
  },
  {
    label: "Onboarding Task",
    to: "/employee-onboarding/",
    allowedRoles: MANAGEMENT_ROLES,
    children: [
      { label: "Task Dashboard",   to: "/employee-onboarding" },
      { label: "Create Offer",     to: "/employee-onboarding/create",           allowedRoles: [ROLES.HR] },
      { label: "BulkUpload",       to: "/employee-onboarding/bulk-upload",      allowedRoles: [ROLES.HR] },
      { label: "Add task",         to: "/employee-onboarding/onboarding-task",  allowedRoles: HR_ADMIN },
      { label: "HR Configuration", to: "/employee-onboarding/hr-configuration", allowedRoles: HR_ADMIN },
    ],
  },
  {
    label: "Employee Directory",
    to: "/employee-onboarding/employee-directory",
    // no allowedRoles → visible to all authenticated users
    children: [
      { label: "Employee Directory", to: "/employee-onboarding/employee-directory" },
      { label: "Employee List",      to: "/employee-onboarding/employeelist",       allowedRoles: HR_MANAGEMENT },
      { label: "Organization Tree",  to: "/employee-onboarding/organization-tree" },
    ],
  },
  {
    label: "Employee Verification",
    to: "/employee-onboarding/hr",
    allowedRoles: MANAGEMENT_ROLES,
    children: [
      { label: "Employee Verification",  to: "/employee-onboarding/hr",                         allowedRoles: [ROLES.HR] },
      { label: "Admin Approval Dashboard", to: "/employee-onboarding/admin/approval-dashboard", allowedRoles: MANAGEMENT_ROLES },
      { label: "Employee Credentials",   to: "/employee-onboarding/employee-credentials",       allowedRoles: HR_ADMIN },
    ],
  },
  {
    label: "Employee Documents ",
    to: "/employee-onboarding/employeedocuments",
    allowedRoles: MANAGEMENT_ROLES,
    children: [
      { label: "Employee Documents",      to: "/employee-onboarding/employeedocuments" },
      { label: "Document Template",       to: "/employee-onboarding/documents-template",     allowedRoles: [ROLES.HR] },
      { label: "Organization Documents",  to: "/employee-onboarding/organization-documents", allowedRoles: [ROLES.HR] },
    ],
  },
  {
    label: "Employee Exit Process",
    to: "/employee-exit",
    allowedRoles: MANAGEMENT_ROLES,
  },
];
