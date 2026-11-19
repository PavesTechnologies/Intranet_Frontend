import api from "../../../../api/axiosInstance";

const BASE = `${window.__APP_CONFIG__.AP_BASE_URL}/vendor-notes`;

/** Credit / debit notes API (/apm/vendor-notes). */
export const vendorNoteService = {
  async list(params = {}) {
    const { data } = await api.get(BASE, { params });
    return data;
  },
  async applicableInvoices(vendorId) {
    const { data } = await api.get(`${BASE}/applicable-invoices`, { params: { vendor_id: vendorId } });
    return data;
  },
  async record(payload, file) {
    const form = new FormData();
    form.append("payload", JSON.stringify(payload));
    if (file) form.append("file", file);
    const { data } = await api.post(BASE, form, { headers: { "Content-Type": "multipart/form-data" } });
    return data;
  },
  async apply(noteId, invoiceId) {
    const { data } = await api.post(`${BASE}/${encodeURIComponent(noteId)}/apply`, { invoice_id: Number(invoiceId) });
    return data;
  },
  async cancel(noteId, reason) {
    const { data } = await api.post(`${BASE}/${encodeURIComponent(noteId)}/cancel`, { reason });
    return data;
  },
  async document(noteId) {
    const response = await api.get(`${BASE}/${encodeURIComponent(noteId)}/document`, { responseType: "blob" });
    return response.data;
  },
};

export default vendorNoteService;
