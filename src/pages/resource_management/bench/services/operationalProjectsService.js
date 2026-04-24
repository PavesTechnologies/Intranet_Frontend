import axios from "axios";

const TSM_BASE_URL = window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * Fetches the operational project hours summary from the Timesheet service
 */
export const getOperationalProjects = async () => {
  try {
    const response = await axios.get(`${TSM_BASE_URL}/api/timesheets/RMS/project-hours-summary`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch operational projects", error);
    throw error;
  }
};

export const getOperationalProjectDetail = async (projectId) => {
  try {
    const response = await axios.get(
      `${TSM_BASE_URL}/api/timesheets/RMS/project-hours-summary/${projectId}`,
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    console.error("Failed to fetch operational project detail", error);
    throw error;
  }
};
