// src/pages/accounts-payable/vendor-intake/services/vendorIntakeService.js
import api from "../../../../api/axiosInstance";

const BASE = window.__APP_CONFIG__.AP_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * Vendor Intake -> Pre-Screen API (Accounts Payable). Matches
 * Backend/API_Layer/routes/vendor_intake_route.py (mounted at /apm/vendor-intake).
 *
 * This is what the Register Vendor page submits. The existing Vendor Management CRUD
 * (PUT/PATCH /apm/vendor via vendorService.js) is untouched.
 */
export const vendorIntakeService = {
  /**
   * POST /apm/vendor-intake — saves the intake and creates (or reuses) the vendor master.
   * @param {object} payload VendorIntakeCreateRequest
   * @returns {Promise<{engagement_id:number, vendor_id:number, vendor_created:boolean,
   *   pre_screen_status:string, gst_status?:string, message:string}>}
   */
  createVendorIntake: async (payload) => {
    const res = await api.post(`${BASE}/vendor-intake`, payload, { headers: authHeaders() });
    return res.data;
  },

  /** GET /apm/vendor-intake/{engagement_id} — VendorEngagementDTO. */
  getVendorIntake: async (engagementId) => {
    const res = await api.get(`${BASE}/vendor-intake/${engagementId}`, { headers: authHeaders() });
    return res.data;
  },

  /** GET /apm/vendor-intake/vendor/{vendor_id} — every engagement already on file for a vendor. */
  getVendorEngagementsByVendor: async (vendorId) => {
    const res = await api.get(`${BASE}/vendor-intake/vendor/${vendorId}`, {
      headers: authHeaders(),
    });
    return res.data;
  },

  /**
   * POST /apm/vendor-intake/{engagement_id}/pre-screen — runs the backend checks and
   * returns PASS / NEED_INFORMATION / FAIL plus the per-check breakdown. The backend is
   * the only place the result is decided.
   * @returns {Promise<{engagement_id:number, result:string, reason?:string,
   *   checks:{name:string, passed:boolean, reason?:string}[], nda_recommended:boolean}>}
   */
  runPreScreen: async (engagementId) => {
    const res = await api.post(
      `${BASE}/vendor-intake/${engagementId}/pre-screen`,
      {},
      { headers: authHeaders() },
    );
    return res.data;
  },

  /**
   * PATCH /apm/vendor-intake/{engagement_id}/nda-decision.
   * `overrideRequired` null accepts the recommendation as-is; set to a boolean it overrides
   * it, and the backend then requires a reason.
   */
  updateNdaDecision: async (engagementId, { overrideRequired = null, reason = null } = {}) => {
    const res = await api.patch(
      `${BASE}/vendor-intake/${engagementId}/nda-decision`,
      { override_required: overrideRequired, reason },
      { headers: authHeaders() },
    );
    return res.data;
  },

  // ── Vendor Screening Rules (business-rule engine admin config) ─────────────
  // No admin screen consumes these yet; they're here so the screening-rule endpoints
  // live with the rest of the intake API surface rather than in a second place later.

  getScreeningRules: async () => {
    const res = await api.get(`${BASE}/vendor-intake/screening-rules`, {
      headers: authHeaders(),
    });
    return res.data;
  },

  createScreeningRule: async (payload) => {
    const res = await api.post(`${BASE}/vendor-intake/screening-rules`, payload, {
      headers: authHeaders(),
    });
    return res.data;
  },

  updateScreeningRule: async (ruleId, payload) => {
    const res = await api.put(`${BASE}/vendor-intake/screening-rules/${ruleId}`, payload, {
      headers: authHeaders(),
    });
    return res.data;
  },
};

export default vendorIntakeService;
