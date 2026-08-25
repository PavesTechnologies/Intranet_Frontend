// Real API integration for Epic 4 (Tool / Software / License Billing) Phase 1 — Project
// Billing Setup wizard, Step 4. Mirrors the axios usage convention established in
// src/pages/resource_management/services (api wrapper + module base URL + Bearer header).
import api from "../../../api/axiosInstance";

const AR_BASE_URL = window.__APP_CONFIG__?.AR_BASE_URL;

function authHeaders() {
  return {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  };
}

function toolBillingUrl(projectId) {
  return `${AR_BASE_URL}/api/ar/projects/${projectId}/tool-billing`;
}

/**
 * Returns the saved config, or null if the project has no Tool Billing configuration yet
 * (backend responds 404). Any other error (400/500/network) is rethrown for the caller to handle.
 * @param {string} projectId
 * @returns {Promise<import("../types/projectToolBilling").ProjectToolBillingConfig | null>}
 */
export async function getProjectToolBilling(projectId) {
  try {
    const response = await api.get(toolBillingUrl(projectId), authHeaders());
    return response.data;
  } catch (error) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * @param {string} projectId
 * @param {import("../types/projectToolBilling").ProjectToolBillingConfig} payload
 * @returns {Promise<import("../types/projectToolBilling").ProjectToolBillingConfig>}
 */
export async function createProjectToolBilling(projectId, payload) {
  const response = await api.post(toolBillingUrl(projectId), payload, authHeaders());
  return response.data;
}

/**
 * @param {string} projectId
 * @param {import("../types/projectToolBilling").ProjectToolBillingConfig} payload
 * @returns {Promise<import("../types/projectToolBilling").ProjectToolBillingConfig>}
 */
export async function updateProjectToolBilling(projectId, payload) {
  const response = await api.put(toolBillingUrl(projectId), payload, authHeaders());
  return response.data;
}
