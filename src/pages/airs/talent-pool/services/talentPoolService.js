import api from "../../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

// Real, dedicated Talent Pool endpoints (GET /talent-pool/candidates,
// GET /talent-pool/candidates/{candidate_id}) — distinct from the general
// /resumes endpoints in resumeIntake.js. Search already returns everything
// the list card needs (summary/skills/best_composite_score) in one batched
// response; the profile endpoint returns the unified cross-campaign view.

// Array params (locations/designations/degree_levels/education_fields/
// campaign_ids/pipeline_stages) must reach the backend as repeated bare query
// params: ?locations=Chennai&locations=Hyderabad — matching FastAPI's
// `list[str] = Query(...)`, which only recognizes the exact bare key once per
// value.
//
// Axios's DEFAULT array serialization does not produce that: with no
// paramsSerializer, an array param is sent as `locations[]=Chennai&...`
// (see node_modules/axios/lib/helpers/toFormData.js — options.indexes
// defaults to `false`, which appends the `[]` suffix). FastAPI never sees a
// `locations[]` key as `locations`, so the filter would silently never reach
// the backend. `paramsSerializer: { indexes: null }` is axios v1's documented
// switch for the bare-repeated-key form (same file's `indexes === null`
// branch).
//
// `search` covers both candidate name and skills as one free-text term
// (e.g. "Python AWS") — this is the Normal Search mode's only text filter;
// there is no separate name/skills param.
export const searchTalentPoolCandidates = async ({
    search,
    locations,
    designations,
    degreeLevels,
    educationFields,
    campaignIds,
    pipelineStages,
    experienceMin,
    experienceMax,
    scoreMin,
    scoreMax,
    page = 1,
    size = 20,
} = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/talent-pool/candidates`, {
            params: {
                search: search || undefined,
                locations: locations && locations.length > 0 ? locations : undefined,
                designations: designations && designations.length > 0 ? designations : undefined,
                degree_levels: degreeLevels && degreeLevels.length > 0 ? degreeLevels : undefined,
                education_fields: educationFields && educationFields.length > 0 ? educationFields : undefined,
                campaign_ids: campaignIds && campaignIds.length > 0 ? campaignIds : undefined,
                pipeline_stages: pipelineStages && pipelineStages.length > 0 ? pipelineStages : undefined,
                experience_min: experienceMin != null && experienceMin !== "" ? experienceMin : undefined,
                experience_max: experienceMax != null && experienceMax !== "" ? experienceMax : undefined,
                score_min: scoreMin != null && scoreMin !== "" ? scoreMin : undefined,
                score_max: scoreMax != null && scoreMax !== "" ? scoreMax : undefined,
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

// M14 Semantic Talent Pool Search — POST /talent-pool/semantic-search.
//
// Unlike Normal search, filters here restrict the candidate pool FIRST,
// then the query text (free-form recruiter requirement, resume text, or JD
// text — no dedicated field per type, it's all just `query`) is matched via
// embedding/vector similarity. `filters` is entirely omitted from the body
// when no panel filter is active — not sent as an object of undefineds —
// since the spec's "query only" example has no `filters` key at all.
export const semanticSearchTalentPoolCandidates = async ({
    query,
    locations,
    designations,
    degreeLevels,
    educationFields,
    campaignIds,
    pipelineStages,
    experienceMin,
    experienceMax,
    scoreMin,
    scoreMax,
    page = 1,
    size = 6,
} = {}) => {
    const hasFilters =
        (locations && locations.length > 0) ||
        (designations && designations.length > 0) ||
        (degreeLevels && degreeLevels.length > 0) ||
        (educationFields && educationFields.length > 0) ||
        (campaignIds && campaignIds.length > 0) ||
        (pipelineStages && pipelineStages.length > 0) ||
        (experienceMin != null && experienceMin !== "") ||
        (experienceMax != null && experienceMax !== "") ||
        (scoreMin != null && scoreMin !== "") ||
        (scoreMax != null && scoreMax !== "");

    try {
        const response = await api.post(
            `${BASE_URL}/talent-pool/semantic-search`,
            {
                query,
                filters: hasFilters
                    ? {
                        locations: locations && locations.length > 0 ? locations : undefined,
                        designations: designations && designations.length > 0 ? designations : undefined,
                        degree_levels: degreeLevels && degreeLevels.length > 0 ? degreeLevels : undefined,
                        education_fields: educationFields && educationFields.length > 0 ? educationFields : undefined,
                        campaign_ids: campaignIds && campaignIds.length > 0 ? campaignIds : undefined,
                        pipeline_stages: pipelineStages && pipelineStages.length > 0 ? pipelineStages : undefined,
                        experience_min: experienceMin != null && experienceMin !== "" ? experienceMin : undefined,
                        experience_max: experienceMax != null && experienceMax !== "" ? experienceMax : undefined,
                        score_min: scoreMin != null && scoreMin !== "" ? scoreMin : undefined,
                        score_max: scoreMax != null && scoreMax !== "" ? scoreMax : undefined,
                    }
                    : undefined,
                page,
                size,
            },
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
        );
        return response.data;
    } catch (error) {
        console.error("Error running talent pool semantic search:", error);
        throw error;
    }
};

// M13 filter metadata — populates every categorical filter's option list in
// TalentPoolFilterPanel. No hardcoded fallback: if this fails, the panel
// shows the project's standard error state and the page stays usable with
// whichever filters were already applied.
export const getTalentPoolFilters = async () => {
    try {
        const response = await api.get(`${BASE_URL}/talentpoolfilters`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching talent pool filter options:", error);
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
