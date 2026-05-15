import axios from "axios";
import {
  canProjectManagerMutateDemand,
  PM_REQUESTED_DEMAND_ONLY_MESSAGE,
} from "../utils/demandPermissions";

const BASE_URL = window.__APP_CONFIG__.RMS_BASE_URL || "http://localhost:8080";

const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  };
};

// const ROLE_ALIAS_MAP = {
//     "Resource_Manager": "RESOURCE_MANAGER",
//     "RESOURCE MANAGER": "RESOURCE_MANAGER",
//     "RESOURCE_MANAGER": "RESOURCE_MANAGER",
//     "Delivery_Manager": "DELIVERY_MANAGER",
//     "DELIVERY MANAGER": "DELIVERY_MANAGER",
//     "DELIVERY_MANAGER": "DELIVERY_MANAGER"
// };

const DEMAND_API_BY_ROLE = {
  RESOURCE_MANAGER: {
    kpi: "/api/demand/rm/kpi",
    demands: "/api/demand/rm/demands",
  },
  DELIVERY_MANAGER: {
    kpi: "/api/demand/dm/kpi",
    demands: "/api/demand/dm/demands",
  },
};

const normalizeRoleKey = (role) => {
  if (!role) return null;

  return role
    .toUpperCase()
    .replace(/-/g, "_") // Resource_Manager → RESOURCE_MANAGER
    .trim();
};

/**
 * Enterprise Demand Service
 */
export const demandService = {
  /**
   * Fetches all demands with high-level data for the workspace
   */
  getAllDemands: async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/demand/demands`,
        getAuthHeader(),
      );
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data?.message || "Failed to fetch demands");
    } catch (error) {
      console.error("Error in getAllDemands:", error);
      throw error;
    }
  },

  /**
   * Fetches detailed 360° view of a single demand
   * @param {string|number} id
   */
  getDemandById: async (id) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/demand/${id}`,
        getAuthHeader(),
      );
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || "Failed to fetch demand details",
      );
    } catch (error) {
      console.error(`Error in getDemandById for ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Fetches KPI summary data
   */
  getKPISummary: async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/demand/kpi`,
        getAuthHeader(),
      );
      if (response.data && response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error("Error in getKPISummary:", error);
      return null; // Return null to allow fallback to 0s
    }
  },

  /**
   * Fetches KPI summary data for a role-specific demand workspace.
   * Falls back to generic KPI endpoint if role is unknown.
   * @param {string} role
   */
  getRoleScopedKPISummary: async (role) => {
    const roleKey = normalizeRoleKey(role);
    const endpoints = DEMAND_API_BY_ROLE[roleKey];

    if (!endpoints?.kpi) {
      return demandService.getKPISummary();
    }

    try {
      const response = await axios.get(
        `${BASE_URL}${endpoints.kpi}`,
        getAuthHeader(),
      );

      if (response.data?.success) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching KPI for role ${role}`, error);
      return null;
    }
  },

  /**
   * Fetches demands for a role-specific demand workspace.
   * Falls back to generic demands endpoint if role is unknown.
   * @param {string} role
   */
  getRoleScopedDemands: async (role) => {
    const roleKey = normalizeRoleKey(role);
    const endpoints = DEMAND_API_BY_ROLE[roleKey];

    if (!endpoints?.demands) {
      return demandService.getAllDemands();
    }

    try {
      const response = await axios.get(
        `${BASE_URL}${endpoints.demands}`,
        getAuthHeader(),
      );

      if (response.data?.success) {
        return response.data.data;
      }

      throw new Error(`Failed to fetch demands for role ${role}`);
    } catch (error) {
      console.error(`Error fetching demands for role ${role}`, error);
      throw error;
    }
  },
  /**
   * Fetches Dashboard KPI summary data
   */
  getDashboardKPIs: async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/demand/dashboard-kpi`,
        getAuthHeader(),
      );
      if (response.data && response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error("Error in getDashboardKPIs:", error);
      return null;
    }
  },

  /**
   * Fetches demands created by the current user
   */
  getDemandsCreatedByMe: async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/demand/created-by-me`,
        getAuthHeader(),
      );
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || "Failed to fetch demands created by me",
      );
    } catch (error) {
      console.error("Error in getDemandsCreatedByMe:", error);
      throw error;
    }
  },

  /**
   * Fetches project-specific KPI summary
   * @param {string|number} projectId
   */
  getProjectKPIs: async (projectId) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/demand/pm/kpi`, {
        ...getAuthHeader(),
        params: { projectId },
      });
      if (response.data && response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error(`Error in getProjectKPIs for ID ${projectId}:`, error);
      return null;
    }
  },

  /**
   * Fetches demands for a specific project
   * @param {string|number} projectId
   */
  getProjectDemands: async (projectId) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/demand/project/${projectId}`,
        getAuthHeader(),
      );
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || "Failed to fetch project demands",
      );
    } catch (error) {
      console.error(`Error in getProjectDemands for ID ${projectId}:`, error);
      throw error;
    }
  },

  /**
   * Handles Delivery Manager decision on a demand
   * @param {Object} payload
   */
  handleDMDecision: async (payload) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/api/demand/dm/decision`,
        payload,
        getAuthHeader(),
      );
      return response.data;
    } catch (error) {
      console.error("Error in handleDMDecision:", error);
      throw error;
    }
  },

  /**
   * Handles Resource Manager decision on a demand
   * @param {Object} payload
   */
  handleRMDecision: async (payload) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/api/demand/rm/decision`,
        payload,
        getAuthHeader(),
      );
      return response.data;
    } catch (error) {
      console.error("Error in handleRMDecision:", error);
      throw error;
    }
  },

  /**
   * Deletes a demand by Project Manager
   * @param {string|number} demandId
   */
  deleteDemandByPM: async (demandId, demand = null) => {
    if (demand && !canProjectManagerMutateDemand(demand)) {
      throw new Error(PM_REQUESTED_DEMAND_ONLY_MESSAGE);
    }

    try {
      const response = await axios.delete(
        `${BASE_URL}/api/demand/delete/pm/${demandId}`,
        getAuthHeader(),
      );
      return response.data;
    } catch (error) {
      console.error(`Error in deleteDemandByPM for ID ${demandId}:`, error);
      throw error;
    }
  },
};

export default demandService;
