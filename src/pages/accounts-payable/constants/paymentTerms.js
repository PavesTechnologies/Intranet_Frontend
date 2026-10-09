/**
 * Payment-term compliance + vendor agreement codes, exactly as the backend issues them
 * (Backend/Business_Layer/services/payment_term_compliance_service.py,
 * Backend/API_Layer/routes/payment_terms_route.py). The backend decides every status — the
 * frontend only labels and gates on them.
 */
export const PAYMENT_TERM_PERMISSIONS = {
  // POST /invoice/{id}/payment-terms/verify — resolves a MISMATCH / REVIEW_REQUIRED (Finance).
  INVOICE_PAYMENT_TERM_VERIFY: "INVOICE_PAYMENT_TERM_VERIFY",
  // POST /vendor-agreements/{id}/verify|reject — four-eyes: never the uploader.
  VENDOR_AGREEMENT_VERIFY: "VENDOR_AGREEMENT_VERIFY",
};

// GET /invoice/{id}/payment-terms and /payment-terms/exceptions accept any of these.
export const PAYMENT_TERM_VIEW_PERMISSIONS = [
  "INVOICE_VIEW",
  "PAYMENT_VIEW",
  "PAYMENT_PROCESS",
  PAYMENT_TERM_PERMISSIONS.INVOICE_PAYMENT_TERM_VERIFY,
];
// POST /invoice/{id}/payment-terms/recheck
export const PAYMENT_TERM_RECHECK_PERMISSIONS = [
  PAYMENT_TERM_PERMISSIONS.INVOICE_PAYMENT_TERM_VERIFY,
  "PAYMENT_PROCESS",
  "INVOICE_OCR_REVIEW",
];
// Vendor agreements: readable/uploadable by these permissions OR the vendor-manager roles.
export const AGREEMENT_VIEW_PERMISSIONS = [
  PAYMENT_TERM_PERMISSIONS.VENDOR_AGREEMENT_VERIFY,
  PAYMENT_TERM_PERMISSIONS.INVOICE_PAYMENT_TERM_VERIFY,
  "PAYMENT_VIEW",
  "PAYMENT_PROCESS",
  "INVOICE_VIEW",
];
export const AGREEMENT_EDIT_PERMISSIONS = [
  PAYMENT_TERM_PERMISSIONS.VENDOR_AGREEMENT_VERIFY,
  PAYMENT_TERM_PERMISSIONS.INVOICE_PAYMENT_TERM_VERIFY,
  "PAYMENT_PROCESS",
];

export const PAYMENT_TERM_STATUS = {
  COMPLIANT: "COMPLIANT",
  MISMATCH: "MISMATCH",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  VERIFIED_OVERRIDE: "VERIFIED_OVERRIDE",
};

// Only these let an invoice be marked ready for payment (backend-enforced).
export const PAYABLE_TERM_STATUSES = [PAYMENT_TERM_STATUS.COMPLIANT, PAYMENT_TERM_STATUS.VERIFIED_OVERRIDE];

export const PAYMENT_TERM_STATUS_META = {
  COMPLIANT: { label: "Compliant", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  VERIFIED_OVERRIDE: { label: "Verified", className: "bg-blue-100 text-blue-800 border-blue-300" },
  MISMATCH: { label: "Term mismatch", className: "bg-amber-100 text-amber-800 border-amber-300" },
  REVIEW_REQUIRED: { label: "Review required", className: "bg-rose-100 text-rose-800 border-rose-300" },
};

export const REFERENCE_SOURCE_LABELS = {
  PO: "Purchase order",
  AGREEMENT: "Vendor agreement",
  VENDOR_MASTER: "Vendor master",
  MANUAL: "Verified manually",
  NONE: "No reference",
};

export const DUE_BASIS_OPTIONS = [
  { value: "INVOICE_DATE", label: "Invoice date" },
  { value: "GRN_DATE", label: "Goods receipt (GRN) date" },
];

export const AGREEMENT_TYPE_OPTIONS = [
  { value: "LEASE", label: "Lease / rent" },
  { value: "MSA", label: "Master services agreement" },
  { value: "SOW", label: "Statement of work" },
  { value: "SUBSCRIPTION", label: "Subscription / licence" },
  { value: "RATE_CONTRACT", label: "Rate contract" },
  { value: "OTHER", label: "Other" },
];

export const AGREEMENT_STATUS_META = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-700 border-gray-300" },
  PENDING_VERIFICATION: { label: "Pending verification", className: "bg-amber-100 text-amber-800 border-amber-300" },
  ACTIVE: { label: "Active", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  REJECTED: { label: "Rejected", className: "bg-rose-100 text-rose-800 border-rose-300" },
  SUPERSEDED: { label: "Superseded", className: "bg-slate-100 text-slate-600 border-slate-300" },
};

export const MSME_CATEGORY_OPTIONS = [
  { value: "MICRO", label: "Micro" },
  { value: "SMALL", label: "Small" },
  { value: "MEDIUM", label: "Medium" },
];

/** Management (CEO / Chief Product Officer) reporting permissions — created in UMS, read-only by design. */
export const AP_MANAGEMENT_PERMISSIONS = {
  DASHBOARD_VIEW: "AP_MANAGEMENT_DASHBOARD_VIEW",
  REPORTS_VIEW: "AP_MANAGEMENT_REPORTS_VIEW",
  REPORTS_EXPORT: "AP_MANAGEMENT_REPORTS_EXPORT",
};
export const AP_MANAGEMENT_ANY = Object.values(AP_MANAGEMENT_PERMISSIONS);
