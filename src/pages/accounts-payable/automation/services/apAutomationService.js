import api from "../../../../api/axiosInstance.js";

const AP_BASE_URL = window.__APP_CONFIG__.AP_BASE_URL;
const BASE = `${AP_BASE_URL}/ap-automation`;

export const apAutomationService = {
  async getSettings() {
    const { data } = await api.get(`${BASE}/settings`);
    return data;
  },
  async updateSettings(changes) {
    const { data } = await api.put(`${BASE}/settings`, changes);
    return data;
  },
  async getStats(days = 30) {
    const { data } = await api.get(`${BASE}/stats`, { params: { days } });
    return data;
  },
  async runNow() {
    const { data } = await api.post(`${BASE}/run`);
    return data;
  },
  async recheckInvoice(invoiceId) {
    const { data } = await api.post(`${BASE}/invoices/${encodeURIComponent(invoiceId)}/run`);
    return data;
  },
};

export default apAutomationService;
