/**
 * Hover-menu data for the Intranet / Finance sidebar modules whose menus are not
 * driven by sidebarConfig.js (User Management, Resource Management, Account
 * Receivable, AI Screening), plus the per-role selection logic for them.
 *
 * Lives outside Sidebar.jsx so the global search (components/GlobalSearch) offers
 * exactly the pages the sidebar shows each user — both read from here.
 */
import { AR_MAKER_ROLES, AR_CHECKER_ROLES } from "./sidebarConfig";

export const userManagementSubmenu = [
  { label: "User Manage", to: "/user-management/users" },
  { label: "Role Manage", to: "/user-management/roles" },
  { label: "Permission Manage", to: "/user-management/permissions" },
  { label: "Group Manage", to: "/user-management/groups" },
  { label: "Access Point Manage", to: "/user-management/access-points" },
];

// DATA FOR THE POP LABEL / SUBMENU
export const resourceManagementSubmenu = [
  { label: "Client Management", to: "/resource-management" },
  { label: "Resource Project Management", to: "/resource-management/projects" },
  // { label: "Asset Categories", to: "/resource-management/asset-categories" },
  // { label: "Asset Types", to: "/resource-management/asset-types" },
  {
    label: "Workforce Availability",
    to: "/resource-management/workforce-availability",
  },
  { label: "Demand Management", to: "/resource-management/demand" },
  { label: "Roll-Off Management", to: "/resource-management/roleoff" },
  { label: "Bench Management", to: "/resource-management/bench" },
  {
    label: "Utilization & Performance",
    to: "/resource-management/bench/utilization-performance",
  },
];

export const accountReceivableSubmenu = [
  { label: "Dashboard", to: "/account-receivable/dashboard" },
  {
    label: "Project Billing Setup",
    to: "/account-receivable/project-billing-setup/overview",
    children: [
      {
        label: "Overview",
        to: "/account-receivable/project-billing-setup/overview",
      },
      {
        label: "Billing Config Workspace",
        to: "/account-receivable/project-billing-setup/workspace",
      },
    ],
  },
  {
    label: "Billing Approvals",
    to: "/account-receivable/billing-approvals",
  },
  {
    label: "Billing Data Acquisition",
    to: "/account-receivable/billing-data-acquisition/workspace",
  },
  {
    label: "Tax Calculation",
    to: "/account-receivable/tax-calculation",
  },
  {
    label: "Invoice Generation",
    to: "/account-receivable/invoice-generation",
  },
  {
    label: "Invoice Approval",
    to: "/account-receivable/invoice-approval",
  },
  {
    // Everything after an invoice is sent to the client.
    label: "Receivables",
    to: "/account-receivable/receivables",
    children: [
      { label: "Outstanding Receivables", to: "/account-receivable/receivables" },
      { label: "Payments", to: "/account-receivable/payments" },
      { label: "Customer Ledger & Aging", to: "/account-receivable/customer-ledger" },
      { label: "Credit & Debit Notes", to: "/account-receivable/adjustment-notes" },
      { label: "Reminders & Collections", to: "/account-receivable/collections" },
    ],
  },
  {
    label: "Configuration",
    to: "/account-receivable/master-data",
  },
];

// Maker-Checker split of the AR submenu above.
// Finance Manager (Checker) only gets Billing Approvals, Invoice Approval and the shared items.
// Maker roles (Finance Executive / Super Admin / Admin) only get create/draft/workflow items with NO approvals.
const CHECKER_ONLY_LABELS = ["Billing Approvals", "Invoice Approval"];
// Post-invoice receivables work both roles need.
const AR_SHARED_LABELS = ["Receivables"];
export const accountReceivableMakerSubmenu = accountReceivableSubmenu.filter(
  (item) => !CHECKER_ONLY_LABELS.includes(item.label),
);
export const accountReceivableCheckerSubmenu = accountReceivableSubmenu.filter(
  (item) => CHECKER_ONLY_LABELS.includes(item.label) || AR_SHARED_LABELS.includes(item.label),
);

export const airsSubmenu = [
  { label: "Dashboard", to: "/ai-screening/dashboard" },
  { label: "JD Management", to: "/ai-screening/jds" },
  { label: "Campaigns", to: "/ai-screening/campaigns" },
  { label: "Resume Intake", to: "/ai-screening/resume-intake" },
  { label: "Pipeline", to: "/ai-screening/pipeline" },
  { label: "Skill Ontology", to: "/ai-screening/skill-ontology" },
  { label: "Talent Pool", to: "/ai-screening/talent-pool" },
  // `roles` = only shown to users with one of these roles, whichever
  // per-role menu below they get (enforced by the final filter in the
  // component). /ai-screening/settings is HR_ADMIN-only in App.jsx.
  { label: "Settings", to: "/ai-screening/settings", roles: ["HR_ADMIN"] },
];

// Interview Calendar (/ai-screening/interview-calendar) is HR_ADMIN/RECRUITER only
// — same roles the tab it replaced was gated to — so like Prompt Templates
// below, it's added directly to those two submenus rather than to the
// shared airsSubmenu, which would leak it into the HIRING_MANAGER/HR
// fallback menu further down.
const interviewCalendarItem = { label: "Interview Calendar", to: "/ai-screening/interview-calendar" };

// HR_ADMIN gets a trimmed-down AIRS menu — only these items, plus
// Prompt Templates below (HR_ADMIN-only, not part of the general airsSubmenu)
// and Settings (/ai-screening/settings is HR_ADMIN-only in App.jsx).
export const hrAdminAirsSubmenu = [
  ...airsSubmenu.filter((item) => ["Dashboard", "JD Management", "Campaigns", "Pipeline"].includes(item.label)),
  ...airsSubmenu.filter((item) => ["Talent Pool", "Skill Ontology"].includes(item.label)),
  interviewCalendarItem,
  { label: "Prompt Templates", to: "/ai-screening/prompt-templates" },
  ...airsSubmenu.filter((item) => item.label === "Settings"),
];

// RECRUITER gets a trimmed-down AIRS menu — only these items.
export const recruiterAirsSubmenu = [
  ...airsSubmenu.filter((item) =>
    ["Dashboard", "Campaigns", "Resume Intake", "Pipeline", "Talent Pool"].includes(item.label),
  ),
  interviewCalendarItem,
];

// HIRING_MANAGER gets a trimmed-down AIRS menu — only these items.
export const hiringManagerAirsSubmenu = [
  ...airsSubmenu.filter((item) => ["Campaigns", "Pipeline"].includes(item.label)),
  interviewCalendarItem,
  // /ai-screening/hm-review is HIRING_MANAGER-only (see App.jsx ProtectedRoute).
  { label: "HM Review", to: "/ai-screening/hm-review" },
];


export const deliveryManagerResourceManagementSubmenu =
  resourceManagementSubmenu.filter(
    (item) =>
      item.label === "Demand Management" ||
      item.label === "Roll-Off Management",
  );

/**
 * Account Receivable submenu for the current user (Maker-Checker split).
 * - Maker AND Finance Manager: full submenu.
 * - Finance Manager only: approvals + shared receivables items.
 * - Everyone else (Super Admin, Finance Executive): maker items, no approvals.
 */
export function getArSubmenu(hasRole) {
  const isFinanceManager = hasRole(AR_CHECKER_ROLES);
  const canSeeArMaker = hasRole(AR_MAKER_ROLES);
  if (canSeeArMaker && isFinanceManager) return accountReceivableSubmenu;
  return isFinanceManager ? accountReceivableCheckerSubmenu : accountReceivableMakerSubmenu;
}

/** True when the user can see the Account Receivable module at all. */
export function canSeeAccountReceivable(hasRole) {
  return hasRole(AR_MAKER_ROLES) || hasRole(AR_CHECKER_ROLES);
}

export const AIRS_ACCESS_ROLES = ["HIRING_MANAGER", "HR", "HR_ADMIN", "RECRUITER"];

/**
 * AI Screening submenu for the current user. Plain HR falls through to the full
 * menu without Dashboard (/ai-screening/dashboard is HR_ADMIN/RECRUITER only).
 * Final guard: an item that declares `roles` (e.g. Settings -> HR_ADMIN) never
 * appears for anyone without one of them.
 */
export function getAirsSubmenu(hasRole) {
  const menu = hasRole(["HR_ADMIN"])
    ? hrAdminAirsSubmenu
    : hasRole(["RECRUITER"])
      ? recruiterAirsSubmenu
      : hasRole(["HIRING_MANAGER"])
        ? hiringManagerAirsSubmenu
        : airsSubmenu.filter((item) => item.label !== "Dashboard");
  return menu.filter((item) => !item.roles || hasRole(item.roles));
}

/** Resource Management submenu: Delivery Managers (without Admin/RM) get a trimmed list. */
export function getResourceManagementSubmenu(hasRole) {
  const isAdminOrRm = hasRole(["ADMIN"]) || hasRole(["RESOURCE_MANAGER"]);
  return !isAdminOrRm && hasRole(["DELIVERY_MANAGER"])
    ? deliveryManagerResourceManagementSubmenu
    : resourceManagementSubmenu;
}
