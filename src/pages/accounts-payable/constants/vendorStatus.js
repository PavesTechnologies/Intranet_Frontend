export const VENDOR_STATUS = {
  ACTIVE: "Active",
  PENDING_VERIFICATION: "Pending Verification",
  INACTIVE: "Inactive",
  BLOCKED: "Blocked",
};

export const VENDOR_STATUS_OPTIONS = Object.values(VENDOR_STATUS).map((value) => ({
  value,
  label: value,
}));

export const BANK_CHANGE_REQUEST_STATUS = {
  PENDING: "Pending Verification",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

export const BANK_CHANGE_REQUEST_STATUS_OPTIONS = Object.values(BANK_CHANGE_REQUEST_STATUS).map(
  (value) => ({ value, label: value })
);
