import api from "../../../../api/axiosInstance";

const BASE = `${window.__APP_CONFIG__.AP_BASE_URL}/payment-runs`;
const run = (id) => `${BASE}/${encodeURIComponent(id)}`;

/** Payment runs API (/apm/payment-runs). */
export const paymentRunService = {
  async list() {
    const { data } = await api.get(BASE);
    return data;
  },
  async candidates(dueBy) {
    const { data } = await api.get(`${BASE}/candidates`, { params: dueBy ? { due_by: dueBy } : undefined });
    return data;
  },
  async create(body) {
    const { data } = await api.post(BASE, body);
    return data;
  },
  async detail(id) {
    const { data } = await api.get(run(id));
    return data;
  },
  async step(id, step, remarks) {
    const { data } = await api.post(`${run(id)}/${step}`, { remarks: remarks || null });
    return data;
  },
  async removeInvoice(id, invoiceId) {
    const { data } = await api.delete(`${run(id)}/invoices/${encodeURIComponent(invoiceId)}`);
    return data;
  },
  async bankFile(id, fileFormat) {
    const response = await api.get(`${run(id)}/bank-file`, { params: { file_format: fileFormat }, responseType: "blob" });
    return response;
  },
  async confirm(id, results) {
    const { data } = await api.post(`${run(id)}/confirm`, { results });
    return data;
  },
  async confirmFile(id, file) {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post(`${run(id)}/confirm-file`, form, { headers: { "Content-Type": "multipart/form-data" } });
    return data;
  },
};

export default paymentRunService;
