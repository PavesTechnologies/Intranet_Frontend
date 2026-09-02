// src/pages/accounts-payable/system-configuration/services/departmentService.js
import api from "../../../../api/axiosInstance";

const BASE = window.__APP_CONFIG__.AP_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * Department Master API (AP System Configuration). Matches
 * Backend/API_Layer/routes/master_department_route.py.
 */
export const departmentService = {
  getDepartments: async () => {
    const res = await api.get(`${BASE}/master/departments`, { headers: authHeaders() });
    return res.data;
  },

  getDepartmentById: async (departmentId) => {
    const res = await api.get(`${BASE}/master/departments/${departmentId}`, {
      headers: authHeaders(),
    });
    return res.data;
  },

  createDepartment: async (payload) => {
    const res = await api.post(`${BASE}/master/departments`, payload, { headers: authHeaders() });
    return res.data;
  },

  updateDepartment: async (departmentId, payload) => {
    const res = await api.put(`${BASE}/master/departments/${departmentId}`, payload, {
      headers: authHeaders(),
    });
    return res.data;
  },

  deleteDepartment: async (departmentId) => {
    const res = await api.delete(`${BASE}/master/departments/${departmentId}`, {
      headers: authHeaders(),
    });
    return res.data;
  },
};

export default departmentService;
