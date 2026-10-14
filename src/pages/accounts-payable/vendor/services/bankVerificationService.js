import api from "../../../../api/axiosInstance";

const BASE = `${window.__APP_CONFIG__.AP_BASE_URL}/vendor-bank-verification`;
const bank = (vendorId, bankId) => `${BASE}/vendor/${encodeURIComponent(vendorId)}/bank/${encodeURIComponent(bankId)}`;

/** Vendor bank verification + approval API (/apm/vendor-bank-verification). */
export const bankVerificationService = {
  async forVendor(vendorId) {
    const { data } = await api.get(`${BASE}/vendor/${encodeURIComponent(vendorId)}`);
    return data;
  },
  async pennyDrop(vendorId, bankId) {
    const { data } = await api.post(`${bank(vendorId, bankId)}/penny-drop`);
    return data;
  },
  async document(vendorId, bankId, file, remarks) {
    const form = new FormData();
    form.append("file", file);
    form.append("remarks", remarks);
    const { data } = await api.post(`${bank(vendorId, bankId)}/document`, form, { headers: { "Content-Type": "multipart/form-data" } });
    return data;
  },
  async approve(vendorId, bankId, remarks) {
    const { data } = await api.post(`${bank(vendorId, bankId)}/approve`, { remarks: remarks || null });
    return data;
  },
  async reject(vendorId, bankId, remarks) {
    const { data } = await api.post(`${bank(vendorId, bankId)}/reject`, { remarks });
    return data;
  },
};

export default bankVerificationService;
