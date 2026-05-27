import api from "../../../api/axiosInstance";
import {
  canProjectManagerMutateDemand,
  PM_REQUESTED_DEMAND_ONLY_MESSAGE,
} from "../demand/utils/demandPermissions";

const BASE_URL = window.__APP_CONFIG__?.RMS_BASE_URL;

export const handleDMDecision = async (dmDemandDecision) => {
  try {
    const response = await api.put(
      `${BASE_URL}/api/demand/dm/decision`,
      dmDemandDecision,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const handleRMDecision = async (rmDemandDecision) => {
  try {
    const response = await api.put(
      `${BASE_URL}/api/demand/rm/decision`,
      rmDemandDecision,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteDemandByPM = async (demandId, demand = null) => {
  if (demand && !canProjectManagerMutateDemand(demand)) {
    throw new Error(PM_REQUESTED_DEMAND_ONLY_MESSAGE);
  }

  try {
    const response = await api.delete(
      `${BASE_URL}/api/demand/delete/pm/${demandId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateRoleExpectationById = async (roleId, roleDetails) => {
  try {
    const response = await api.put(`${BASE_URL}/api/admin/role-expectations/${roleId}`, 
      roleDetails,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};