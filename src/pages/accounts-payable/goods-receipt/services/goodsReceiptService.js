// src/pages/accounts-payable/goods-receipt/services/goodsReceiptService.js
import api from "../../../../api/axiosInstance";

const BASE = window.__APP_CONFIG__.AP_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * Goods Receipt (GRN) API. Matches Backend/API_Layer/routes/goods_receipt_route.py
 * (/goods-receipt), per the /apm/docs OpenAPI schema.
 */
export const goodsReceiptService = {
  getGoodsReceipts: async ({ vendorId, poId, skip, limit } = {}) => {
    const res = await api.get(`${BASE}/goods-receipt`, {
      params: {
        vendor_id: vendorId ?? undefined,
        po_id: poId ?? undefined,
        skip,
        limit,
      },
      headers: authHeaders(),
    });
    return res.data;
  },

  createGoodsReceipt: async (payload) => {
    const res = await api.post(`${BASE}/goods-receipt`, payload, {
      headers: authHeaders(),
    });
    return res.data;
  },
};

export default goodsReceiptService;
