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
};

export default vendorService;
