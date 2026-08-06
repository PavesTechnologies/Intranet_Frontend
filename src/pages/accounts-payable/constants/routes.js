const BASE = "/accounts-payable";

/**
 * Single source of truth for AP route paths — used by App.jsx <Route path>, the sidebar
 * submenu config, and any in-page navigate()/<Link to> calls, so a path never needs to be
 * hardcoded more than once.
 *
 * Parameterized routes are functions with a default of the router placeholder (":vendorId"),
 * so the same definition serves both the route table (AP_ROUTES.VENDOR_DETAIL()) and runtime
 * navigation (AP_ROUTES.VENDOR_DETAIL(vendor.id)).
 */
export const AP_ROUTES = {
  DASHBOARD: `${BASE}/dashboard`,

  VENDOR_ONBOARD: `${BASE}/vendors/onboard`,
  VENDOR_LIST: `${BASE}/vendors`,
  VENDOR_DETAIL: (vendorId = ":vendorId") => `${BASE}/vendors/${vendorId}`,
  VENDOR_UPDATE: (vendorId = ":vendorId") => `${BASE}/vendors/${vendorId}/edit`,

  INVOICE_UPLOAD: `${BASE}/invoices/upload`,
  INVOICE_OCR_REVIEW: `${BASE}/invoices/ocr-review`,
  INVOICE_VALIDATION: `${BASE}/invoices/validation`,
  INVOICE_LIST: `${BASE}/invoices`,
  INVOICE_DETAIL: (invoiceId = ":invoiceId") => `${BASE}/invoices/${invoiceId}`,

  PAYMENT_READY: `${BASE}/payments/ready`,
  PAYMENT_HISTORY: `${BASE}/payments/history`,
  PAYMENT_MARK_PAID: (invoiceId = ":invoiceId") => `${BASE}/payments/mark-paid/${invoiceId}`,

  REPORTS: `${BASE}/reports`,
  SETTINGS: `${BASE}/settings`,
};
