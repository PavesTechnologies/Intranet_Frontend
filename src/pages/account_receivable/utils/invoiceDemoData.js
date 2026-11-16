/**
 * Demo business and company master data for enterprise customer-facing invoice presentation.
 *
 * IMPORTANT ARCHITECTURAL RULE:
 * These are frontend demo values for missing company/client master data.
 * All backend-authoritative data (invoice numbers, dates, billing periods,
 * item quantities, rates, amounts, tax calculations, and status) must NEVER
 * be overridden by demo data.
 *
 * Priority order:
 * 1. Backend invoice data
 * 2. Backend billing snapshot data
 * 3. Existing tax calculation data
 * 4. Frontend demo fallback only for missing company/client master information
 */

export const DEMO_SELLER = {
  legalName: "Paves Global Infotech Private Limited",
  addressLines: [
    "Chamber 12, 8th floor, Tower 1,",
    "Vasavi Sky City, Telcom Nagar,",
    "Gachibowli",
  ],
  city: "Hyderabad",
  state: "Telangana",
  country: "India",
  postalCode: "500037",
  fullAddress:
    "Chamber 12, 8th floor, Tower 1, Vasavi Sky City, Telcom Nagar, Gachibowli, Hyderabad, Telangana - 500037, India",
  gstin: "36AAPCP4212K1Z6",
  email: "contact@paves technologies.com",
  phone: "9059364400",
};

export const DEMO_CLIENT = {
  legalName: "Account Management",
  billingAddress: "Not provided",
  gstin: "Not provided",
  contact: "Not provided",
  email: "Not provided",
  phone: "Not provided",
  state: "Not provided",
};

export const DEMO_PROJECT = {
  name: "Website Redesign",
  code: "PRJ-23",
};

export const DEMO_TAX_CONTEXT = {
  supplierState: "Telangana",
  customerState: "Not provided",
  placeOfSupply: "Telangana",
  taxRegion: "India",
};

export const DEMO_TERMS = {
  paymentTerms: "Net 30",
  billingPeriod: "05 Aug 2026 - 05 Sep 2026",
};

/**
 * Demo delivery lifecycle constants.
 * These track client delivery status SEPARATELY from the invoice approval status.
 *
 * Invoice Status: GENERATED → PENDING_APPROVAL → APPROVED
 * Delivery Status: NOT_SENT → SENT_TO_CLIENT
 *
 * IMPORTANT: These values are for demo frontend simulation only.
 * No real email is ever sent. Backend is never modified.
 */
export const DEMO_DELIVERY_STATUS = {
  NOT_SENT: "NOT_SENT",
  SENT_TO_CLIENT: "SENT_TO_CLIENT",
};

/** The user identity shown for demo delivery actions. */
export const DEMO_SENT_BY = "Paves Admin";

/** localStorage namespace — deliberately isolated to avoid touching invoice financial data. */
const DELIVERY_STORAGE_KEY = "paves_ar_demo_delivery";

/**
 * Load all persisted demo delivery records from localStorage.
 * Returns a map of invoiceId → { deliveryStatus, sentAt, sentBy }
 */
export function loadDemoDeliveryMap() {
  try {
    const raw = localStorage.getItem(DELIVERY_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Mark a specific invoice as sent to client in the demo delivery store.
 * Only stores: deliveryStatus, sentAt, sentBy — never financial data.
 */
export function saveDemoDelivery(invoiceId, entry) {
  if (!invoiceId) return;
  try {
    const map = loadDemoDeliveryMap();
    map[invoiceId] = {
      deliveryStatus: entry.deliveryStatus,
      sentAt: entry.sentAt,
      sentBy: entry.sentBy,
    };
    localStorage.setItem(DELIVERY_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage quota or security errors — silently ignore in demo
  }
}

/**
 * Read demo delivery state for a single invoiceId.
 * Returns { deliveryStatus: "NOT_SENT", sentAt: null, sentBy: null } if not found.
 */
export function getDemoDelivery(invoiceId) {
  if (!invoiceId) return { deliveryStatus: DEMO_DELIVERY_STATUS.NOT_SENT, sentAt: null, sentBy: null };
  const map = loadDemoDeliveryMap();
  return map[invoiceId] || { deliveryStatus: DEMO_DELIVERY_STATUS.NOT_SENT, sentAt: null, sentBy: null };
}
