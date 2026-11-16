const BASE = "/accounts-payable";

export const AP_ROUTES = {
  DASHBOARD: `${BASE}/dashboard`,

  // The single vendor onboarding entry point: Register Vendor (intake) followed by
  // Pre-Screen, both steps on this one route.
  VENDOR_ONBOARD: `${BASE}/vendors/onboard`,

  VENDOR_LIST: `${BASE}/vendors`,

  // Internal Vendor Onboarding Requests — the Vendor Intaker's queue. Raised from
  // Procurement, processed here in Vendor Management.
  VENDOR_INTERNAL_REQUESTS: `${BASE}/vendors/internal-requests`,
  VENDOR_INTERNAL_REQUEST_DETAIL: (requestId = ":requestId") =>
    `${BASE}/vendors/internal-requests/${requestId}`,
  VENDOR_DETAIL: (vendorId = ":vendorId") =>
    `${BASE}/vendors/${vendorId}`,
  VENDOR_UPDATE: (vendorId = ":vendorId") =>
    `${BASE}/vendors/${vendorId}/edit`,

  INVOICE_UPLOAD: `${BASE}/invoices/upload`,
  INVOICE_OCR_REVIEW: `${BASE}/invoices/ocr-review`,
  INVOICE_VALIDATION: `${BASE}/invoices/validation`,
  INVOICE_LIST: `${BASE}/invoices`,
  INVOICE_DETAIL: (invoiceId = ":invoiceId") =>
    `${BASE}/invoices/${invoiceId}`,

  PAYMENT_QUEUE: `${BASE}/payment-queue`,
  PAYMENT_QUEUE_DETAIL: (reportId = ":reportId") =>
    `${BASE}/payment-queue/${reportId}`,

  PAYMENT_READY: `${BASE}/payments/ready`,
  PAYMENT_HISTORY: `${BASE}/payments/history`,
  PAYMENT_MARK_PAID: (invoiceId = ":invoiceId") =>
    `${BASE}/payments/mark-paid/${invoiceId}`,

  PAYMENT_QUEUE: `${BASE}/payment-queue`,
  PAYMENT_QUEUE_DETAIL: (reportId = ":reportId") =>
    `${BASE}/payment-queue/${reportId}`,

  REPORTS: `${BASE}/reports`,
  SETTINGS: `${BASE}/settings`,
  SYSTEM_CONFIG: `${BASE}/system-configuration`,
  SYSTEM_CONFIG_APPROVAL_POLICY_NEW: `${BASE}/system-configuration/approval-policies/new`,
  SYSTEM_CONFIG_APPROVAL_POLICY_EDIT: (policyId = ":policyId") =>
    `${BASE}/system-configuration/approval-policies/${policyId}/edit`,

  PROCUREMENT: `${BASE}/procurement`,
  PROCUREMENT_PR_DETAIL: (prId = ":prId") => `${BASE}/procurement/requisitions/${prId}`,
  PROCUREMENT_PO_DETAIL: (poId = ":poId") => `${BASE}/procurement/purchase-orders/${poId}`,
  PROCUREMENT_RFQ_DETAIL: (rfqId = ":rfqId") => `${BASE}/procurement/rfqs/${rfqId}`,
};