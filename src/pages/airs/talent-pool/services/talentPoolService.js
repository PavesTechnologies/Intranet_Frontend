import api from "../../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

// Real, dedicated Talent Pool endpoints (GET /talent-pool/candidates,
// GET /talent-pool/candidates/{candidate_id}) — distinct from the general
// /resumes endpoints in resumeIntake.js. Search already returns everything
// the list card needs (summary/skills/best_composite_score) in one batched
// response; the profile endpoint returns the unified cross-campaign view.

// `skills` (array) must reach the backend as repeated bare query params:
// ?skills=Java&skills=AWS&skills=Python — matching FastAPI's
// `skills: list[str] = Query(...)`, which only recognizes the exact key
// `skills` (not `skills[]`) once per value.
//
// Axios's DEFAULT array serialization does not produce that: with no
// paramsSerializer, an array param is sent as `skills[]=Java&skills[]=AWS`
// (see node_modules/axios/lib/helpers/toFormData.js — options.indexes
// defaults to `false`, which appends the `[]` suffix). FastAPI never sees a
// `skills[]` key as `skills`, so the filter silently never reached the
// backend. `paramsSerializer: { indexes: null }` is axios v1's documented
// switch for the bare-repeated-key form (same file's `indexes === null`
// branch) — this is the one-line fix; campaign_id/designation/page/size are
// untouched.
export const searchTalentPoolCandidates = async ({
    skills,
    designation,
    locations,
    experienceMin,
    experienceMax,
    campaignId,
    page = 1,
    size = 20,
} = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/talent-pool/candidates`, {
            params: {
                skills: skills && skills.length > 0 ? skills : undefined,
                designation: designation || undefined,
                locations: locations && locations.length > 0 ? locations : undefined,
                experience_min: experienceMin != null && experienceMin !== "" ? experienceMin : undefined,
                experience_max: experienceMax != null && experienceMax !== "" ? experienceMax : undefined,
                campaign_id: campaignId || undefined,
                page,
                size,
            },
            paramsSerializer: { indexes: null },
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        return response.data;
    } catch (error) {
        console.error("Error searching talent pool candidates:", error);
        throw error;
    }
};

export const getTalentPoolCandidateProfile = async (candidateId) => {
    try {
        const response = await api.get(`${BASE_URL}/talent-pool/candidates/${candidateId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching talent pool candidate profile:", error);
        throw error;
    }
};

// Single add-to-campaign — the frontend only ever supplies WHICH campaign;
// ResumeSelectionService (backend) picks the resume, never this code.
export const addTalentPoolCandidateToCampaign = async (candidateId, campaignId) => {
    try {
        const response = await api.post(
            `${BASE_URL}/talent-pool/candidates/${candidateId}/campaigns/${campaignId}`,
            null,
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
        );
        return response.data;
    } catch (error) {
        console.error("Error adding talent pool candidate to campaign:", error);
        throw error;
    }
};

// Bulk add-to-campaign — same resume-selection guarantee as the single call,
// applied independently per candidate server-side.
export const bulkAddTalentPoolCandidatesToCampaign = async (campaignId, candidateIds) => {
    try {
        const response = await api.post(
            `${BASE_URL}/talent-pool/candidates/bulk-add-to-campaign`,
            { campaign_id: campaignId, candidate_ids: candidateIds },
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
        );
        return response.data;
    } catch (error) {
        console.error("Error bulk-adding talent pool candidates to campaign:", error);
        throw error;
    }
};
