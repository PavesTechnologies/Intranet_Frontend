import api from "../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

export const getAllJDs = async (params) => {
    try {
        const response = await api.get(`${BASE_URL}/job-descriptions`, {
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

export const createJD = async (payload) => {
    try {
        const response = await api.post(`${BASE_URL}/job-descriptions`, payload, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error creating JD:", error);
        throw error;
    }
};

export const createJDFromFile = async (file, fields = {}) => {
    try {
        const formData = new FormData();
        formData.append("file", file);
        Object.entries(fields).forEach(([key, value]) => {
            if (value === undefined || value === null || value === "") return;
            formData.append(key, typeof value === "object" ? JSON.stringify(value) : value);
        });

        const response = await api.post(`${BASE_URL}/job-descriptions/from-file`, formData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error creating JD from file:", error);
        throw error;
    }
};

export const getJDById = async (jdId) => {
    try {
        const response = await api.get(`${BASE_URL}/job-descriptions/${jdId}`, {
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
        const response = await api.delete(`${BASE_URL}/job-descriptions/${jdId}`, {
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
        const response = await api.put(`${BASE_URL}/job-descriptions/${jdId}`, updatedData, {
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

export const exportSingleJD = async (jdId) => {
    try {
        const response = await api.get(`${BASE_URL}/job-descriptions/${jdId}/export`, {
            responseType: "blob",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response;
    } catch (error) {
        console.error("Error exporting JD:", error);
        throw error;
    }
};

export const exportJDs = async (params) => {
    try {
        const response = await api.get(
            `${BASE_URL}/job-descriptions/export`,
            {
                params,
                responseType: "blob",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            }
        );

        return response;
    } catch (error) {
        console.error("Error exporting JDs:", error);
        throw error;
    }
};

export const getJDSkills = async (jdId) => {
    try {
        const response = await api.get(`${BASE_URL}/skills/jd/${jdId}/skills`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching JD skills:", error);
        throw error;
    }
};

export const getJDUnknownSkills = async (jdId) => {
    try {
        const response = await api.get(`${BASE_URL}/skills/jd/${jdId}/unknown-skills`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching JD unknown skills:", error);
        throw error;
    }
};
