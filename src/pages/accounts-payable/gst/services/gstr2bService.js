import api from "../../../../api/axiosInstance";

const BASE = `${window.__APP_CONFIG__.AP_BASE_URL}/gst/gstr2b`;

/** GSTR-2B reconciliation API (/apm/gst/gstr2b). */
export const gstr2bService = {
  async reconciliation(period) {
    const { data } = await api.get(BASE, { params: period ? { period } : undefined });
    return data;
  },
  async importFile(file, period) {
    const form = new FormData();
    form.append("file", file);
    if (period) form.append("period", period);
    const { data } = await api.post(`${BASE}/import`, form, { headers: { "Content-Type": "multipart/form-data" } });
    return data;
  },
  async template() {
    const response = await api.get(`${BASE}/template`, { responseType: "blob" });
    return response.data;
  },
};

export default gstr2bService;
