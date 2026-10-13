import api from "@/api/axiosInstance";

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";

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
      "/employee/saved-filters",
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
    return api.get("/employee/saved-filters", withBase());
  },

  /**
   * Get a specific saved filter by ID
   */
  getById: (filterId) => {
    return api.get(`/employee/saved-filters/${filterId}`, withBase());
  },

  /**
   * Update an existing saved filter
   */
  update: (filterId, filterName, employeeId, filterJson) => {
    return api.put(
      `/employee/saved-filters/${filterId}`,
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
    return api.delete(`/employee/saved-filters/${filterId}`, withBase());
  },
};
