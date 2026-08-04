// RBAC temporarily disabled for AP module development — restore this import to re-enable AP role checks
// import { AP_ALL_ROLES, AP_APPROVER_PLUS_ROLES, AP_ROLES } from "../pages/accounts-payable/constants/apRoles";

/**
 * Canonical role identifiers.
 * hasRole() in AuthContext is case-insensitive (uppercases before comparing),
 * so casing here is for readability only.
 */
export const ROLES = {
  SUPER_ADMIN:       "Super_Admin",
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
    label: "Insights & Analytics",
    to: "/employee-onboarding/onboarding-summary",
    allowedRoles: HR_MANAGEMENT,
    children: [
      { label: "Executive Summary",   to: "/employee-onboarding/onboarding-summary" },
      { label: "Operational Metrics", to: "/employee-onboarding/analytics" },
    ],
  },
  {
    label: "Onboarding Management",
    to: "/employee-onboarding/",
    allowedRoles: MANAGEMENT_ROLES,
    children: [
      { label: "Workflow Overview",   to: "/employee-onboarding" },
      { label: "Admin Dashboard",   to: "/employee-onboarding/admin/offer-letters", allowedRoles: ADMIN_ROLES },
      { label: "Offer Management",     to: "/employee-onboarding/create",           allowedRoles: [ROLES.HR] },
      { label: "Data Import",       to: "/employee-onboarding/bulk-upload",      allowedRoles: [ROLES.HR] },
      { label: "Task Configuration",         to: "/employee-onboarding/onboarding-task",  allowedRoles: HR_ADMIN },
      { label: "System Settings", to: "/employee-onboarding/hr-configuration", allowedRoles: HR_ADMIN },
    ],
  },
  {
    label: "Employee Directory",
    to: "/employee-onboarding/employee-directory",
    // no allowedRoles → visible to all authenticated users
    children: [
      { label: "Employee Directory", to: "/employee-onboarding/employee-directory" },
      { label: "Member Records",      to: "/employee-onboarding/employeelist",       allowedRoles: HR_MANAGEMENT },
      // { label: "Org Chart",  to: "/employee-onboarding/organization-tree" },
    ],
  },
   {
    label: "Document Center ",
    to: "/employee-onboarding/employeedocuments",
    allowedRoles: MANAGEMENT_ROLES,
    children: [
      { label: "Personal Files",      to: "/employee-onboarding/employeedocuments" },
      { label: "e-Form Template",       to: "/employee-onboarding/documents-template",     allowedRoles: [ROLES.HR] },
      // { label: "Corporate Policies",  to: "/employee-onboarding/organization-documents", allowedRoles: [ROLES.HR] },
    ],
  },
  {
    label: "Workforce Reports ",
    to: "/employee-onboarding/weekly-joining-report-dashboard",
    allowedRoles: MANAGEMENT_ROLES,
    // children: [
    //   { label: "Reporting Dashboard",      to: "/employee-onboarding/weekly-joining-report-dashboard" },
    // ],
  },
  {
    label: "Compliance & Verification",
    to: "/employee-onboarding/hr",
    allowedRoles: MANAGEMENT_ROLES,
    children: [
      { label: "Internal Audit",  to: "/employee-onboarding/hr",                         allowedRoles: [ROLES.HR] },
      { label: "BGC Screening", to: "/employee-onboarding/backgroundcheck", allowedRoles: MANAGEMENT_ROLES },
      { label: "Profile Hub",   to: "employee-onboarding/core-employee",       allowedRoles: HR_ADMIN },
    ],
  },
  {
    label: "Manage Skill Taxonomy",
    to: "/employee-onboarding/manage-skill-taxonomy",
    allowedRoles: ADMIN_ROLES,
    children: [
      { label: "Skill Taxonomy", to: "/employee-onboarding/manage-skill-taxonomy", allowedRoles: ADMIN_ROLES },
      { label: "Requests",       to: "/employee-onboarding/manage-skill-taxonomy/requests", allowedRoles: ADMIN_ROLES },
      { label: "Certificates",   to: "/employee-onboarding/manage-skill-taxonomy/certificates", allowedRoles: ADMIN_ROLES },
    ],
  },
  // {
  //   label: "Off-Boarding",
  //   to: "/employee-exit",
  //   allowedRoles: MANAGEMENT_ROLES,
  // },
];

/**
 * Accounts Payable flyout submenu config.
 * Same shape/rules as EO_SUBMENU — filtered by filterMenuByRole() before rendering.
 */
// RBAC disabled for AP module development: allowedRoles keys commented out below so every
// item is visible to all authenticated users. Restore the commented allowedRoles + the import
// above to re-enable per-item role gating.
export const AP_SUBMENU = [
  { label: "Dashboard", to: "/accounts-payable/dashboard" /* , allowedRoles: AP_ALL_ROLES */ },
  { label: "Vendors", to: "/accounts-payable/vendors" /* , allowedRoles: AP_ALL_ROLES */ },
  { label: "Invoices", to: "/accounts-payable/invoices" /* , allowedRoles: AP_ALL_ROLES */ },
  { label: "Pending Approvals", to: "/accounts-payable/approvals/pending" /* , allowedRoles: AP_APPROVER_PLUS_ROLES */ },
  { label: "Payment Queue", to: "/accounts-payable/payments/queue" /* , allowedRoles: AP_ALL_ROLES */ },
  { label: "Exception Center", to: "/accounts-payable/exceptions" /* , allowedRoles: AP_ALL_ROLES */ },
  { label: "Reports", to: "/accounts-payable/reports" /* , allowedRoles: AP_ALL_ROLES */ },
  { label: "Administration", to: "/accounts-payable/admin/tax-rules" /* , allowedRoles: [AP_ROLES.AP_ADMIN] */ },
];
