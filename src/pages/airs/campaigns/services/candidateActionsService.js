import api from "../../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;
const ROOT = `${BASE_URL}/candidate-actions`;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// ── stage moves ──────────────────────────────────────────

// One candidate. Reason is mandatory server-side (min 10 chars).
export const moveCandidateStage = async (campaignId, campaignCandidateId, targetStage, reason) => {
  const response = await api.post(
    `${ROOT}/campaigns/${campaignId}/candidates/${campaignCandidateId}/stage-move`,
    { target_stage: targetStage, reason },
    { headers: authHeaders() },
  );
  return response.data?.data || null;
};

// Reject one candidate straight from the list.
export const rejectCandidate = async (campaignId, campaignCandidateId, reason) => {
  const response = await api.post(
    `${ROOT}/campaigns/${campaignId}/candidates/${campaignCandidateId}/reject`,
    { reason },
    { headers: authHeaders() },
  );
  return response.data?.data || null;
};

// Batch. All selected candidates must currently share one stage; the
// server rejects mixed selections rather than partially applying them.
export const bulkMoveStage = async (campaignId, campaignCandidateIds, targetStage, reason) => {
  const response = await api.post(
    `${ROOT}/campaigns/${campaignId}/bulk-stage-move`,
    { campaign_candidate_ids: campaignCandidateIds, target_stage: targetStage, reason },
    { headers: authHeaders() },
  );
  return response.data?.data || null;
};

// ── clear override ───────────────────────────────────

export const clearOverride = async (campaignCandidateId, reason) => {
  const response = await api.post(
    `${ROOT}/candidates/${campaignCandidateId}/clear-override`,
    { reason },
    { headers: authHeaders() },
  );
  return response.data?.data || null;
};

// ── recruiter notes ──────────────────────────────────────

export const getCandidateNotes = async (campaignCandidateId) => {
  const response = await api.get(
    `${ROOT}/candidates/${campaignCandidateId}/notes`,
    { headers: authHeaders() },
  );
  return response.data?.data || [];
};

export const addCandidateNote = async (campaignCandidateId, noteText) => {
  const response = await api.post(
    `${ROOT}/candidates/${campaignCandidateId}/notes`,
    { note_text: noteText },
    { headers: authHeaders() },
  );
  return response.data?.data || null;
};

export const updateCandidateNote = async (noteId, noteText) => {
  const response = await api.patch(
    `${ROOT}/notes/${noteId}`,
    { note_text: noteText },
    { headers: authHeaders() },
  );
  return response.data?.data || null;
};

export const deleteCandidateNote = async (noteId) => {
  const response = await api.delete(`${ROOT}/notes/${noteId}`, { headers: authHeaders() });
  return response.data;
};

// One request for a whole page of rows rather than one per badge.
// Returns {} on failure: a missing badge must never break the list.
export const getNoteCounts = async (campaignCandidateIds) => {
  if (!campaignCandidateIds || campaignCandidateIds.length === 0) return {};
  try {
    const response = await api.post(
      `${ROOT}/note-counts`,
      { campaign_candidate_ids: campaignCandidateIds },
      { headers: authHeaders() },
    );
    return response.data?.data?.counts || {};
  } catch {
    return {};
  }
};

// ── override / rejection history ─────────────────────

// Each entry carries hr_override, so the same list shows both the rejection
// and whether it was overridden — no second endpoint needed for the history.
export const getRejectionHistory = async (campaignCandidateId) => {
  const response = await api.get(
    `${BASE_URL}/campaign-candidates/${campaignCandidateId}/rejection-history`,
    { headers: authHeaders() },
  );
  return response.data?.data || [];
};

// ── apply HR override (M07 endpoint) ─────────────

// Lives under /campaign-candidates, not /candidate-actions — this endpoint
// predates M11 and is owned by M07; M11 only calls it.
export const applyHrOverride = async (campaignCandidateId, overrideReason) => {
  const response = await api.post(
    `${BASE_URL}/campaign-candidates/${campaignCandidateId}/override`,
    { override_reason: overrideReason },
    { headers: authHeaders() },
  );
  return response.data?.data || null;
};
