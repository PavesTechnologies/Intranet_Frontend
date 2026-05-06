import axios from "axios";

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

const getResponseData = (response) => {
  if (response?.data?.success) {
    return response.data.data;
  }

  if (response?.data?.data !== undefined) {
    return response.data.data;
  }

  return response?.data;
};

const allocationModificationApi = {
  getDemandModifications: async (demandId) => {
    const response = await axios.get(
      `${BASE_URL}/api/allocation-modifications/demand/${demandId}`,
      getAuthHeader(),
    );

    return getResponseData(response);
  },

  getModificationById: async (id) => {
    const response = await axios.get(
      `${BASE_URL}/api/allocation-modifications/${id}`,
      getAuthHeader(),
    );

    return getResponseData(response);
  },

  createModification: async (payload) => {
    const response = await axios.post(
      `${BASE_URL}/api/allocation-modifications/pm`,
      payload,
      getAuthHeader(),
    );

    return response.data;
  },

  submitRmDecision: async (id, payload) => {
    const response = await axios.put(
      `${BASE_URL}/api/allocation-modifications/${id}/rm/decision`,
      payload,
      getAuthHeader(),
    );

    return response.data;
  },

  cancelModification: async (id) => {
    const response = await axios.delete(
      `${BASE_URL}/api/allocation-modifications/${id}/pm`,
      getAuthHeader(),
    );

    return response.data;
  },
};

export default allocationModificationApi;
