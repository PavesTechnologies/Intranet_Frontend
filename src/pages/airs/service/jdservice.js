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

export const downloadJDById = async (jdId) => {
    try {
        const response = await api.get(`${BASE_URL}/job-descriptions/${jdId}/download`, {
            responseType: "blob",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response;
    } catch (error) {
        console.error("Error downloading JD:", error);
        toast.error(getErrorMessage(error, "Failed to download job description."));
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

// Replays a failed/dead upload from its last checkpoint. Returns 202 with no
// useful body — the UI is driven by the task.reset event that follows on the
// my-uploads socket, so callers should NOT refetch the list here.
// 409 = the task isn't actually failed, or there's no checkpoint to replay
// from (the user has to re-upload); 403 = not the caller's upload.
export const retryJDProcessingTask = async (taskId) => {
    try {
        const response = await api.post(`${BASE_URL}/job-descriptions/my-uploads/${taskId}/retry`, null, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        toast.info(response.data?.message || "Retry queued.");
        return response.data;
    } catch (error) {
        console.error("Error retrying JD processing task:", error);
        const status = error?.response?.status;
        if (status === 409) {
            toast.error(getErrorMessage(error, "This upload can't be retried — please upload the file again."));
        } else if (status === 403) {
            toast.error(getErrorMessage(error, "You can only retry your own uploads."));
        } else {
            toast.error(getErrorMessage(error, "Failed to retry processing."));
        }
        throw error;
    }
};

// Single-row status poll. Deliberately silent (no toasts) — it backfills the
// terminal state the socket can't deliver yet (there's no task.completed /
// task.failed event), so it runs without the user asking for it.
export const getJDProcessingStatus = async (taskId) => {
    try {
        const response = await api.get(`${BASE_URL}/job-descriptions/processing-status/${taskId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching JD processing status:", error);
        throw error;
    }
};

export const deleteJDProcessingTask = async (taskId) => {
    try {
        const response = await api.delete(`${BASE_URL}/dead-letter-queue/${taskId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        toast.success(response.data?.message || "Processing task deleted successfully.");
        return response.data;
    } catch (error) {
        console.error("Error deleting JD processing task:", error);
        toast.error(getErrorMessage(error, "Failed to delete processing task."));
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

// PATCH /skills/jd-skills/{id} — change a JD skill's mandatory flag and
// core/supporting importance (importance is required when mandatory is true).
// 409 = the JD is used by an active campaign; 400 = importance missing, or the
// change would leave the JD without a core skill.
export const updateJDSkill = async (jdSkillId, { mandatory, importance }) => {
    try {
        const response = await api.patch(
            `${BASE_URL}/skills/jd-skills/${jdSkillId}`,
            { mandatory, importance: mandatory ? importance : null },
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        toast.success(response.data?.message || "JD skill updated.");
        return response.data;
    } catch (error) {
        console.error("Error updating JD skill:", error);
        toast.error(getErrorMessage(error, "Failed to update JD skill."));
        throw error;
    }
};

// DELETE /skills/jd-skills/{id} — removes the skill from this JD only; the
// skill stays in the skill ontology. Same 409/400 rules as updateJDSkill.
export const removeJDSkill = async (jdSkillId) => {
    try {
        const response = await api.delete(`${BASE_URL}/skills/jd-skills/${jdSkillId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        toast.success(response.data?.message || "Skill removed from JD.");
        return response.data;
    } catch (error) {
        console.error("Error removing JD skill:", error);
        toast.error(getErrorMessage(error, "Failed to remove skill from JD."));
        throw error;
    }
};

// GET /job-descriptions/education-options — distinct degree/field values
// already used across JDs, for the JD form's suggestions. Silent: a failure
// just means no suggestions, the inputs still accept free text.
export const getEducationOptions = async () => {
    try {
        const response = await api.get(`${BASE_URL}/job-descriptions/education-options`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching education options:", error);
        return null;
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

// ---- JD calibration (HR_ADMIN edits; everyone else read-only) ----

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

// GET /job-descriptions/{jd_id}/calibration - status, skills by tier, ambiguous
// skill senses, experience + tolerance, education, live campaigns, warnings.
export const getJDCalibration = async (jdId) => {
    try {
        const response = await api.get(`${BASE_URL}/job-descriptions/${jdId}/calibration`, { headers: authHeader() });
        return response.data?.data ?? response.data;
    } catch (error) {
        console.error("Error fetching JD calibration:", error);
        toast.error(getErrorMessage(error, "Failed to load the JD calibration."));
        throw error;
    }
};

// PUT /job-descriptions/{jd_id}/calibration (HR_ADMIN) - 422 explains what is missing
// (e.g. the meaning of an ambiguous skill). Live campaigns' scored candidates are
// marked "score out of date"; nobody is re-scored automatically.
export const saveJDCalibration = async (jdId, payload) => {
    try {
        const response = await api.put(`${BASE_URL}/job-descriptions/${jdId}/calibration`, payload, { headers: authHeader() });
        toast.success(response.data?.message || "JD calibrated.");
        return response.data?.data ?? response.data;
    } catch (error) {
        console.error("Error saving JD calibration:", error);
        toast.error(getErrorMessage(error, "Failed to save the JD calibration."));
        throw error;
    }
};

// GET /job-descriptions/{jd_id}/calibration/versions - newest first.
export const getJDCalibrationVersions = async (jdId) => {
    try {
        const response = await api.get(`${BASE_URL}/job-descriptions/${jdId}/calibration/versions`, { headers: authHeader() });
        return response.data?.data ?? response.data ?? [];
    } catch (error) {
        console.error("Error fetching JD calibration history:", error);
        return [];
    }
};

// GET /job-descriptions/{jd_id}/unknown-skills/suggestions - top-3 catalogue
// skills (embedding similarity) for each unresolved unknown skill of the JD.
export const getJDUnknownSkillSuggestions = async (jdId) => {
    try {
        const response = await api.get(`${BASE_URL}/job-descriptions/${jdId}/unknown-skills/suggestions`, { headers: authHeader() });
        return response.data?.data ?? response.data ?? [];
    } catch (error) {
        console.error("Error fetching unknown-skill suggestions:", error);
        return [];
    }
};

// POST /job-descriptions/{jd_id}/unknown-skills/{unknown_skill_id}/resolve (HR_ADMIN)
// payload: { action: "MAP", canonical_skill_id } | { action: "NEW", canonical_name? } | { action: "DROP" }.
// MAP / DROP affect this JD only; NEW adds the skill to the catalogue for every JD.
export const resolveJDUnknownSkill = async (jdId, unknownSkillId, payload) => {
    try {
        const response = await api.post(
            `${BASE_URL}/job-descriptions/${jdId}/unknown-skills/${unknownSkillId}/resolve`, payload, { headers: authHeader() });
        toast.success(response.data?.message || "Resolved.");
        return response.data?.data ?? response.data;
    } catch (error) {
        console.error("Error resolving unknown skill:", error);
        toast.error(getErrorMessage(error, "Failed to resolve the unknown skill."));
        throw error;
    }
};

// POST /job-descriptions/{jd_id}/calibration/skills (HR_ADMIN) - add a skill the
// extraction missed: { canonical_skill_id, tier } from the catalogue, or
// { new_skill_name, tier } (added to the catalogue). Saves a calibration version.
export const addJDCalibrationSkill = async (jdId, payload) => {
    try {
        const response = await api.post(`${BASE_URL}/job-descriptions/${jdId}/calibration/skills`, payload, { headers: authHeader() });
        toast.success(response.data?.message || "Skill added.");
        return response.data?.data ?? response.data;
    } catch (error) {
        console.error("Error adding calibration skill:", error);
        toast.error(getErrorMessage(error, "Failed to add the skill."));
        throw error;
    }
};

// DELETE /job-descriptions/{jd_id}/calibration/skills/{jd_skill_id} (HR_ADMIN) -
// remove a skill from this JD (e.g. one the extraction invented). Saves a calibration version.
export const removeJDCalibrationSkill = async (jdId, jdSkillId) => {
    try {
        const response = await api.delete(`${BASE_URL}/job-descriptions/${jdId}/calibration/skills/${jdSkillId}`, { headers: authHeader() });
        toast.success(response.data?.message || "Skill removed.");
        return response.data?.data ?? response.data;
    } catch (error) {
        console.error("Error removing calibration skill:", error);
        toast.error(getErrorMessage(error, "Failed to remove the skill."));
        throw error;
    }
};
