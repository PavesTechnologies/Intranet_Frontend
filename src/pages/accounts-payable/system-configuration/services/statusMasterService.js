// src/pages/accounts-payable/system-configuration/services/statusMasterService.js
import api from "../../../../api/axiosInstance";

const BASE = window.__APP_CONFIG__.AP_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * Status Master API (AP System Configuration). Matches
 * Backend/API_Layer/routes/system_status_route.py.
 */
export const statusMasterService = {
  getStatuses: async () => {
    const res = await api.get(`${BASE}/system/status`, { headers: authHeaders() });
    return res.data;
  },

  getStatusById: async (statusId) => {
    const res = await api.get(`${BASE}/system/status/${statusId}`, { headers: authHeaders() });
    return res.data;
  },
};

export default statusMasterService;
