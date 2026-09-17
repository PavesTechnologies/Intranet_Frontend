/**
 * Accounts Payable role identifiers.
 * ADMIN reuses the platform-wide "Admin" role (ROLES.ADMIN in src/config/sidebarConfig.js) —
 * there is no AP-specific admin. The other three are AP-only and not used by any other module.
 * hasRole() in AuthContext is case-insensitive, so casing here is for readability only.
 */
export const AP_ROLES = {
  ADMIN: "Admin",
  VENDOR_INTAKE: "Vendor_Intake",
  AP_EXECUTIVE: "AP_Executive",
  FINANCE_EXECUTIVE: "Finance_Executive",
};

export const AP_ALL_ROLES = Object.values(AP_ROLES);

/** Can onboard/edit vendors. */
export const AP_VENDOR_MANAGER_ROLES = [AP_ROLES.ADMIN, AP_ROLES.VENDOR_INTAKE];

// Invoice intake/OCR/view/approval and payment are all authorized entirely by UMS JWT
// permission codes now, not by a role array here — see constants/invoicePermissions.js,
// approvalPermissions.js, paymentPermissions.js, and useApPermissions.js. Same reasoning as
// procurement (PR_Creator / PR_Approver / Procurement_Officer), which never had a role array to
// begin with. There is deliberately no AP_INVOICE_PROCESSOR_ROLES / AP_PAYMENT_ACTION_ROLES /
// etc. — a pure Approver or Finance user need not hold AP_Executive/Finance_Executive/Admin at
// all, so a role array could never correctly gate these.
