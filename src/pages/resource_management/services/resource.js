import axios from "axios";

const BASE_URL = window.__APP_CONFIG__.RMS_BASE_URL;

export const fetchResources = async () => {
  try {
    const response = await axios.get(
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
    const response = await axios.post(
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
    const response = await axios.get(
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
    const response = await axios.get(
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
