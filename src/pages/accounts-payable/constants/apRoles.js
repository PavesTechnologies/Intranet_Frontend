export const AP_ROLES = {
  AP_ADMIN: "AP_Admin",
  AP_MANAGER: "AP_Manager",
  AP_APPROVER: "AP_Approver",
  AP_CLERK: "AP_Clerk",
  FINANCE_VIEWER: "Finance_Viewer",
};

export const AP_ALL_ROLES = Object.values(AP_ROLES);

export const AP_CLERK_PLUS_ROLES = [
  AP_ROLES.AP_CLERK,
  AP_ROLES.AP_MANAGER,
  AP_ROLES.AP_ADMIN,
];

export const AP_APPROVER_PLUS_ROLES = [
  AP_ROLES.AP_APPROVER,
  AP_ROLES.AP_MANAGER,
  AP_ROLES.AP_ADMIN,
];
