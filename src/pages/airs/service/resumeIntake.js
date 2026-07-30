import api from "../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

export const activeCampaigns = async () => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/active`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching active campaigns:", error);
        throw error;
    }
};

export const resumeUpload = async (formData) => {
    try {
        const response = await api.post(`${BASE_URL}/resumes`, formData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error uploading resume:", error);
        throw error;
    }
};

export const pipelineStatus = async (taskId) => {
    try {
        const response = await api.get(`${BASE_URL}/resumes/processing-status/${taskId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching resume processing status:", error);
        throw error;
    }
};

export const getAllResumes = async (filters) => {
    try {
        const response = await api.get(`${BASE_URL}/resumes`, {
            params: filters,
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching all resumes:", error);
        throw error;
    }
};

export const resumeTimeline = async (resumeId, attemptNumber) => {
    try {
        const response = await api.get(`${BASE_URL}/resumes/${resumeId}/timeline`, {
            params: attemptNumber ? { attempt_number: attemptNumber } : undefined,
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching resume timeline:", error);
        throw error;
    }
};

export const getResumeById = async (resumeId) => {
    try {
        const response = await api.get(`${BASE_URL}/resumes/${resumeId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching resume by ID:", error);
        throw error;
    }
};

export const bulkUpload = async (formData) => {
    try {
        const response = await api.post(`${BASE_URL}/bulk-uploads`, formData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error in bulk upload:", error);
        throw error;
    }
};

export const candidateJson = async (candidateId) => {
    try {
        const response = await api.get(`${BASE_URL}/resumes/candidate/${candidateId}/parsed-json`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching candidate JSON:", error);
        throw error;
    }
};