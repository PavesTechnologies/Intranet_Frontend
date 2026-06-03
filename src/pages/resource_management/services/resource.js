import api from "../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__?.RMS_BASE_URL;

export const fetchResources = async () => {
  try {
    const response = await api.get(
      `${BASE_URL}/api/resource/get-all-resources`,
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

export const resourceAllocation = async (allocationData) => {
  try {
    const response = await api.post(
      `${BASE_URL}/api/allocation/assign`,
      allocationData,
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

export const fetchResourcesByProjectId = async (projectId) => {
  try {
    const response = await api.get(
      `${BASE_URL}/api/allocation/project/${projectId}`,
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

export const fetchResourcesByDemandId = async (demandId) => {
  try {
    const response = await api.get(
      `${BASE_URL}/api/allocation/demand/${demandId}`,
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

export const deleteResourceAllocation = async (allocationId) => {
  try {
    const response = await api.delete(
      `${BASE_URL}/api/allocation/${allocationId}`,
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

export const projectResourceDetails = async (projectId) => {
  try {
    const response = await api.get(
      `${BASE_URL}/api/allocation/get-all-resources/${projectId}`,
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
