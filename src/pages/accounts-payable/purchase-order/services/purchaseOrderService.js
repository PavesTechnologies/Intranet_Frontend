// src/pages/accounts-payable/purchase-order/services/purchaseOrderService.js
import api from "../../../../api/axiosInstance";

const BASE = window.__APP_CONFIG__.AP_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * Purchase Order API. Matches Backend/API_Layer/routes/purchase_order_route.py
 * (/purchase-order), per the /apm/docs OpenAPI schema.
 */
export const purchaseOrderService = {
  getPurchaseOrders: async ({ vendorId, statusId, search, skip, limit } = {}) => {
    const res = await api.get(`${BASE}/purchase-order`, {
      params: {
        vendor_id: vendorId ?? undefined,
        status_id: statusId ?? undefined,
        search: search || undefined,
        skip,
        limit,
      },
      headers: authHeaders(),
    });
    return res.data;
  },

  getPurchaseOrderById: async (poId) => {
    const res = await api.get(`${BASE}/purchase-order/${poId}`, {
      headers: authHeaders(),
    });
    return res.data;
  },

  createPurchaseOrder: async (payload) => {
    const res = await api.post(`${BASE}/purchase-order`, payload, {
      headers: authHeaders(),
    });
    return res.data;
  },
};

export default purchaseOrderService;
