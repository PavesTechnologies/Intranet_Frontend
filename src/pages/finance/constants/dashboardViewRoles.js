import { ROLES } from "../../../config/sidebarConfig";
import { AP_ROLES } from "../../accounts-payable/constants/apRoles";

/**
 * Options for the Finance dashboard's "view as" role dropdown.
 *
 * TEMPORARY, DISPLAY-ONLY CONTEXT CONTROL. Built solely from role identifiers
 * that already exist (ROLES / AP_ROLES) — no new roles. The selection does NOT
 * grant, restrict or check any permission and does not change what the
 * dashboard shows; real role-based personalisation (driven by the logged-in
 * user's roles/permissions) arrives in a later phase.
 */
export const DASHBOARD_VIEW_ROLE_OPTIONS = [
  { value: ROLES.FINANCE_MANAGER, label: "Finance Manager" },
  { value: ROLES.FINANCE_EXECUTIVE, label: "Finance Executive" },
  { value: ROLES.FINANCE, label: "Finance" },
  { value: AP_ROLES.AP_EXECUTIVE, label: "AP Executive" },
  { value: AP_ROLES.INVOICE_APPROVER, label: "Invoice Approver" },
  { value: AP_ROLES.VENDOR_INTAKE, label: "Vendor Intake" },
  { value: ROLES.MANAGER, label: "Manager" },
  { value: ROLES.GENERAL, label: "Employee" },
  { value: ROLES.ADMIN, label: "Admin" },
  { value: ROLES.SUPER_ADMIN, label: "Super Admin" },
];

export const DEFAULT_DASHBOARD_VIEW_ROLE = DASHBOARD_VIEW_ROLE_OPTIONS[0].value;
