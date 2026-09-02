import { AP_ALL_ROLES, AP_ROLES } from "../pages/accounts-payable/constants/apRoles";
import { AP_ROUTES } from "../pages/accounts-payable/constants/routes";

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
  // Accounts Receivable (AR) Maker-Checker roles.
  // FINANCE_EXECUTIVE mirrors the ad-hoc "Finance_Executive" literal already used
  // by XMS_FINANCE/XMS_EVERYONE/AP_ROLES.FINANCE_EXECUTIVE below — same real
  // backend role, now also exposed as a named constant for AR's own use.
  // FINANCE_MANAGER is AR's Checker role (approve/reject billing configurations);
  // it does not exist anywhere else in the app.
  FINANCE_EXECUTIVE: "Finance_Executive",
  FINANCE_MANAGER:   "Finance_Manager",
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
const XMS_FINANCE    = [ROLES.FINANCE, "Finance_Executive"];
const XMS_ADMIN      = ADMIN_ROLES;
export const XMS_EVERYONE   = [ROLES.GENERAL, ROLES.MANAGER, ROLES.FINANCE, "Finance_Executive", ...ADMIN_ROLES];
const XMS_REPORT_VIEWERS = [ROLES.MANAGER, ROLES.FINANCE, "Finance_Executive", ...ADMIN_ROLES];

/**
 * Accounts Receivable (AR) Maker-Checker role groups.
 *
 * AR_MAKER_ROLES   — Finance Executive: create/save-draft/edit-draft/submit
 *                    the Project Billing Setup wizard. Super Admin keeps this
 *                    too (existing AR access is unchanged for Super Admin).
 * AR_CHECKER_ROLES — Finance Manager: review/approve/reject submitted billing
 *                    configurations (Billing Approvals). Super Admin keeps
 *                    this too, same reasoning.
 *
 * Deliberately two separate exports (not one shared AR_ALL_ROLES) — routes and
 * sidebar menus for Maker screens must allow only AR_MAKER_ROLES, and Checker
 * screens only AR_CHECKER_ROLES, so a Finance Executive can never reach
 * Billing Approvals and a Finance Manager can never reach the create/edit
 * wizard. See App.jsx route guards and Sidebar.jsx's AR submenu split.
 */
export const AR_MAKER_ROLES = [ROLES.SUPER_ADMIN, ROLES.FINANCE_EXECUTIVE];
export const AR_CHECKER_ROLES = [ROLES.SUPER_ADMIN, ROLES.FINANCE_MANAGER];
export const AR_ALL_ROLES = [...new Set([...AR_MAKER_ROLES, ...AR_CHECKER_ROLES])];

/**
 * Union of every role that can see at least one Finance Management module
 * (Expense Management, Accounts Payable, Accounts Receivable). Composed from
 * each module's own existing role set — not a new authorization mechanism —
 * so it stays correct as long as XMS_EVERYONE / AP_ALL_ROLES / AR_ALL_ROLES
 * (see Sidebar.jsx / App.jsx) stay in sync.
 */
export const FINANCE_ALL_ROLES = [
  ...new Set([...XMS_EVERYONE, ...AP_ALL_ROLES, ...AR_ALL_ROLES, ROLES.SUPER_ADMIN]),
];

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
    to: "/expense-management/approvals",
    // Not XMS_MANAGER-only (§1.5): any employee can be a resolved approver (NAMED_USER/
    // DEPARTMENT_OWNER/COST_CENTER_OWNER), so a General-role approver still needs a way in.
    // "My Approvals" is presence-based - visible to everyone, empty for anyone with nothing pending.
    allowedRoles: XMS_EVERYONE,
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
    // AP_EXECUTIVE-only (matches ApPaymentController's own @PreAuthorize("hasRole('AP_EXECUTIVE')")
    // exactly, with no Admin override) - the backend endpoints this page calls give Admin no
    // access either, so gating the entry any wider would just show a page whose actions 403.
    label: "AP Payments",
    to: "/expense-management/ap-payments/queue",
    allowedRoles: [AP_ROLES.AP_EXECUTIVE],
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
      { label: "Categories & Ledger Account", to: "/expense-management/masters/expense-categories" },
      { label: "Cost Center & Budget Management", to: "/expense-management/masters/cost-center-management" },
      { label: "Projects",            to: "/expense-management/masters/projects" },
      { label: "Clients",             to: "/expense-management/masters/clients" },
      { label: "Currency Management", to: "/expense-management/masters/currency-management" },
      { label: "Tax Configuration",   to: "/expense-management/masters/tax-configuration" },
    ],
  },
  {
    label: "Approval Rules",
    to: "/expense-management/approval-rules/flows",
    allowedRoles: XMS_ADMIN,
    children: [
      { label: "Flows",                to: "/expense-management/approval-rules/flows" },
      { label: "Catch-All Flow",       to: "/expense-management/approval-rules/catch-all" },
      { label: "Department Approvers", to: "/expense-management/approval-rules/department-approvers" },
      { label: "Delegations",          to: "/expense-management/approval-rules/delegations" },
    ],
  },
  {
    label: "Policy & Compliance",
    to: "/expense-management/policy-engine/dashboard",
    allowedRoles: XMS_REPORT_VIEWERS,
    children: [
      { label: "Dashboard",           to: "/expense-management/policy-engine/dashboard" },
      { label: "Policy Bundles",      to: "/expense-management/policy-engine/bundles" },
      { label: "Policy Groups",       to: "/expense-management/policy-engine/groups" },
      { label: "Assignments",         to: "/expense-management/policy-engine/assignments" },
      { label: "Rules",               to: "/expense-management/policy-engine/rules" },
      { label: "Severity Thresholds", to: "/expense-management/policy-engine/severity-thresholds" },
      { label: "Version History",     to: "/expense-management/policy-engine/versions" },
    ],
  },
  // {
  //   label: "Reports",
  //   to: "/expense-management/reports",
  //   allowedRoles: XMS_REPORT_VIEWERS,
  // },
  // {
  //   label: "Activity",
  //   to: "/expense-management/activity/notifications",
  //   allowedRoles: XMS_EVERYONE,
  //   children: [
  //     { label: "Notifications", to: "/expense-management/activity/notifications" },
  //     { label: "Audit Logs",    to: "/expense-management/activity/audit-logs", allowedRoles: XMS_ADMIN },
  //   ],
  // },
  // {
  //   label: "Settings",
  //   to: "/expense-management/settings",
  //   allowedRoles: XMS_ADMIN,
  // },
];

/**
 * Accounts Payable flyout submenu config.
 * Same shape/filtering contract as EO_SUBMENU/XMS_SUBMENU above — filtered by
 * filterMenuByRole() before rendering.
 *
 * Unlike EO/XMS, every item here shares AP_ALL_ROLES (no item is visible to "everyone") —
 * the whole module must stay invisible to any role outside AP_ALL_ROLES, so the sidebar
 * additionally gates the entire flyout <li> on hasRole(AP_ALL_ROLES) (see Sidebar.jsx),
 * matching the Account Receivable module's pattern rather than EO/XMS's ungated one.
 *
 * Deliberately 5 flat items, not 9 — each links to that area's primary list/overview page,
 * which carries its own "create new" action as a page-level button (e.g. VendorListPage's
 * "Register Vendor", InvoiceListPage's "Upload Invoice") rather than as a separate sidebar
 * entry. Sub-views reached from within a page (Vendor Onboarding/Detail/Update, OCR Review
 * Queue, Validation Queue, Payment History, Mark as Paid) still have their own routes from
 * Phase 2 — they're just no longer direct sidebar destinations. System Configuration is the
 * exception: it's a masters/admin screen, not a business-object list, so it stays a direct
 * sidebar destination on its own.
 *
 * Per-item role differentiation (e.g. Vendor Management restricted to Admin/Vendor_Intake)
 * is deferred to the business-logic phases — see constants/permissions.js's
 * AP_PERMISSION_ROLES map for the intended per-capability breakdown.
 */
export const AP_SUBMENU = [
  { label: "Dashboard", to: AP_ROUTES.DASHBOARD, allowedRoles: AP_ALL_ROLES },
  { label: "Vendor Management", to: AP_ROUTES.VENDOR_LIST, allowedRoles: AP_ALL_ROLES },
  { label: "Invoice Management", to: AP_ROUTES.INVOICE_LIST, allowedRoles: AP_ALL_ROLES },
  { label: "Payments", to: AP_ROUTES.PAYMENT_READY, allowedRoles: AP_ALL_ROLES },
  { label: "Procurement", to: AP_ROUTES.PROCUREMENT, allowedRoles: AP_ALL_ROLES },
  { label: "System Configuration", to: AP_ROUTES.SYSTEM_CONFIG, allowedRoles: AP_ALL_ROLES },
];
