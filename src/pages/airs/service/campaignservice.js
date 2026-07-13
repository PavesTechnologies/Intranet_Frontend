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

export const getAllCampaigns = async () => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/all`, {
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

export const getCampaignsByHiringManager = async () => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/hiring_manager`, {
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

export const getCampaignDetails = async (campaignId) => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/${campaignId}/details`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching campaign details:", error);
        throw error;
    }
};

export const getPipelineSummary = async (campaignId) => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/${campaignId}/pipeline-summary`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching pipeline summary:", error);
        throw error;
    }
};

export const getCampaignTimeline = async (campaignId, { limit = 20, offset = 0, event_type } = {}) => {
    try {
        const params = { limit, offset };
        if (event_type) params.event_type = event_type;
        const response = await api.get(`${BASE_URL}/campaigns/${campaignId}/timeline`, {
            params,
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching campaign timeline:", error);
        throw error;
    }
};

export const updateCampaign = async (campaignId, payload) => {
    try {
        const response = await api.patch(`${BASE_URL}/campaigns/${campaignId}`, payload, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error updating campaign:", error);
        throw error;
    }
};


export const getCampaignById = async (campaignId) => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/${campaignId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching campaign:", error);
        throw error;
    }
};

export const getCampaignCandidates = async (campaignId) => {
    try {
        const response = await api.get(`${BASE_URL}/campaign-candidates/campaign/${campaignId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching campaign candidates:", error);
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