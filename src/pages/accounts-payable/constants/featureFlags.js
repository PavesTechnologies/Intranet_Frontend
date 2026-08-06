/**
 * Lightweight static feature flags for AP capabilities called out as future scalability
 * in the architecture doc — not wired to any remote flag service (this codebase has none).
 * Flip a boolean directly once a capability ships, or swap this file for a real flag
 * provider later without changing call sites.
 */
export const AP_FEATURE_FLAGS = {
  ENABLE_REPORTS: false, // deferred from MVP
  ENABLE_BULK_PAYMENT_BATCHING: false,
  ENABLE_VENDOR_SELF_SERVICE_PORTAL: false,
  ENABLE_REAL_OCR_BACKEND: false, // false = mock OCR simulation in mocks/apFixtures.js + services
};
