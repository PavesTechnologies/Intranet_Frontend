// src/pages/accounts-payable/vendor/services/vendorTaxService.js
import api from "../../../../api/axiosInstance";

const BASE = window.__APP_CONFIG__.AP_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * Vendor Tax API — scoped to a vendor address, not the vendor directly.
 * Matches Backend/API_Layer/routes/vendor_route.py (/vendor/addresses/{vendor_address_id}/taxes).
 */
export const vendorTaxService = {
  createTax: async (vendorAddressId, payload) => {
    const res = await api.post(`${BASE}/vendor/addresses/${vendorAddressId}/taxes`, payload, {
      headers: authHeaders(),
    });
    return res.data;
  },

  updateTax: async (vendorAddressId, taxId, payload) => {
    const res = await api.put(
      `${BASE}/vendor/addresses/${vendorAddressId}/taxes/${taxId}`,
      payload,
      { headers: authHeaders() },
    );
    return res.data;
  },

  deleteTax: async (vendorAddressId, taxId) => {
    const res = await api.delete(
      `${BASE}/vendor/addresses/${vendorAddressId}/taxes/${taxId}`,
      { headers: authHeaders() },
    );
    return res.data;
  },
};

export default vendorTaxService;
