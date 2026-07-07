import api from "../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

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