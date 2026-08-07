/**
 * Vendor lifecycle: onboarding started -> onboarding complete (Active) -> optionally deactivated.
 * There is no separate approval/verification status — this module has no approval workflow.
 */
export const VENDOR_STATUS = {
  PENDING_ONBOARDING: "Pending Onboarding",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export const VENDOR_STATUS_OPTIONS = Object.values(VENDOR_STATUS).map((value) => ({
  value,
  label: value,
}));

/** Only vendors in these statuses can be selected as the invoice-upload vendor. */
export const VENDOR_SELECTABLE_STATUSES = [VENDOR_STATUS.ACTIVE];
