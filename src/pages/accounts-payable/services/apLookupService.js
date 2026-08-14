// src/pages/accounts-payable/services/apLookupService.js
import api from "../../../api/axiosInstance";

const BASE = window.__APP_CONFIG__.AP_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * Shared Accounts Payable master-data lookups (country/currency/payment
 * term/vendor status/GSTIN). Not vendor-specific — other AP sub-modules
 * (invoice, payment) can reuse these as they come off mock data.
 */
export const apLookupService = {
  getCountries: async () => {
    const res = await api.get(`${BASE}/system/country`, { headers: authHeaders() });
    return res.data;
  },

  getCurrencies: async () => {
    const res = await api.get(`${BASE}/system/currency`, { headers: authHeaders() });
    return res.data;
  },

  getPaymentTerms: async () => {
    const res = await api.get(`${BASE}/master/payment-term`, { headers: authHeaders() });
    return res.data;
  },

  getVendorStatuses: async () => {
    const res = await api.get(`${BASE}/system/status`, {
      params: { module_name: "VENDOR" },
      headers: authHeaders(),
    });
    return res.data;
  },

  getPoStatuses: async () => {
    const res = await api.get(`${BASE}/system/status`, {
      params: { module_name: "PO" },
      headers: authHeaders(),
    });
    return res.data;
  },

  getGstinDetails: async (gstin) => {
    const res = await api.get(`${BASE}/system/gstin/${encodeURIComponent(gstin)}`, {
      headers: authHeaders(),
    });

    return res.data.data.data; // returns only the GST details
  },
};

export default apLookupService;
