import { toast } from "react-toastify";
import api from "../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message || error?.response?.data?.detail || fallback;

export const getAllJDs = async (params) => {
    try {
        const response = await api.get(`${BASE_URL}/job-descriptions`, {
            params, headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        toast.success(response.data?.message || "Job descriptions fetched successfully.");
        return response.data;
    } catch (error) {
        console.error("Error fetching JDs:", error);
        toast.error(getErrorMessage(error, "Failed to fetch job descriptions."));
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
        toast.success(response.data?.message || "Job description created successfully.");
        return response.data;
    } catch (error) {
        console.error("Error creating JD:", error);
        toast.error(getErrorMessage(error, "Failed to create job description."));
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
        toast.success(response.data?.message || "Job description created from file successfully.");
        return response.data;
    } catch (error) {
        console.error("Error creating JD from file:", error);
        toast.error(getErrorMessage(error, "Failed to create job description from file."));
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
        toast.success(response.data?.message || "Job description fetched successfully.");
        return response.data;
    } catch (error) {
        console.error("Error fetching JD:", error);
        toast.error(getErrorMessage(error, "Failed to fetch job description."));
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
        toast.success(response.data?.message || "Job description deleted successfully.");
        return response.data;
    } catch (error) {
        console.error("Error deleting JD: ", error);
        toast.error(getErrorMessage(error, "Failed to delete job description."));
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
        toast.success(response.data?.message || "Job description updated successfully.");
        return response.data;
    } catch (error) {
        console.error("Error updating JD:", error);
        toast.error(getErrorMessage(error, "Failed to update job description."));
        throw error;
    }
};

export const updateJDFromFile = async (jdId, file, fields = {}) => {
    try {
        const formData = new FormData();
        formData.append("file", file);
        Object.entries(fields).forEach(([key, value]) => {
            if (value === undefined || value === null || value === "") return;
            formData.append(key, value);
        });

        const response = await api.put(`${BASE_URL}/job-descriptions/${jdId}/from-file`, formData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        toast.success(response.data?.message || "Job description updated from file successfully.");
        return response.data;
    } catch (error) {
        console.error("Error updating JD from file:", error);
        toast.error(getErrorMessage(error, "Failed to update job description from file."));
        throw error;
    }
};

export const viewJDFile = async (jdId) => {
    try {
        const response = await api.get(`${BASE_URL}/job-descriptions/${jdId}/view`, {
            responseType: "blob",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        toast.success("Job description file loaded successfully.");
        return response;
    } catch (error) {
        console.error("Error viewing JD file:", error);
        toast.error(getErrorMessage(error, "Failed to view job description file."));
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
        toast.success("Job description exported successfully.");
        return response;
    } catch (error) {
        console.error("Error exporting JD:", error);
        toast.error(getErrorMessage(error, "Failed to export job description."));
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
        toast.success("Job descriptions exported successfully.");
        return response;
    } catch (error) {
        console.error("Error exporting JDs:", error);
        toast.error(getErrorMessage(error, "Failed to export job descriptions."));
        throw error;
    }
};

export const getMyJDUploads = async () => {
    try {
        const response = await api.get(`${BASE_URL}/job-descriptions/my-uploads`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        toast.success(response.data?.message || "JD uploads fetched successfully.");
        return response.data;
    } catch (error) {
        console.error("Error fetching JD uploads:", error);
        toast.error(getErrorMessage(error, "Failed to fetch JD uploads."));
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
        toast.success(response.data?.message || "JD skills fetched successfully.");
        return response.data;
    } catch (error) {
        console.error("Error fetching JD skills:", error);
        toast.error(getErrorMessage(error, "Failed to fetch JD skills."));
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
        toast.success(response.data?.message || "JD unknown skills fetched successfully.");
        return response.data;
    } catch (error) {
        console.error("Error fetching JD unknown skills:", error);
        toast.error(getErrorMessage(error, "Failed to fetch JD unknown skills."));
        throw error;
    }
};
