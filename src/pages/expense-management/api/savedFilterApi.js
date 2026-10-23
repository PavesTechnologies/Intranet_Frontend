import api from "@/api/axiosInstance";
import { XMS_BASE_URL } from "@/pages/expense-management/api/xmsBaseUrl";

const EXPENSE_API_BASE = XMS_BASE_URL;

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const withBase = (extra) => ({ baseURL: EXPENSE_API_BASE, headers: authHeaders(), ...extra });

/**
 * Saved Filter/Search Presets API
 * Spec: EP12-S3 - Save and reuse filter combinations
 * Backend: POST/GET/PUT/DELETE /xms/employee/saved-filters
 */
export const savedFilterApi = {
  /**
   * Create a new saved filter
   * @param {string} filterName - Name of the saved filter
   * @param {string} employeeId - Employee ID (current user)
   * @param {object} filterJson - Filter criteria object
   */
  create: (filterName, employeeId, filterJson) => {
    return api.post(
      "/xms/employee/saved-filters",
      {
        filterName,
        employeeId,
        filterJson: JSON.stringify(filterJson),
      },
      withBase()
    );
  },

  /**
   * Get all saved filters for current user
   */
  getAll: () => {
    return api.get("/xms/employee/saved-filters", withBase());
  },

  /**
   * Get a specific saved filter by ID
   */
  getById: (filterId) => {
    return api.get(`/xms/employee/saved-filters/${filterId}`, withBase());
  },

  /**
   * Update an existing saved filter
   */
  update: (filterId, filterName, employeeId, filterJson) => {
    return api.put(
      `/xms/employee/saved-filters/${filterId}`,
      {
        filterName,
        employeeId,
        filterJson: JSON.stringify(filterJson),
      },
      withBase()
    );
  },

  /**
   * Delete a saved filter
   */
  delete: (filterId) => {
    return api.delete(`/xms/employee/saved-filters/${filterId}`, withBase());
  },
};
