/**
 * Literal UMS permission codes for Procurement, exactly as issued on the JWT's `permissions`
 * claim (Backend/API_Layer/routes/procurement_route.py's permission_based_access checks).
 *
 * This is NOT a role -> permission map — UMS owns which roles (PR_Creator, PR_Approver,
 * Procurement_Officer) carry which of these; the frontend never encodes that relationship.
 * It exists only so call sites pass around one named constant instead of a repeated magic
 * string, e.g. hasPermission(PROCUREMENT_PERMISSIONS.PR_CREATE).
 *
 * Two intentional non-1:1 mappings inherited from the backend (see useApPermissions.js):
 *   - Cancel PR uses PR_SUBMIT (no dedicated PR_CANCEL permission exists).
 *   - Return-for-clarification uses PR_REJECT (no dedicated return permission exists).
 *   - Creating an RFQ, and recording a quotation, both use QUOTATION_CREATE, not PR_EDIT —
 *     sourcing happens after PR approval and is Procurement Officer territory.
 *   - Closing an RFQ (POST /rfq/{rfq_id}/close) uses QUOTATION_UPDATE — there is no dedicated
 *     RFQ_CLOSE permission.
 *
 * Inviting vendors and sending an RFQ are each their own distinct backend permission —
 * INVITE_VENDOR and SEND_RFQ respectively (Backend/API_Layer/routes/rfq_route.py) — NOT
 * QUOTATION_CREATE, and there is no RFQ_VIEW/RFQ_CREATE/RFQ_CLOSE permission anywhere in the
 * backend; do not invent those names.
 */
export const PROCUREMENT_PERMISSIONS = {
  PR_VIEW: "PR_VIEW",
  PR_CREATE: "PR_CREATE",
  PR_EDIT: "PR_EDIT",
  PR_DELETE: "PR_DELETE",
  PR_SUBMIT: "PR_SUBMIT",
  PR_TRACK: "PR_TRACK",

  PR_APPROVAL_VIEW: "PR_APPROVAL_VIEW",
  PR_APPROVE: "PR_APPROVE",
  PR_REJECT: "PR_REJECT",

  QUOTATION_VIEW: "QUOTATION_VIEW",
  QUOTATION_CREATE: "QUOTATION_CREATE",
  QUOTATION_UPDATE: "QUOTATION_UPDATE",
  QUOTATION_DELETE: "QUOTATION_DELETE",

  INVITE_VENDOR: "INVITE_VENDOR",
  SEND_RFQ: "SEND_RFQ",

  VENDOR_SELECTION_VIEW: "VENDOR_SELECTION_VIEW",
  VENDOR_SELECT: "VENDOR_SELECT",

  PO_VIEW: "PO_VIEW",
  PO_CREATE: "PO_CREATE",

  // Vendor availability + onboarding branch (Backend/API_Layer/routes/vendor_onboarding_route.py).
  // Each backend route accepts any-of a list, so a Procurement Officer who already holds
  // QUOTATION_* / VENDOR_SELECT passes without a dedicated onboarding permission — these are
  // the dedicated codes, checked first by the hook below.
  VENDOR_AVAILABILITY_CHECK: "VENDOR_AVAILABILITY_CHECK",
  ONBOARDING_VIEW: "ONBOARDING_VIEW",
  ONBOARDING_CREATE: "ONBOARDING_CREATE",
  ONBOARDING_ASSIGN: "ONBOARDING_ASSIGN",
  ONBOARDING_PROCESS: "ONBOARDING_PROCESS",

  // NDA lifecycle (Backend/API_Layer/routes/nda_route.py).
  NDA_VIEW: "NDA_VIEW",
  NDA_GENERATE: "NDA_GENERATE",
  NDA_SEND: "NDA_SEND",
  // The signed-NDA upload gate. NOTE: the backend's constant is named NDA_UPLOAD_SIGNED but
  // the permission code it checks for is "NDA_UPLOAD" (nda_route.py) — this is the code.
  NDA_UPLOAD: "NDA_UPLOAD",
};

/**
 * The any-of lists the backend routes actually check, mirrored so the UI hides exactly what
 * the API would reject. Keep these in step with the route-level constants:
 *   vendor_onboarding_route.py — ONBOARDING_VIEW/CREATE/ASSIGN/PROCESS
 *   nda_route.py               — NDA_VIEW/GENERATE/SEND
 *   procurement_route.py       — vendor-availability
 */
export const ONBOARDING_ANY = {
  VIEW: [PROCUREMENT_PERMISSIONS.ONBOARDING_VIEW, PROCUREMENT_PERMISSIONS.QUOTATION_VIEW],
  CREATE: [PROCUREMENT_PERMISSIONS.ONBOARDING_CREATE, PROCUREMENT_PERMISSIONS.QUOTATION_CREATE],
  ASSIGN: [PROCUREMENT_PERMISSIONS.ONBOARDING_ASSIGN, PROCUREMENT_PERMISSIONS.QUOTATION_CREATE],
  PROCESS: [PROCUREMENT_PERMISSIONS.ONBOARDING_PROCESS, PROCUREMENT_PERMISSIONS.QUOTATION_CREATE],
};

export const NDA_ANY = {
  VIEW: [
    PROCUREMENT_PERMISSIONS.NDA_VIEW,
    PROCUREMENT_PERMISSIONS.INVITE_VENDOR,
    PROCUREMENT_PERMISSIONS.SEND_RFQ,
  ],
  GENERATE: [
    PROCUREMENT_PERMISSIONS.NDA_GENERATE,
    PROCUREMENT_PERMISSIONS.INVITE_VENDOR,
    PROCUREMENT_PERMISSIONS.SEND_RFQ,
  ],
  SEND: [
    PROCUREMENT_PERMISSIONS.NDA_SEND,
    PROCUREMENT_PERMISSIONS.INVITE_VENDOR,
    PROCUREMENT_PERMISSIONS.SEND_RFQ,
  ],
  // Mirrors NDA_UPLOAD_SIGNED in nda_route.py exactly.
  UPLOAD_SIGNED: [
    PROCUREMENT_PERMISSIONS.NDA_UPLOAD,
    PROCUREMENT_PERMISSIONS.NDA_SEND,
    PROCUREMENT_PERMISSIONS.INVITE_VENDOR,
    PROCUREMENT_PERMISSIONS.SEND_RFQ,
  ],
};

export const VENDOR_AVAILABILITY_ANY = [
  PROCUREMENT_PERMISSIONS.VENDOR_AVAILABILITY_CHECK,
  PROCUREMENT_PERMISSIONS.VENDOR_SELECT,
  PROCUREMENT_PERMISSIONS.QUOTATION_VIEW,
];

/**
 * Any one of these lets a user land on the /procurement page at all — each tab inside it is
 * then independently gated by its own single permission (see ProcurementPage.jsx). Route-level
 * only; do not reuse for a specific tab or action check.
 */
export const PROCUREMENT_ANY_VIEW_PERMISSIONS = [
  PROCUREMENT_PERMISSIONS.PR_VIEW,
  PROCUREMENT_PERMISSIONS.PR_APPROVAL_VIEW,
  PROCUREMENT_PERMISSIONS.QUOTATION_VIEW,
  PROCUREMENT_PERMISSIONS.VENDOR_SELECTION_VIEW,
  PROCUREMENT_PERMISSIONS.PO_VIEW,
];

export default PROCUREMENT_PERMISSIONS;
