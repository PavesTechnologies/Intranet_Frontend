// src/pages/accounts-payable/procurement/services/rfqService.js
import api from "../../../../api/axiosInstance";

const BASE = `${window.__APP_CONFIG__.AP_BASE_URL}/rfq`;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * RFQ (Request for Quotation) API — the sourcing step between an APPROVED purchase
 * requisition and its quotations. Matches Backend/API_Layer/routes/rfq_route.py
 * (mounted at /apm/rfq).
 */
export const rfqService = {
  createRfq: async (prId, dueDate) => {
    const res = await api.post(
      `${BASE}/`,
      { pr_id: prId, due_date: dueDate || undefined },
      { headers: authHeaders() },
    );
    return res.data;
  },

  /**
   * @param {{prId?: number, statusId?: number, skip?: number, limit?: number}} filters
   */
  getRfqs: async ({ prId, statusId, skip = 0, limit = 100 } = {}) => {
    const res = await api.get(`${BASE}/`, {
      params: {
        pr_id: prId || undefined,
        status_id: statusId || undefined,
        skip,
        limit,
      },
      headers: authHeaders(),
    });
    return res.data;
  },

  getRfqById: async (rfqId) => {
    const res = await api.get(`${BASE}/${rfqId}`, { headers: authHeaders() });
    return res.data;
  },

  inviteVendors: async (rfqId, vendorIds) => {
    const res = await api.post(
      `${BASE}/${rfqId}/vendors`,
      { vendor_ids: vendorIds },
      { headers: authHeaders() },
    );
    return res.data;
  },

  getRfqVendors: async (rfqId) => {
    const res = await api.get(`${BASE}/${rfqId}/vendors`, { headers: authHeaders() });
    return res.data;
  },

  /**
 * Send RFQ to selected invited vendors.
 *
 * @param {number|string} rfqId
 * @param {number[]} vendorIds - Selected invited vendor IDs
 */
sendRfq: async (rfqId, vendorIds) => {
  const res = await api.post(
    `${BASE}/${rfqId}/send`,
    {
      vendor_ids: vendorIds,
    },
    {
      headers: authHeaders(),
    },
  );

  return res.data;
},

  closeRfq: async (rfqId) => {
    const res = await api.post(`${BASE}/${rfqId}/close`, null, { headers: authHeaders() });
    return res.data;
  },

  getQuotationsForRfq: async (rfqId) => {
    const res = await api.get(`${BASE}/${rfqId}/quotations`, { headers: authHeaders() });
    return res.data;
  },

  // ── RFQ Eligibility ───────────────────────────────────────────────────────
  // Whether a vendor may take part in a PR's RFQ is decided entirely by
  // Backend/Business_Layer/services/rfq_eligibility_service.py (PR / VENDOR / ONBOARDING /
  // PRE_SCREEN / NDA gates). RFQService.require_eligible re-runs the same check server-side,
  // so these calls are for showing the reason, never for enforcing the rule.

  /**
   * GET /apm/rfq/eligibility?pr_id=&vendor_id=
   * @returns {Promise<{pr_id:number, vendor_id:number, eligible:boolean, reason:string|null,
   *   checks:{check:string, status:string, passed:boolean, message:string|null}[],
   *   failed_checks:{check:string, status:string, passed:boolean, message:string|null}[]}>}
   */
  getRfqEligibility: async (prId, vendorId) => {
    const res = await api.get(`${BASE}/eligibility`, {
      params: { pr_id: prId, vendor_id: vendorId },
      headers: authHeaders(),
    });
    return res.data;
  },

  /**
   * POST /apm/rfq/eligibility/check — one call for a whole vendor list.
   * @returns {Promise<{pr_id:number, results:object[]}>}
   */
  checkRfqEligibility: async (prId, vendorIds) => {
    const res = await api.post(
      `${BASE}/eligibility/check`,
      { pr_id: Number(prId), vendor_ids: vendorIds.map(Number) },
      { headers: authHeaders() },
    );
    return res.data;
  },
};

export default rfqService;
