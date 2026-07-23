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
  // Expense Management (XMS) roles
  MANAGER:           "Manager",
  FINANCE:           "Finance",
};

const ADMIN_ROLES      = [ROLES.ADMIN, ROLES.SUPER_ADMIN];
const MANAGEMENT_ROLES = [...ADMIN_ROLES, ROLES.HR, ROLES.REPORTING_MANAGER];
const HR_ADMIN         = [ROLES.HR, ...ADMIN_ROLES];
const HR_MANAGEMENT    = [ROLES.HR, ROLES.REPORTING_MANAGER];

// XMS role groups
// NOTE: regular staff are assigned the "General" role in this system (not "Employee"),
// so General is treated as the XMS "Employee" tier — keep in sync with allowedRoles on
// the /expense-management/* routes in App.jsx.
const XMS_EMPLOYEE   = [ROLES.GENERAL];
const XMS_MANAGER    = [ROLES.MANAGER];
const XMS_FINANCE    = [ROLES.FINANCE];
const XMS_ADMIN      = ADMIN_ROLES;
const XMS_EVERYONE   = [ROLES.GENERAL, ROLES.MANAGER, ROLES.FINANCE, ...ADMIN_ROLES];
const XMS_REPORT_VIEWERS = [ROLES.MANAGER, ROLES.FINANCE, ...ADMIN_ROLES];

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
      { label: "Org Chart",  to: "/employee-onboarding/organization-tree" },
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
  {
    label: "Off-Boarding",
    to: "/employee-exit",
    allowedRoles: MANAGEMENT_ROLES,
  },
];

/**
 * Expense Management (XMS) flyout submenu config.
 * Same shape/filtering contract as EO_SUBMENU above.
 */
export const XMS_SUBMENU = [
  {
    label: "Dashboard",
    to: "/expense-management/dashboard",
    allowedRoles: XMS_EVERYONE,
  },
  {
    label: "Expenses",
    to: "/expense-management/expenses/my",
    allowedRoles: [...XMS_EMPLOYEE, ...XMS_MANAGER],
    children: [
      { label: "Create Expense",  to: "/expense-management/expenses/create" },
      { label: "My Expenses",     to: "/expense-management/expenses/my" },
      { label: "All Expenses",    to: "/expense-management/expenses/all",     allowedRoles: XMS_MANAGER },
      { label: "Expense Reports", to: "/expense-management/expenses/reports", allowedRoles: XMS_MANAGER },
    ],
  },
  {
    label: "Receipts",
    to: "/expense-management/receipts/library",
    allowedRoles: XMS_EMPLOYEE,
    children: [
      { label: "Receipt Library",  to: "/expense-management/receipts/library" },
      { label: "OCR Processing",   to: "/expense-management/receipts/ocr-processing" },
    ],
  },
  {
    label: "Cash Advance",
    to: "/expense-management/cash-advance/my",
    allowedRoles: XMS_EMPLOYEE,
    children: [
      { label: "Request Advance", to: "/expense-management/cash-advance/request" },
      { label: "My Advances",     to: "/expense-management/cash-advance/my" },
      { label: "Settlement",      to: "/expense-management/cash-advance/settlement" },
    ],
  },
  {
    label: "Approvals",
    to: "/expense-management/approvals/pending",
    allowedRoles: XMS_MANAGER,
    children: [
      { label: "Pending",  to: "/expense-management/approvals/pending" },
      { label: "Approved", to: "/expense-management/approvals/approved" },
      { label: "Rejected", to: "/expense-management/approvals/rejected" },
    ],
  },
  {
    label: "Finance",
    to: "/expense-management/finance/verification",
    allowedRoles: XMS_FINANCE,
    children: [
      { label: "Verification",    to: "/expense-management/finance/verification" },
      { label: "Reimbursements",  to: "/expense-management/finance/reimbursements" },
      { label: "Payment Status",  to: "/expense-management/finance/payment-status" },
    ],
  },
  {
    label: "Client Billing",
    to: "/expense-management/client-billing/billable-expenses",
    allowedRoles: XMS_FINANCE,
    children: [
      { label: "Billable Expenses", to: "/expense-management/client-billing/billable-expenses" },
      { label: "Invoice Handoff",   to: "/expense-management/client-billing/invoice-handoff" },
      { label: "Invoice Status",    to: "/expense-management/client-billing/invoice-status" },
    ],
  },
  {
    label: "Masters",
    to: "/expense-management/masters/expense-categories",
    allowedRoles: XMS_ADMIN,
    children: [
      { label: "Expense Categories",  to: "/expense-management/masters/expense-categories" },
      { label: "GL Accounts",         to: "/expense-management/masters/gl-accounts" },
      { label: "Cost Centers",        to: "/expense-management/masters/cost-centers" },
      { label: "Projects",            to: "/expense-management/masters/projects" },
      { label: "Clients",             to: "/expense-management/masters/clients" },
      { label: "Currency Management", to: "/expense-management/masters/currency-management" },
      { label: "Tax Configuration",   to: "/expense-management/masters/tax-configuration" },
    ],
  },
  {
    label: "Policies",
    to: "/expense-management/policies",
    allowedRoles: XMS_ADMIN,
  },
  {
    label: "Reports",
    to: "/expense-management/reports",
    allowedRoles: XMS_REPORT_VIEWERS,
  },
  {
    label: "Activity",
    to: "/expense-management/activity/notifications",
    allowedRoles: XMS_EVERYONE,
    children: [
      { label: "Notifications", to: "/expense-management/activity/notifications" },
      { label: "Audit Logs",    to: "/expense-management/activity/audit-logs", allowedRoles: XMS_ADMIN },
    ],
  },
  {
    label: "Settings",
    to: "/expense-management/settings",
    allowedRoles: XMS_ADMIN,
  },
];
