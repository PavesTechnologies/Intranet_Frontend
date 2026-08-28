import api from "../../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const authHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

export const getDashboardStats = async () => {
    try {
        const response = await api.get(`${BASE_URL}/dashboard/stats`, authHeaders());
        return response.data;
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        throw error;
    }
};

export const getHiringFunnel = async (days = 30) => {
    try {
        const response = await api.get(`${BASE_URL}/dashboard/hiring-funnel`, {
            params: { days },
            ...authHeaders(),
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching hiring funnel:", error);
        throw error;
    }
};

export const getTopCandidates = async (limit = 5) => {
    try {
        const response = await api.get(`${BASE_URL}/dashboard/top-candidates`, {
            params: { limit },
            ...authHeaders(),
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching top candidates:", error);
        throw error;
    }
};

export const getDashboardNotifications = async (limit = 10) => {
    try {
        const response = await api.get(`${BASE_URL}/dashboard/notifications`, {
            params: { limit },
            ...authHeaders(),
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching dashboard notifications:", error);
        throw error;
    }
};
