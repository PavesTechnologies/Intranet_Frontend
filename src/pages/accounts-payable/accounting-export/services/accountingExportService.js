import api from "../../../../api/axiosInstance";

const BASE = `${window.__APP_CONFIG__.AP_BASE_URL}/accounting-export`;

/** Accounting export API (/apm/accounting-export). */
export const accountingExportService = {
  async ledgers() {
    const { data } = await api.get(`${BASE}/ledgers`);
    return data;
  },
  async updateLedgers(body) {
    const { data } = await api.put(`${BASE}/ledgers`, body);
    return data;
  },
  async preview({ dateFrom, dateTo, types, includeExported }) {
    const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo, include_exported: includeExported ? "true" : "false" });
    (types || []).forEach((t) => params.append("types", t));
    const { data } = await api.get(`${BASE}/preview`, { params });
    return data;
  },
  async exportFile({ dateFrom, dateTo, format, types, includeExported, includeMasters }) {
    return api.post(`${BASE}/export`, {
      date_from: dateFrom, date_to: dateTo, export_format: format, types,
      include_exported: includeExported, include_masters: includeMasters,
    }, { responseType: "blob" });
  },
  async history() {
    const { data } = await api.get(`${BASE}/history`);
    return data;
  },
  async file(exportId) {
    return api.get(`${BASE}/${encodeURIComponent(exportId)}/file`, { responseType: "blob" });
  },
};

export default accountingExportService;
