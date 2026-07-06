import api from "../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

export const getAllJDs = async (params) => {
    try {
        const response = await api.get(`${BASE_URL}/airs/job-descriptions`, {
            params, headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching JDs:", error);
        throw error
    }
};

export const getJDById = async (jdId) => {
    try {
        const response = await api.get(`${BASE_URL}/airs/job-descriptions/${jdId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching JD:", error);
        throw error
    }
};

export const deleteJDById = async (jdId) => {
    try {
        const response = await api.delete(`${BASE_URL}/airs/job-descriptions/${jdId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error deleting JD: ", error);
        throw error
    }
};

export const updateJDById = async (jdId, updatedData) => {
    try {
        const response = await api.put(`${BASE_URL}/airs/job-descriptions/${jdId}`, updatedData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error updating JD:", error);
        throw error;
    }
};