// src/pages/accounts-payable/procurement/services/vendorOnboardingService.js
import api from "../../../../api/axiosInstance";

const AP_BASE = window.__APP_CONFIG__.AP_BASE_URL;
const BASE = `${AP_BASE}/vendor-onboarding-requests`;
const PROCUREMENT_BASE = `${AP_BASE}/procurement`;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * Vendor Availability + Vendor Onboarding Request API — the branch a PR takes when no vendor
 * is available for its department/category. Matches
 * Backend/API_Layer/routes/vendor_onboarding_route.py (mounted at /apm/vendor-onboarding-requests)
 * plus the vendor-availability endpoint on the procurement router.
 *
 * The onboarding request owns the PR context: department, purchase category, business
 * requirement and purpose are read from the request server-side, which is why neither the
 * create nor the start payload accepts them.
 */
export const vendorOnboardingService = {
  // ── Vendor Availability (PR Officer) ──────────────────────────────────────

  /**
   * GET /apm/procurement/purchase-requisitions/{pr_id}/vendor-availability
   * @returns {Promise<{pr_id:number, department_id:number, purchase_category_id:number,
   *   available:boolean, vendors:{vendor_id:number, vendor_name:string,
   *   vendor_code:string|null, email:string|null}[]}>}
   */
  checkVendorAvailability: async (prId) => {
    const res = await api.get(
      `${PROCUREMENT_BASE}/purchase-requisitions/${prId}/vendor-availability`,
      { headers: authHeaders() },
    );
    return res.data;
  },

  // ── Vendor Onboarding Request ─────────────────────────────────────────────

  /**
   * POST /apm/vendor-onboarding-requests — department/category are taken from the PR, never
   * sent from here, so the onboarding context can't drift from the requisition it belongs to.
   * @param {{pr_id:number, business_requirement?:string|null, purpose_of_onboarding?:string|null,
   *   requested_vendor_name?:string|null, requested_vendor_email?:string|null,
   *   assigned_to?:string|null}} payload
   */
  createOnboardingRequest: async (payload) => {
    const res = await api.post(BASE, payload, { headers: authHeaders() });
    return res.data;
  },

  /** @param {{prId?:number|string, statusId?:number, assignedTo?:string, vendorId?:number}} filters */
  listOnboardingRequests: async ({ prId, statusId, assignedTo, vendorId, skip = 0, limit = 100 } = {}) => {
    const res = await api.get(BASE, {
      params: {
        pr_id: prId || undefined,
        status_id: statusId || undefined,
        assigned_to: assignedTo || undefined,
        vendor_id: vendorId || undefined,
        skip,
        limit,
      },
      headers: authHeaders(),
    });
    return res.data;
  },

  getOnboardingRequest: async (requestId) => {
    const res = await api.get(`${BASE}/${requestId}`, { headers: authHeaders() });
    return res.data;
  },

  /** PATCH /{request_id}/assign — hands the request to a Vendor Intaker. */
  assignOnboardingRequest: async (requestId, assignedTo) => {
    const res = await api.patch(
      `${BASE}/${requestId}/assign`,
      { assigned_to: assignedTo },
      { headers: authHeaders() },
    );
    return res.data;
  },

  updateOnboardingStatus: async (requestId, { statusCode, reason } = {}) => {
    const res = await api.patch(
      `${BASE}/${requestId}/status`,
      { status_code: statusCode, reason: reason || undefined },
      { headers: authHeaders() },
    );
    return res.data;
  },

  /**
   * POST /{request_id}/start — runs the existing Vendor Intake for this request. The payload
   * is vendor identity only (VendorOnboardingStartRequest); department, category, business
   * requirement and purpose come from the onboarding request itself.
   */
  startOnboarding: async (requestId, payload) => {
    const res = await api.post(`${BASE}/${requestId}/start`, payload, { headers: authHeaders() });
    return res.data;
  },

  /**
   * POST /{request_id}/pre-screen — runs Pre-Screen and moves the onboarding request to the
   * matching status. Returns the verdict only (result/reason/nda_recommended); the per-check
   * breakdown comes from the Vendor Intake pre-screen response for the same engagement.
   */
  runPreScreen: async (requestId) => {
    const res = await api.post(`${BASE}/${requestId}/pre-screen`, null, { headers: authHeaders() });
    return res.data;
  },

  /** POST /{request_id}/complete — closes onboarding and makes the vendor available to the PR. */
  completeOnboarding: async (requestId) => {
    const res = await api.post(`${BASE}/${requestId}/complete`, null, { headers: authHeaders() });
    return res.data;
  },
};

export default vendorOnboardingService;
