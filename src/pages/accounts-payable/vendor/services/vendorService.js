// src/pages/accounts-payable/vendor/services/vendorService.js
import api from "../../../../api/axiosInstance";

const BASE = window.__APP_CONFIG__.AP_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * Vendor Management API (Accounts Payable). Matches Backend/API_Layer/routes/vendor_route.py.
 */
export const vendorService = {
  /**
   * @param {{search?: string, statusId?: number, countryId?: number, skip?: number, limit?: number}} filters
   */
  getVendors: async ({ search, statusId, countryId, skip = 0, limit = 10 } = {}) => {
    const res = await api.get(`${BASE}/vendor`, {
      params: {
        search: search || undefined,
        status_id: statusId || undefined,
        country_id: countryId || undefined,
        skip,
        limit,
      },
      headers: authHeaders(),
    });
    return res.data;
  },

  getVendorById: async (id) => {
    const res = await api.get(`${BASE}/vendor/${id}`, { headers: authHeaders() });
    return res.data;
  },

  createVendor: async (payload) => {
    const res = await api.post(`${BASE}/vendor`, payload, { headers: authHeaders() });
    return res.data;
  },

  updateVendor: async (id, payload) => {
    const res = await api.put(`${BASE}/vendor/${id}`, payload, { headers: authHeaders() });
    return res.data;
  },

  updateVendorStatus: async (id, isActive) => {
    const res = await api.patch(
      `${BASE}/vendor/${id}/status`,
      { is_active: isActive },
      { headers: authHeaders() },
    );
    return res.data;
  },

  // ── Vendor-scoped collections ───────────────────────────────────────────
  // Each returns { vendor_id, count, items, ... } and an EMPTY items array (count 0) when the
  // vendor has no such records — 404 is reserved for the vendor itself not existing, so an
  // empty collection is a normal result and never an error state in the UI.

  /** GET /apm/vendor/{vendor_id}/purchase-orders — items are the PO module's PurchaseOrderDTO. */
  getVendorPurchaseOrders: async (vendorId, { skip = 0, limit = 100 } = {}) => {
    const res = await api.get(`${BASE}/vendor/${vendorId}/purchase-orders`, {
      params: { skip, limit },
      headers: authHeaders(),
    });
    return res.data;
  },

  /** GET /apm/vendor/{vendor_id}/ndas — items are the NDA module's VendorNdaDTO (no `content`). */
  getVendorNdas: async (vendorId) => {
    const res = await api.get(`${BASE}/vendor/${vendorId}/ndas`, { headers: authHeaders() });
    return res.data;
  },

  /** GET /apm/vendor/{vendor_id}/grns — items are the goods-receipt module's GoodsReceiptDTO. */
  getVendorGrns: async (vendorId, { skip = 0, limit = 100 } = {}) => {
    const res = await api.get(`${BASE}/vendor/${vendorId}/grns`, {
      params: { skip, limit },
      headers: authHeaders(),
    });
    return res.data;
  },

  /**
   * GET /apm/vendor/{vendor_id}/documents — every file already attached to this vendor's PO,
   * GRN, NDA and invoice-attachment records, in one list. Each item carries a short-lived
   * presigned `url` (null when one could not be minted) plus `counts_by_type`.
   */
  getVendorDocuments: async (vendorId, { expiresIn } = {}) => {
    const res = await api.get(`${BASE}/vendor/${vendorId}/documents`, {
      params: { expires_in: expiresIn || undefined },
      headers: authHeaders(),
    });
    return res.data;
  },
};

export default vendorService;
