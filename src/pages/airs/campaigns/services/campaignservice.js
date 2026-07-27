import api from "../../../../api/axiosInstance";

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

export const getActiveCampaigns = async () => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/active`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching active campaigns:", error);
        throw error;
    }
};

// ── E03-S01/S02 — Pause / Resume ─────────────────────────────────────────
// No dedicated pause/resume endpoints exist — the transition happens through
// the same PATCH used for editing, with status: "PAUSED" | "ACTIVE".

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

export const pauseCampaign = async (campaignId) => updateCampaign(campaignId, { status: "PAUSED" });

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

export const resumeCampaign = async (campaignId) => updateCampaign(campaignId, { status: "ACTIVE" });

// ── E03-S03 — Close a Campaign Manually ──────────────────────────────────

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
        const response = await api.post(
            `${BASE_URL}/campaigns/${campaignId}/close`,
            { closure_reason: closureReason },
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        return response.data;
    } catch (error) {
        console.error("Error closing campaign:", error);
        throw error;
    }
};

// ── E03-S04 — Reopen a Closed Campaign ───────────────────────────────────

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

// ── E03-S06 — Duplicate a Campaign Configuration ─────────────────────────

export const duplicateCampaign = async (campaignId, payload) => {
    try {
        const response = await api.post(`${BASE_URL}/campaigns/${campaignId}/duplicate`, payload, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error duplicating campaign:", error);
        throw error;
    }
};

// ── E02-S03 — Scoring Weight Presets ─────────────────────────────────────

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

// ── E02-S04 — Compare Weight Configurations Across Campaigns ────────────

export const compareCampaigns = async (campaignIds) => {
    try {
        const params = new URLSearchParams();
        campaignIds.forEach((id) => params.append("campaign_ids", id));
        const response = await api.get(`${BASE_URL}/campaigns/compare?${params.toString()}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error comparing campaigns:", error);
        throw error;
    }
};

export const copyScoringConfig = async (sourceCampaignId, targetCampaignIds) => {
    try {
        const response = await api.post(
            `${BASE_URL}/campaigns/${sourceCampaignId}/scoring-config/copy`,
            { target_campaign_ids: targetCampaignIds },
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        return response.data;
    } catch (error) {
        console.error("Error copying scoring configuration:", error);
        throw error;
    }
};

// ── E02-S01/S02/S05 — Scoring configuration ──────────────────────────────

export const getScoringConfig = async (campaignId) => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/${campaignId}/scoring-config`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching scoring configuration:", error);
        throw error;
    }
};

export const getScoringHistory = async (campaignId) => {
    try {
        const response = await api.get(`${BASE_URL}/campaigns/${campaignId}/scoring-history`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching scoring history:", error);
        throw error;
    }
};

export const updateScoringConfig = async (campaignId, payload) => {
    try {
        const response = await api.put(`${BASE_URL}/campaigns/${campaignId}/scoring-config`, payload, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error updating scoring configuration:", error);
        throw error;
    }
};

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

// ── E02-S05 — Platform default weights + weight change report ───────────

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

// No standalone "get current platform defaults" endpoint exists on the
// backend — the only place default weights are ever returned is embedded as
// `.defaults` on a campaign's own GET /{id}/scoring-config response. This
// reads them off the first accessible active campaign as a best-effort seed
// for the platform-defaults form; returns null (blank form) if there isn't
// one, e.g. a brand-new org with no campaigns yet.
export const getPlatformScoringDefaults = async () => {
    try {
        const activeRes = await getActiveCampaigns();
        const activeCampaigns = Array.isArray(activeRes) ? activeRes : (activeRes?.data || []);
        if (!activeCampaigns.length) return null;
        const config = await getScoringConfig(activeCampaigns[0].id);
        const data = config?.data || config;
        return data?.defaults || null;
    } catch (error) {
        console.error("Error fetching platform scoring defaults:", error);
        return null;
    }
};

export const getWeightChangeReport = async ({ date_from, date_to, campaign_status } = {}) => {
    try {
        const params = {};
        if (date_from) params.date_from = date_from;
        if (date_to) params.date_to = date_to;
        if (campaign_status) params.campaign_status = campaign_status;
        const response = await api.get(`${BASE_URL}/campaigns/reports/weight-changes`, {
            params,
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching weight change report:", error);
        throw error;
    }
};

export const exportWeightChangeReport = async ({ date_from, date_to, campaign_status } = {}) => {
    try {
        const params = {};
        if (date_from) params.date_from = date_from;
        if (date_to) params.date_to = date_to;
        if (campaign_status) params.campaign_status = campaign_status;
        const response = await api.get(`${BASE_URL}/campaigns/reports/weight-changes/export`, {
            params,
            responseType: "blob",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error exporting weight change report:", error);
        throw error;
    }
};

// ── E04-S01 — Processing status + dead letter queue ──────────────────────

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