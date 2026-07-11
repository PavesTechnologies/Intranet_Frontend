import api from "../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;
const UMS_BASE_URL = window.__APP_CONFIG__.USER_MANAGEMENT_URL;

export const createCampaign = async (campaignData) => {
    try {
        const response = await api.post(`${BASE_URL}/campaigns`, campaignData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error creating campaign:", error);
        throw error;
    }
};

export const getAllCampaignsHrAdmin = async () => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/hr_admin`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching campaigns:", error);
        throw error;
    }
};

export const getNameByRoles = async (roleName) => {
    try {
        const response = await api.get(`${UMS_BASE_URL}/admin/roles/${roleName}/users`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching names by roles:", error);
        throw error;
    }
};