import api from "../../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;
const UMS_BASE_URL = window.__APP_CONFIG__.USER_MANAGEMENT_URL;

// Turns any backend error into a toast-ready string. FastAPI 422 validation
// errors arrive as detail: [{loc, msg, type}, ...] — rendering that object
// directly shows "[object Object]", so flatten it to "field: message".
export const formatApiError = (error, fallback = "Something went wrong.") => {
    const data = error?.response?.data;
    if (typeof data?.message === "string" && data.message) return data.message;
    const detail = data?.detail;
    if (typeof detail === "string" && detail) return detail;
    if (Array.isArray(detail) && detail.length) {
        return detail
            .slice(0, 3)
            .map((d) => {
                const field = Array.isArray(d?.loc) ? d.loc[d.loc.length - 1] : null;
                const msg = d?.msg || "Invalid value";
                return field && field !== "body" ? `${field}: ${msg}` : msg;
            })
            .join(" · ");
    }
    return fallback;
};

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

export const getAllCampaignsHrAdmin = async ({ show_closed = false, search, status, page = 1 } = {}) => {
    try {
        const params = { show_closed, page };
        if (search) params.search = search;
        if (status) params.status = status;
        const response = await api.get(`${BASE_URL}/campaigns/hr_admin`, {
            params,
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

export const getAllCampaigns = async (filters = {}) => {
    try {
        const params = {};
        if (filters.jd_id) params.jd_id = filters.jd_id;
        if (filters.status) params.status = filters.status;
        if (filters.search) params.search = filters.search;
        if (filters.show_closed != null) params.show_closed = filters.show_closed;
        const response = await api.get(`${BASE_URL}/campaigns/all`,{
            params,
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

export const getCampaignsByHiringManager = async ({ show_closed = false } = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/hiring_manager`, {
            params: { show_closed },
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


export const getCampaignCandidates = async (campaignId) => {
    try {
        const response = await api.get(`${BASE_URL}/campaign-candidates/campaign/${campaignId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        // TEMP DEBUG - remove once candidates render correctly
        console.log("[getCampaignCandidates] response:", response);
        console.log("[getCampaignCandidates] response.data:", response.data);
        console.log("[getCampaignCandidates] response.data.items:", response.data?.items);
        return response.data;
    } catch (error) {
        console.error("Error fetching campaign candidates:", error);
        throw error;
    }
};

// Pipeline Board — GET /campaign-candidates/campaign/{campaign_id}/board
export const getCampaignBoard = async (campaignId) => {
    try {
        const response = await api.get(`${BASE_URL}/campaign-candidates/campaign/${campaignId}/board`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching campaign board:", error);
        throw error;
    }
};

// Pipeline Board drag-and-drop — POST /campaign-candidates/{campaign_candidate_id}/stage.
// Resume selection/transition validation stays entirely server-side
// (PipelineTransitionService) — this only ever sends the target stage.
export const moveCampaignCandidateStage = async (campaignCandidateId, toStage, reason) => {
    try {
        const response = await api.post(
            `${BASE_URL}/campaign-candidates/${campaignCandidateId}/stage`,
            { to_stage: toStage, reason: reason || undefined },
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        return response.data;
    } catch (error) {
        console.error("Error moving campaign candidate stage:", error);
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

export const getPauseSummary = async (campaignId) => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/${campaignId}/pause-summary`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching pause summary:", error);
        throw error;
    }
};

export const getResumeSummary = async (campaignId) => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/${campaignId}/resume-summary`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching resume summary:", error);
        throw error;
    }
};

// ── Close a Campaign Manually ──────────────────────────────────

export const getClosureSummary = async (campaignId) => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/${campaignId}/closure-summary`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching closure summary:", error);
        throw error;
    }
};

export const closeCampaign = async (campaignId, closureReason) => {
    try {
        const response = await api.post(`${BASE_URL}/campaigns/${campaignId}/close`,
            { closure_reason: closureReason },
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        return response.data;
    } catch (error) {
        console.error("Error closing campaign:", error);
        throw error;
    }
};

// ── Reopen a Closed Campaign ───────────────────────────────────

export const getReopenReadiness = async (campaignId) => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/${campaignId}/reopen-readiness`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching reopen readiness:", error);
        throw error;
    }
};

export const reopenCampaign = async (campaignId) => {
    try {
        const response = await api.post(`${BASE_URL}/campaigns/${campaignId}/reopen`, {}, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error reopening campaign:", error);
        throw error;
    }
};

// ── Scoring Weight Presets ─────────────────────────────────────

export const getWeightPresets = async () => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/scoring-presets`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching weight presets:", error);
        throw error;
    }
};

export const createWeightPreset = async (payload) => {
    try {
        const response = await api.post(`${BASE_URL}/campaigns/scoring-presets`, payload, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error creating weight preset:", error);
        throw error;
    }
};

export const updateWeightPreset = async (presetId, payload) => {
    try {
        const response = await api.put(`${BASE_URL}/campaigns/scoring-presets/${presetId}`, payload, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error updating weight preset:", error);
        throw error;
    }
};

export const deleteWeightPreset = async (presetId) => {
    try {
        const response = await api.delete(`${BASE_URL}/campaigns/scoring-presets/${presetId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error deleting weight preset:", error);
        throw error;
    }
};

// ── Scoring configuration ──────────────────────────────

export const resetScoringConfig = async (campaignId) => {
    try {
        const response = await api.post(`${BASE_URL}/campaigns/${campaignId}/scoring-config/reset`, {}, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error resetting scoring configuration:", error);
        throw error;
    }
};

// ── Platform default weights + weight change report ───────────

export const updatePlatformDefaultWeights = async (payload) => {
    try {
        const response = await api.put(`${BASE_URL}/campaigns/platform-defaults/scoring`, payload, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error updating platform default weights:", error);
        throw error;
    }
};

// Org-wide default weights/thresholds from platform_config; returns null on
// failure so the settings form falls back to its static defaults.
export const getPlatformScoringDefaults = async () => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/platform-defaults/scoring`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data?.data || null;
    } catch (error) {
        console.error("Error fetching platform scoring defaults:", error);
        return null;
    }
};

// ── Processing status + dead letter queue ──────────────────────

export const getProcessingStatus = async (campaignId) => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/${campaignId}/processing-status`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching processing status:", error);
        throw error;
    }
};

export const getDeadLetterQueue = async (campaignId) => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/${campaignId}/dead-letter-queue`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching dead letter queue:", error);
        throw error;
    }
};

// ── Processing queue breakdown + DLQ replay ────────────────────

export const getProcessingQueue = async (campaignId) => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/${campaignId}/processing-queue`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching processing queue:", error);
        throw error;
    }
};

export const replayDeadLetterTasks = async (campaignId, dlqIds) => {
    try {
        const response = await api.post(`${BASE_URL}/campaigns/${campaignId}/dead-letter-queue/replay`,
            { dlq_ids: dlqIds },
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        return response.data;
    } catch (error) {
        console.error("Error replaying dead letter tasks:", error);
        throw error;
    }
};

// ── Stalled candidates ─────────────────────────────────────────

export const getStalledCandidates = async (campaignId) => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/${campaignId}/stalled-candidates`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching stalled candidates:", error);
        throw error;
    }
};

export const reprocessStalledCandidate = async (campaignId, campaignCandidateId) => {
    try {
        const response = await api.post(`${BASE_URL}/campaigns/${campaignId}/stalled-candidates/${campaignCandidateId}/reprocess`,
            {},
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        return response.data;
    } catch (error) {
        console.error("Error reprocessing stalled candidate:", error);
        throw error;
    }
};

export const escalateStalledCandidate = async (campaignId, campaignCandidateId, note) => {
    try {
        const response = await api.post(`${BASE_URL}/campaigns/${campaignId}/stalled-candidates/${campaignCandidateId}/escalate`,
            { note: note || null },
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        return response.data;
    } catch (error) {
        console.error("Error escalating stalled candidate:", error);
        throw error;
    }
};

export const overrideCandidateStage = async (campaignId, campaignCandidateId, reason, targetStage) => {
    try {
        const response = await api.post(`${BASE_URL}/campaigns/${campaignId}/stalled-candidates/${campaignCandidateId}/override-stage`,
            { reason, target_stage: targetStage || null },
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        return response.data;
    } catch (error) {
        console.error("Error overriding candidate stage:", error);
        throw error;
    }
};

export const flagCandidateForReview = async (campaignId, campaignCandidateId, reason) => {
    try {
        const response = await api.post(`${BASE_URL}/campaigns/${campaignId}/stalled-candidates/${campaignCandidateId}/flag-review`,
            { reason },
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        return response.data;
    } catch (error) {
        console.error("Error flagging candidate for review:", error);
        throw error;
    }
};

// ── Bulk uploads for one campaign (campaign detail section) ─

export const getBulkUploadsForCampaign = async (campaignId, { page = 1, size = 10 } = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/bulk-uploads`, {
            params: { campaign_id: campaignId, page, size },
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching bulk uploads for campaign:", error);
        throw error;
    }
};

// ── /Rejection analytics + summary export ──────────────────

export const getRejectionAnalytics = async (campaignId) => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/${campaignId}/rejection-analytics`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching rejection analytics:", error);
        throw error;
    }
};

// HR override report. campaign_alerts carries the per-campaign
// override_rate and the server-computed override_alert flag that the dashboard
// warning (T03) renders. HR_ADMIN only.
export const getOverrideReport = async ({ campaignId, dateFrom, dateTo } = {}) => {
    const params = {};
    if (campaignId) params.campaign_id = campaignId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    const response = await api.get(`${BASE_URL}/campaign-candidates/override-report`, {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    return response.data?.data || null;
};


