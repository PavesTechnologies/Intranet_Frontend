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

// HR_ADMIN-only manual retry for a single FAILED individually-uploaded resume
// that hasn't been moved to the dead-letter queue yet (see replayResumeDlqEntry
// for the DLQ'd case).
export const retryResume = async (resumeId) => {
    try {
        const response = await api.post(`${BASE_URL}/resumes/${resumeId}/retry`, null, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error retrying resume:", error);
        throw error;
    }
};

// HR_ADMIN-only manual replay for a resume's dead-lettered task, by DLQ entry
// id (getResumeById's `failure.dlq_id`, once failure.moved_to_dlq is true).
export const replayResumeDlqEntry = async (dlqId) => {
    try {
        const response = await api.post(`${BASE_URL}/resumes/dead-letter-queue/${dlqId}/replay`, null, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error replaying resume DLQ entry:", error);
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

export const deleteCandidate = async (candidateId) => {
    try {
        const response = await api.delete(`${BASE_URL}/candidates/${candidateId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error deleting candidate:", error);
        throw error;
    }
};

export const getBulkUploadJobs = async (params) => {
    try {
        const response = await api.get(`${BASE_URL}/bulk-uploads`, {
            params,
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching bulk upload jobs:", error);
        throw error;
    }
};

export const getBulkUploadProgress = async (bulkUploadJobId) => {
    try {
        const response = await api.get(`${BASE_URL}/bulk-uploads/${bulkUploadJobId}/progress`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching bulk upload progress:", error);
        throw error;
    }
};

export const getBulkUploadFileLog = async (bulkUploadJobId, params) => {
    try {
        const response = await api.get(`${BASE_URL}/bulk-uploads/${bulkUploadJobId}/file-log`, {
            params,
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching bulk upload file log:", error);
        throw error;
    }
};

export const getBulkUploadFiles = async (bulkUploadJobId, params) => {
    try {
        const response = await api.get(`${BASE_URL}/bulk-uploads/${bulkUploadJobId}/files`, {
            params,
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching bulk upload files:", error);
        throw error;
    }
};

export const getBulkUploadFileDetail = async (bulkUploadJobId, fileId) => {
    try {
        const response = await api.get(`${BASE_URL}/bulk-uploads/${bulkUploadJobId}/files/${fileId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching bulk upload file detail:", error);
        throw error;
    }
};

export const getBulkUploadFileTimeline = async (bulkUploadJobId, fileId) => {
    try {
        const response = await api.get(`${BASE_URL}/bulk-uploads/${bulkUploadJobId}/files/${fileId}/timeline`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching bulk upload file timeline:", error);
        throw error;
    }
};

// HR_ADMIN-only manual replay for a single FAILED file inside a bulk ZIP job.
export const replayBulkUploadFile = async (bulkUploadJobId, fileId) => {
    try {
        const response = await api.post(`${BASE_URL}/bulk-uploads/${bulkUploadJobId}/files/${fileId}/replay`, null, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error replaying bulk upload file:", error);
        throw error;
    }
};