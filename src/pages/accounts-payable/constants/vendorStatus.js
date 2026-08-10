/**
 * Vendor lifecycle. The authoritative list of statuses (and their numeric status_id) is
 * served by apLookupService.getVendorStatuses() (/system/status?module_name=VENDOR) — these
 * string values are display labels used for local UI logic (e.g. the invoice-upload vendor
 * selector), not a replacement for that lookup.
 */
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

/** Only vendors in these statuses can be selected as the invoice-upload vendor. */
export const VENDOR_SELECTABLE_STATUSES = [VENDOR_STATUS.ACTIVE];

/** Bank accounts go through a separate verification workflow before they're payable-from. */
export const BANK_CHANGE_REQUEST_STATUS = {
  PENDING: "Pending Verification",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

export const BANK_CHANGE_REQUEST_STATUS_OPTIONS = Object.values(BANK_CHANGE_REQUEST_STATUS).map(
  (value) => ({ value, label: value })
);
