import api from "../../../../api/axiosInstance";

const BASE = `${window.__APP_CONFIG__.AP_BASE_URL}/work-assignment`;

/** Work assignment API (/apm/work-assignment): team, rules, workload, claim and reassign. */
export const workAssignmentService = {
  async team() {
    const { data } = await api.get(`${BASE}/team`);
    return data;
  },
  async workload() {
    const { data } = await api.get(`${BASE}/workload`);
    return data;
  },
  async setRule(scope, targetId, assigneeUserId) {
    const { data } = await api.put(`${BASE}/rules`, { scope, target_id: Number(targetId), assignee_user_id: String(assigneeUserId) });
    return data;
  },
  async removeRule(ruleId) {
    const { data } = await api.delete(`${BASE}/rules/${encodeURIComponent(ruleId)}`);
    return data;
  },
  async claim(invoiceIds) {
    const { data } = await api.post(`${BASE}/claim`, { invoice_ids: invoiceIds });
    return data;
  },
  async reassign(invoiceIds, toUserId, note) {
    const { data } = await api.post(`${BASE}/reassign`, { invoice_ids: invoiceIds, to_user_id: String(toUserId), note: note || null });
    return data;
  },
  async reassignAll(fromUserId, toUserId, note) {
    const { data } = await api.post(`${BASE}/reassign-all`, { from_user_id: String(fromUserId), to_user_id: String(toUserId), note: note || null });
    return data;
  },
};

export default workAssignmentService;
