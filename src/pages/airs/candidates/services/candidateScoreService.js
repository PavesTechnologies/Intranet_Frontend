import api from "../../../../api/axiosInstance";
import { logError } from "@/pages/airs/utils/logError";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

// Candidate Scorecard — Deterministic tab —
// GET /airs/campaign-candidates/{campaign_candidate_id}/deterministic
export const getDeterministicScoreBreakdown = async (campaignCandidateId) => {
  try {
    const response = await api.get(`${BASE_URL}/campaign-candidates/${campaignCandidateId}/deterministic`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (error) {
    logError("Error fetching deterministic score breakdown:", error);
    throw error;
  }
};

// Candidate Scorecard — Semantic tab —
// GET /airs/campaign-candidates/{campaign_candidate_id}/semantic
export const getSemanticScoreBreakdown = async (campaignCandidateId) => {
  try {
    const response = await api.get(`${BASE_URL}/campaign-candidates/${campaignCandidateId}/semantic`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (error) {
    logError("Error fetching semantic score breakdown:", error);
    throw error;
  }
};

// Candidate Scorecard — AI Evaluation tab —
// GET /airs/campaign-candidates/{campaign_candidate_id}/ai-evaluation
export const getAiEvaluationBreakdown = async (campaignCandidateId) => {
  try {
    const response = await api.get(`${BASE_URL}/campaign-candidates/${campaignCandidateId}/ai-evaluation`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (error) {
    logError("Error fetching AI evaluation breakdown:", error);
    throw error;
  }
};

// Candidate Scorecard — Final Status tab —
// GET /airs/campaign-candidates/{campaign_candidate_id}/composite
export const getCompositeScoreBreakdown = async (campaignCandidateId) => {
  try {
    const response = await api.get(`${BASE_URL}/campaign-candidates/${campaignCandidateId}/composite`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (error) {
    logError("Error fetching composite score breakdown:", error);
    throw error;
  }
};

// Candidate Scorecard — Final Status tab —
// POST /airs/campaign-candidates/{campaign_candidate_id}/send-rejection-email
// Email plan phase 3: prepares the rejection email as a draft and returns its draft_id (calling again
// reopens the same draft); it is sent only from the preview (emailDraftService). Only for REJECTED, and
// never once a rejection or selection email was sent (backend-enforced).
export const sendRejectionEmail = async (campaignCandidateId) => {
  try {
    const response = await api.post(
      `${BASE_URL}/campaign-candidates/${campaignCandidateId}/send-rejection-email`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    logError("Error preparing the rejection email:", error);
    throw error;
  }
};

// Candidate Scorecard — Final Status tab —
// POST /airs/campaign-candidates/{campaign_candidate_id}/send-selection-email
// Email plan phase 3: prepares the selection email as a draft (draft_id), like the rejection email above.
// Only for SELECTED, never twice, never after a rejection email (backend-enforced).
export const sendSelectionEmail = async (campaignCandidateId) => {
  try {
    const response = await api.post(
      `${BASE_URL}/campaign-candidates/${campaignCandidateId}/send-selection-email`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    logError("Error preparing the selection email:", error);
    throw error;
  }
};

// Campaign page - bulk rejection email (email plan phase 3): check first, preview one, then send exactly
// the list the check confirmed.
const bulkAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

// POST /airs/campaign-candidates/bulk-rejection-email/check - who will and won't receive it, with reasons
// ({will_receive, wont_receive, repeated, check_hash}); nothing is queued.
export const checkBulkRejectionEmail = async (campaignCandidateIds) => {
  const response = await api.post(`${BASE_URL}/campaign-candidates/bulk-rejection-email/check`,
    { campaign_candidate_ids: campaignCandidateIds }, bulkAuth());
  return response.data?.data;
};

// POST /airs/campaign-candidates/bulk-rejection-email/preview - one candidate's email as it will be sent.
export const previewBulkRejectionEmail = async (campaignCandidateId) => {
  const response = await api.post(`${BASE_URL}/campaign-candidates/bulk-rejection-email/preview`,
    { campaign_candidate_id: campaignCandidateId }, bulkAuth());
  return response.data?.data;
};

// POST /airs/campaign-candidates/bulk-send-rejection-email - needs the check's check_hash; refused (409,
// code CHECK_CHANGED) when who will receive it changed since the check. Returns {queued, failed, repeated}.
export const bulkSendRejectionEmail = async (campaignCandidateIds, checkHash) => {
  try {
    const response = await api.post(`${BASE_URL}/campaign-candidates/bulk-send-rejection-email`,
      { campaign_candidate_ids: campaignCandidateIds, check_hash: checkHash }, bulkAuth());
    return response.data;
  } catch (error) {
    logError("Error bulk-sending rejection emails:", error);
    throw error;
  }
};

// Candidate Scorecard — Re-parse & re-score (RECRUITER / HR_ADMIN) —
// POST /airs/campaign-candidates/{campaign_candidate_id}/reparse
// Re-parses the stored resume and replaces its current skills (the previous
// parse is kept). A rejected candidate moves back to Screening only when a
// recruiter does this, with a reason.
export const reparseCandidateResume = async (campaignCandidateId, reason) => {
  const response = await api.post(
    `${BASE_URL}/campaign-candidates/${campaignCandidateId}/reparse`,
    { reason: reason || null },
    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
  );
  return response.data;
};

// Candidate Scorecard — what each re-parse changed —
// GET /airs/campaign-candidates/{campaign_candidate_id}/parse-changes
export const getParseChanges = async (campaignCandidateId) => {
  const response = await api.get(`${BASE_URL}/campaign-candidates/${campaignCandidateId}/parse-changes`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return response.data;
};

// Candidate Scorecard — re-score a candidate whose score is out of date (RECRUITER) —
// POST /airs/campaign-candidates/{campaign_candidate_id}/rescore
// At Screening: the normal screening re-score; at any other stage only the
// scores are recomputed - the stage never changes.
export const rescoreCandidate = async (campaignCandidateId) => {
  const response = await api.post(`${BASE_URL}/campaign-candidates/${campaignCandidateId}/rescore`, {}, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return response.data;
};
