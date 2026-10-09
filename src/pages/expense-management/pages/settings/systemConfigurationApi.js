import api from "@/api/axiosInstance";

/**
 * System configurations (/xms/admin/system-configurations, ADMIN only). A key with no row falls
 * back to the backend's built-in default, so deleting a row is "reset to default".
 *
 * SystemConfigurationRequest: { configKey, configValue, dataType?, description? }
 */

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const withBase = (extra) => ({ baseURL: EXPENSE_API_BASE, headers: authHeaders(), ...extra });

export const systemConfigurationApi = {
  getAll: () => api.get("/xms/admin/system-configurations", withBase()),
  create: (payload) => api.post("/xms/admin/system-configurations", payload, withBase()),
  update: (id, payload) => api.put(`/xms/admin/system-configurations/${id}`, payload, withBase()),
  delete: (id) => api.delete(`/xms/admin/system-configurations/${id}`, withBase()),
};
