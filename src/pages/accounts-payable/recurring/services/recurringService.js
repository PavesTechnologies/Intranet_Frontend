import api from "../../../../api/axiosInstance";

const BASE = `${window.__APP_CONFIG__.AP_BASE_URL}/recurring-schedules`;

/** Recurring invoice schedules API (/apm/recurring-schedules). */
export const recurringService = {
  async overview() {
    const { data } = await api.get(BASE);
    return data;
  },
  async create(body) {
    const { data } = await api.post(BASE, body);
    return data;
  },
  async update(scheduleId, body) {
    const { data } = await api.put(`${BASE}/${encodeURIComponent(scheduleId)}`, body);
    return data;
  },
  async skip(occurrenceId, reason) {
    const { data } = await api.post(`${BASE}/occurrences/${encodeURIComponent(occurrenceId)}/skip`, { reason });
    return data;
  },
  async link(occurrenceId, invoiceId) {
    const { data } = await api.post(`${BASE}/occurrences/${encodeURIComponent(occurrenceId)}/link`, { invoice_id: Number(invoiceId) });
    return data;
  },
};

export default recurringService;
