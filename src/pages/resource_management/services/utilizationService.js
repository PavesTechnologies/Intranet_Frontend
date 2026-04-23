import axios from "axios";

const TMS_API_BASE_URL = window.__APP_CONFIG__?.TIMESHEET_API_ENDPOINT;

export const getBillNonBillable = async (startDate, endDate) => {
    try {
        const response = await axios.get(`${TMS_API_BASE_URL}/api/users/hours`, {
            params: {
                startDate: startDate,
                endDate: endDate,
            },
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching bill non-billable:", error);
        throw error;
    }
};

export const getResourceProjects = async (resourceId) => {
    try {
        const response = await axios.get(`${TMS_API_BASE_URL}/api/users/${resourceId}/project-details`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching resource projects:", error);
        throw error;
    }
};