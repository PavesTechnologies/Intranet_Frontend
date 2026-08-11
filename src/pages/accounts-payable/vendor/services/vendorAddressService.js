// src/pages/accounts-payable/vendor/services/vendorAddressService.js
import api from "../../../../api/axiosInstance";

const BASE = window.__APP_CONFIG__.AP_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * Vendor Address API — nested under a vendor.
 * Matches Backend/API_Layer/routes/vendor_route.py (/vendor/{vendor_id}/addresses).
 */
export const vendorAddressService = {
  createAddress: async (vendorId, payload) => {
    const res = await api.post(`${BASE}/vendor/${vendorId}/addresses`, payload, {
      headers: authHeaders(),
    });
    return res.data;
  },

  updateAddress: async (vendorId, addressId, payload) => {
    const res = await api.put(
      `${BASE}/vendor/${vendorId}/addresses/${addressId}`,
      payload,
      { headers: authHeaders() },
    );
    return res.data;
  },

  deleteAddress: async (vendorId, addressId) => {
    const res = await api.delete(`${BASE}/vendor/${vendorId}/addresses/${addressId}`, {
      headers: authHeaders(),
    });
    return res.data;
  },
};

export default vendorAddressService;
