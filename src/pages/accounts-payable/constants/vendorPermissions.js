/**
 * Vendor Management UMS permission codes — mirror Backend/API_Layer/utils/vendor_permissions.py.
 * The backend enforces every one of these; the frontend only hides what would be refused.
 */
export const VENDOR_PERMISSIONS = {
  // Read Vendor Management screens (detail tabs, engagements, PO / GRN records).
  VENDOR_VIEW: "VENDOR_VIEW",
  // Create / edit vendors, status, addresses, tax, intake & pre-screen, PO and GRN records.
  VENDOR_MANAGE: "VENDOR_MANAGE",
  // Add / edit / delete vendor bank accounts — kept separate (payment-fraud control).
  VENDOR_BANK_MANAGE: "VENDOR_BANK_MANAGE",
};

/** Any of these lets a user open Vendor Management. */
export const VENDOR_ANY_PERMISSIONS = Object.values(VENDOR_PERMISSIONS);
