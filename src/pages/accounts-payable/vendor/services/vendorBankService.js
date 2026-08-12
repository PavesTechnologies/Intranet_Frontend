// src/pages/accounts-payable/vendor/services/vendorBankService.js
import api from "../../../../api/axiosInstance";

const BASE = window.__APP_CONFIG__.AP_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * Vendor Bank API — nested under a vendor.
 * Matches Backend/API_Layer/routes/vendor_route.py (/vendor/{vendor_id}/banks).
 */
export const vendorBankService = {
  createBank: async (vendorId, payload) => {
    const res = await api.post(`${BASE}/vendor/${vendorId}/banks`, payload, {
      headers: authHeaders(),
    });
    return res.data;
  },

  updateBank: async (vendorId, bankId, payload) => {
    const res = await api.put(`${BASE}/vendor/${vendorId}/banks/${bankId}`, payload, {
      headers: authHeaders(),
    });
    return res.data;
  },

  deleteBank: async (vendorId, bankId) => {
    const res = await api.delete(`${BASE}/vendor/${vendorId}/banks/${bankId}`, {
      headers: authHeaders(),
    });
    return res.data;
  },
};

export default vendorBankService;
