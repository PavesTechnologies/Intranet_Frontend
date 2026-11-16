import api from "../../../../api/axiosInstance";

const BASE = `${window.__APP_CONFIG__.AP_BASE_URL}/gst/itc`;

/** GST input tax credit register API (/apm/gst/itc). */
export const gstItcService = {
  async register(month) {
    const { data } = await api.get(BASE, { params: month ? { month } : undefined });
    return data;
  },
  async claim(period) {
    const { data } = await api.post(`${BASE}/claim`, { period });
    return data;
  },
  async setIrn(invoiceId, irn, ackNo) {
    const { data } = await api.put(`${BASE}/${encodeURIComponent(invoiceId)}/irn`, { irn, ack_no: ackNo || null });
    return data;
  },
  async setEligibility(invoiceId, eligibility, reason) {
    const { data } = await api.put(`${BASE}/${encodeURIComponent(invoiceId)}/eligibility`, { eligibility, reason });
    return data;
  },
  async reverse(invoiceIds, period) {
    const { data } = await api.post(`${BASE}/reverse`, { invoice_ids: invoiceIds, period });
    return data;
  },
  async reclaim(invoiceIds, period) {
    const { data } = await api.post(`${BASE}/reclaim`, { invoice_ids: invoiceIds, period });
    return data;
  },
};

export default gstItcService;
