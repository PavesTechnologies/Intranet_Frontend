import { useAuth } from "../../../contexts/AuthContext";
import { AP_PERMISSIONS, rolesForPermission } from "../constants/permissions";
import { PROCUREMENT_PERMISSIONS } from "../constants/procurementPermissions";
import {
  APPROVAL_PERMISSIONS,
  APPROVAL_ANY_VIEW_PERMISSIONS,
  INVOICE_HISTORY_VIEW_PERMISSIONS,
} from "../constants/approvalPermissions";
import { PAYMENT_PERMISSIONS } from "../constants/paymentPermissions";
import { INVOICE_PERMISSIONS } from "../constants/invoicePermissions";

/**
 * One boolean flag per capability, consumed by pages/buttons instead of calling
 * hasRole()/hasPermission() ad hoc — so the permission matrix stays defined in one file.
 * Mirrors the useCampaignPermissions.js pattern used elsewhere in the app
 * (src/pages/airs/campaigns/hooks/useCampaignPermissions.js).
 *
 * Two different authorization models live here side by side:
 *  - Non-procurement flags (dashboard/vendor/invoice/payment) are role-derived via the
 *    AP_PERMISSIONS -> role-array map in constants/permissions.js, same as always.
 *  - Procurement flags read the UMS `permissions` claim on the JWT directly via
 *    hasPermission() — no frontend role -> permission mapping exists for these; UMS alone
 *    decides which of PR_Creator / PR_Approver / Procurement_Officer carries which
 *    permission, and this hook just reflects whatever the token says.
 *
 * Frontend permission checks are UX only (hide/show, not enforce) — backend authorization
 * (permission_based_access in procurement_route.py) remains authoritative regardless of what
 * this hook returns. Every non-view procurement flag below independently gates one specific
 * action — holding a *_VIEW permission never implies any create/edit/approve/etc. capability.
 */
export function useApPermissions() {
  const { hasRole, hasPermission, hasAnyPermission } = useAuth();

  return {
    canViewDashboard: hasRole(rolesForPermission(AP_PERMISSIONS.VIEW_DASHBOARD)),
    canOnboardVendor: hasRole(rolesForPermission(AP_PERMISSIONS.ONBOARD_VENDOR)),
    canEditVendor: hasRole(rolesForPermission(AP_PERMISSIONS.EDIT_VENDOR)),
    canViewVendor: hasRole(rolesForPermission(AP_PERMISSIONS.VIEW_VENDOR)),
    // Invoice intake/OCR/view now carry real UMS permissions (invoice_extraction_route.py,
    // invoice_process_route.py, invoice_details_route.py) — migrated off the frontend
    // role -> permission guess the same way canMarkPaid/canViewPayment already were.
    canUploadInvoice: hasPermission(INVOICE_PERMISSIONS.INVOICE_CREATE),
    canReviewOcr: hasPermission(INVOICE_PERMISSIONS.INVOICE_OCR_REVIEW),
    // The standalone Validation Queue page is part of the same OCR/intake pipeline — no
    // separate backend permission exists for it.
    canValidateInvoice: hasPermission(INVOICE_PERMISSIONS.INVOICE_OCR_REVIEW),
    canViewInvoice: hasPermission(INVOICE_PERMISSIONS.INVOICE_VIEW),
    // Payment routes previously had zero backend permission gating at all, so these were
    // role-derived like every other flag on this page — PAYMENT_VIEW/PAYMENT_PROCESS now exist
    // (payment_route.py), so these migrate to the same UMS-permission-driven model the approval
    // workflow already uses, per the same reasoning: backend authorization is authoritative, not
    // a frontend role guess.
    canMarkPaid: hasPermission(PAYMENT_PERMISSIONS.PAYMENT_PROCESS),
    canViewPayment: hasPermission(PAYMENT_PERMISSIONS.PAYMENT_VIEW),

    // ── PR Request ─────────────────────────────────────────────────────────
    canViewPR: hasPermission(PROCUREMENT_PERMISSIONS.PR_VIEW),
    canCreatePR: hasPermission(PROCUREMENT_PERMISSIONS.PR_CREATE),
    canEditPR: hasPermission(PROCUREMENT_PERMISSIONS.PR_EDIT),
    canDeletePR: hasPermission(PROCUREMENT_PERMISSIONS.PR_DELETE),
    canSubmitPR: hasPermission(PROCUREMENT_PERMISSIONS.PR_SUBMIT),
    canTrackPR: hasPermission(PROCUREMENT_PERMISSIONS.PR_TRACK),
    // Cancel is intentionally the same backend permission as Submit (PR_SUBMIT) — there is no
    // dedicated PR_CANCEL permission. Do not change this mapping.
    canCancelPR: hasPermission(PROCUREMENT_PERMISSIONS.PR_SUBMIT),

    // ── PR Approval ────────────────────────────────────────────────────────
    canViewPRApprovals: hasPermission(PROCUREMENT_PERMISSIONS.PR_APPROVAL_VIEW),
    canApprovePR: hasPermission(PROCUREMENT_PERMISSIONS.PR_APPROVE),
    canRejectPR: hasPermission(PROCUREMENT_PERMISSIONS.PR_REJECT),
    // Return-for-clarification is intentionally the same backend permission as Reject
    // (PR_REJECT) — there is no dedicated return permission. Do not change this mapping.
    canReturnPR: hasPermission(PROCUREMENT_PERMISSIONS.PR_REJECT),

    // ── Quotations / RFQ sourcing ──────────────────────────────────────────
    canViewQuotation: hasPermission(PROCUREMENT_PERMISSIONS.QUOTATION_VIEW),
    // Creating an RFQ and recording a quotation are both intentionally QUOTATION_CREATE, not
    // PR_EDIT. Sourcing happens after PR approval and belongs to the Procurement Officer's
    // permission set.
    canCreateQuotation: hasPermission(PROCUREMENT_PERMISSIONS.QUOTATION_CREATE),
    // Closing an RFQ (POST /rfq/{rfq_id}/close) is authorized under QUOTATION_UPDATE server-side
    // — there is no dedicated RFQ_CLOSE permission.
    canUpdateQuotation: hasPermission(PROCUREMENT_PERMISSIONS.QUOTATION_UPDATE),
    canDeleteQuotation: hasPermission(PROCUREMENT_PERMISSIONS.QUOTATION_DELETE),
    // Invite Vendor and Send RFQ are each their own backend permission — INVITE_VENDOR and
    // SEND_RFQ — distinct from QUOTATION_CREATE. Do not fold these back into canCreateQuotation.
    canInviteVendor: hasPermission(PROCUREMENT_PERMISSIONS.INVITE_VENDOR),
    canSendRfq: hasPermission(PROCUREMENT_PERMISSIONS.SEND_RFQ),

    // ── Vendor Selection ───────────────────────────────────────────────────
    canViewVendorSelection: hasPermission(PROCUREMENT_PERMISSIONS.VENDOR_SELECTION_VIEW),
    canSelectVendor: hasPermission(PROCUREMENT_PERMISSIONS.VENDOR_SELECT),

    // ── Purchase Orders ────────────────────────────────────────────────────
    // purchase_order_route.py doesn't have permission_based_access wired up yet (known
    // backend gap, out of scope here) — PO_VIEW/PO_CREATE still gate the frontend so the UI
    // is consistent, but this is UX only until that route is protected server-side too.
    canViewPO: hasPermission(PROCUREMENT_PERMISSIONS.PO_VIEW),
    canGeneratePO: hasPermission(PROCUREMENT_PERMISSIONS.PO_CREATE),

    // ── Invoice Approval Workflow ──────────────────────────────────────────
    // Configuring approval policies and department-approver mappings — gates the whole
    // Approval Policies / Department Approvers tabs in System Configuration.
    canManageApprovalPolicy: hasPermission(APPROVAL_PERMISSIONS.APPROVAL_POLICY_MANAGE),
    // Moving an invoice into the approval workflow (POST .../send-for-approval).
    canSendForApproval: hasPermission(APPROVAL_PERMISSIONS.INVOICE_SEND_FOR_APPROVAL),
    // Seeing the approval status/timeline/history at all — held on its own by a pure viewer;
    // an actual approver already has it implicitly via INVOICE_APPROVE/INVOICE_REJECT (the
    // backend's GET .../approval endpoints accept any of the three, see
    // constants/approvalPermissions.js's APPROVAL_ANY_VIEW_PERMISSIONS).
    canViewInvoiceApproval: hasAnyPermission(APPROVAL_ANY_VIEW_PERMISSIONS),
    // Holding this permission is necessary but not sufficient to approve/reject any given
    // invoice — the backend alone determines whether the current user is an eligible approver
    // for the invoice's active step. See InvoiceApprovalPanel for that check.
    canApproveInvoice: hasPermission(APPROVAL_PERMISSIONS.INVOICE_APPROVE),
    canRejectInvoice: hasPermission(APPROVAL_PERMISSIONS.INVOICE_REJECT),
    // Returns the invoice to the AP Executive for correction (RETURNED_FOR_REVIEW) instead of
    // approving/rejecting outright — same "necessary but not sufficient" caveat as
    // canApproveInvoice/canRejectInvoice: the backend alone determines eligibility for the
    // invoice's current active step.
    canSendBackInvoice: hasPermission(APPROVAL_PERMISSIONS.INVOICE_SEND_BACK),
    // The Activity/History tab — reuses every permission that already implies invoice
    // visibility (see constants/approvalPermissions.js's INVOICE_HISTORY_VIEW_PERMISSIONS).
    canViewInvoiceHistory: hasAnyPermission(INVOICE_HISTORY_VIEW_PERMISSIONS),
  };
}
