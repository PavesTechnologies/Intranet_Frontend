import { useAuth } from "../../../contexts/AuthContext";
import { AP_PERMISSIONS, rolesForPermission } from "../constants/permissions";

/**
 * One boolean flag per AP_PERMISSIONS key, derived from the role map in constants/permissions.js
 * — pages/buttons consume these named flags instead of calling hasRole() ad hoc, so the
 * permission matrix stays defined in one file. Mirrors the useCampaignPermissions.js pattern
 * already used elsewhere in the app (src/pages/airs/campaigns/hooks/useCampaignPermissions.js).
 *
 * Frontend permission checks are UX only (hide/show, not enforce) — backend authorization
 * remains authoritative regardless of what this hook returns.
 */
export function useApPermissions() {
  const { hasRole } = useAuth();

  return {
    canViewDashboard: hasRole(rolesForPermission(AP_PERMISSIONS.VIEW_DASHBOARD)),
    canOnboardVendor: hasRole(rolesForPermission(AP_PERMISSIONS.ONBOARD_VENDOR)),
    canEditVendor: hasRole(rolesForPermission(AP_PERMISSIONS.EDIT_VENDOR)),
    canViewVendor: hasRole(rolesForPermission(AP_PERMISSIONS.VIEW_VENDOR)),
    canUploadInvoice: hasRole(rolesForPermission(AP_PERMISSIONS.UPLOAD_INVOICE)),
    canReviewOcr: hasRole(rolesForPermission(AP_PERMISSIONS.REVIEW_OCR)),
    canValidateInvoice: hasRole(rolesForPermission(AP_PERMISSIONS.VALIDATE_INVOICE)),
    canViewInvoice: hasRole(rolesForPermission(AP_PERMISSIONS.VIEW_INVOICE)),
    canMarkPaid: hasRole(rolesForPermission(AP_PERMISSIONS.MARK_PAID)),
    canViewPayment: hasRole(rolesForPermission(AP_PERMISSIONS.VIEW_PAYMENT)),
  };
}
