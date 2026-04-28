import axios from "axios";

const BASE_URL = window.__APP_CONFIG__?.RMS_BASE_URL;

export const handleDMDecision = async (dmDemandDecision) => {
  try {
    const response = await axios.put(
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
    const response = await axios.put(
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
